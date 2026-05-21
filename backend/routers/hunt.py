import asyncio
import json
import pathlib
from datetime import date as date_type, timedelta

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, field_validator

from services.hunt_engine import hunt as run_hunt, get_all_hubs
from services import cache

router = APIRouter(prefix="/hunt", tags=["hunt"])

_HUB_MAP = json.loads(
    (pathlib.Path(__file__).parent.parent / "data" / "hub_map.json").read_text()
)


# ── Input model for POST /hunt ────────────────────────────────────────────────

class HuntRequest(BaseModel):
    origin:      str
    destination: str
    date:        str

    @field_validator("origin", "destination")
    @classmethod
    def upper_iata(cls, v: str) -> str:
        v = v.strip().upper()
        if len(v) != 3:
            raise ValueError("Must be a 3-letter IATA code")
        return v

    @field_validator("date")
    @classmethod
    def validate_date(cls, v: str) -> str:
        try:
            d = date_type.fromisoformat(v)
        except ValueError:
            raise ValueError("Date must be YYYY-MM-DD")
        if d < date_type.today():
            raise ValueError("Date must be today or in the future")
        if d > date_type.today() + timedelta(days=330):
            raise ValueError("Date must be within 330 days")
        return v


# ── POST /hunt  (manual route-to-route hunt, no caching) ─────────────────────

@router.post("")
async def hunt_endpoint(req: HuntRequest):
    """Run a one-off hunt for a specific origin → destination pair."""
    if req.origin == req.destination:
        raise HTTPException(status_code=400, detail="Origin and destination must differ")
    try:
        result = await run_hunt(req.origin, req.destination, req.date)
        return result
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))


# ── GET /hunt/anomalies  (cache-first, all-hubs scan from one origin) ─────────

@router.get("/anomalies")
async def get_anomalies(
    origin: str = Query(..., min_length=3, max_length=3, description="IATA airport code"),
):
    """
    Return all hidden-city anomalies departing from `origin`.

    Cache behaviour:
    - HIT  → returns cached deals instantly (< 5 ms), source="cache"
    - MISS → runs concurrent hunts to every mapped hub airport,
             saves results, returns source="live"

    Cached results are valid for 24 hours.  The cache is purged of
    expired rows at server startup and on each live-search call.
    """
    origin = origin.strip().upper()
    today  = date_type.today().isoformat()

    # ── Cache hit ──────────────────────────────────────────────────────────────
    cached = cache.get_cached(origin, today)
    if cached is not None:
        real_deals = [r for r in cached if not r["route_id"].startswith("__sentinel__")]
        return {
            "source":      "cache",
            "origin":      origin,
            "date":        today,
            "total_deals": len(real_deals),
            "deals":       sorted(real_deals, key=lambda d: d["net_savings"], reverse=True),
        }

    # Already searched today but found nothing — avoid repeated live calls
    if cache.was_searched(origin, today):
        return {"source": "cache", "origin": origin, "date": today, "total_deals": 0, "deals": []}

    # ── Cache miss — live hunt ─────────────────────────────────────────────────
    cache.purge_expired()  # tidy up while we're here

    all_hubs = [h for h in get_all_hubs() if h != origin]

    async def _hunt_one(hub: str) -> list[dict]:
        try:
            result = await run_hunt(origin, hub, today)
            deals  = result.get("deals", [])
            if deals:
                cache.save_deals(origin, today, result["baseline_price"], deals)
            return deals
        except Exception:
            return []

    groups  = await asyncio.gather(*[_hunt_one(h) for h in all_hubs])
    all_deals = [deal for grp in groups for deal in grp]

    # Mark as searched (even if zero deals) so we don't re-scan within TTL
    if not all_deals:
        cache.mark_searched(origin, today)

    return {
        "source":      "live",
        "origin":      origin,
        "date":        today,
        "total_deals": len(all_deals),
        "deals":       sorted(all_deals, key=lambda d: d["savings"], reverse=True),
    }


# ── GET /hunt/hubs ────────────────────────────────────────────────────────────

@router.get("/hubs")
async def get_hubs():
    """Return full hub map for frontend reference."""
    return _HUB_MAP


# ── GET /hunt/cache/stats ─────────────────────────────────────────────────────

@router.get("/cache/stats")
async def cache_stats():
    """Diagnostic: current cache size and freshness."""
    return cache.stats()
