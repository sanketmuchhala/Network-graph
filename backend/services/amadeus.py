"""
Amadeus Self-Service API client.
OAuth 2.0 client credentials — token is cached and auto-refreshed.
Falls back to realistic mock data when no credentials are configured.
"""
import os
import time
import httpx
from dotenv import load_dotenv

load_dotenv()

AMADEUS_BASE = "https://test.api.amadeus.com"
_token_cache: dict = {"access_token": None, "expires_at": 0.0}


def _is_configured() -> bool:
    return bool(os.getenv("AMADEUS_CLIENT_ID") and os.getenv("AMADEUS_CLIENT_SECRET"))


async def _get_token() -> str:
    now = time.time()
    if _token_cache["access_token"] and _token_cache["expires_at"] - now > 60:
        return _token_cache["access_token"]

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{AMADEUS_BASE}/v1/security/oauth2/token",
            data={
                "grant_type":    "client_credentials",
                "client_id":     os.getenv("AMADEUS_CLIENT_ID"),
                "client_secret": os.getenv("AMADEUS_CLIENT_SECRET"),
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=10,
        )
        resp.raise_for_status()
        body = resp.json()

    _token_cache["access_token"] = body["access_token"]
    _token_cache["expires_at"] = now + body.get("expires_in", 1799)
    return _token_cache["access_token"]


def _parse_offers(raw: list[dict]) -> list[dict]:
    results = []
    for offer in raw:
        try:
            price = float(offer["price"]["grandTotal"])
            airline = offer.get("validatingAirlineCodes", [None])[0]
            layovers: list[str] = []
            segments = offer["itineraries"][0]["segments"]
            for seg in segments[:-1]:          # every stop except the final arrival
                layovers.append(seg["arrival"]["iataCode"])
            final_dest = segments[-1]["arrival"]["iataCode"]
            results.append({
                "price":      price,
                "airline":    airline,
                "layovers":   layovers,
                "final_dest": final_dest,
                "segments":   [
                    {
                        "dep": s["departure"]["iataCode"],
                        "arr": s["arrival"]["iataCode"],
                    }
                    for s in segments
                ],
            })
        except (KeyError, IndexError, ValueError):
            continue
    return results


async def search_flights(
    origin: str,
    destination: str,
    date: str,
    max_results: int = 5,
) -> list[dict]:
    """Return list of parsed flight offers. Falls back to mock data if unconfigured."""
    if not _is_configured():
        return _mock_flights(origin, destination, date, max_results)

    token = await _get_token()
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{AMADEUS_BASE}/v2/shopping/flight-offers",
            headers={"Authorization": f"Bearer {token}"},
            params={
                "originLocationCode":      origin,
                "destinationLocationCode": destination,
                "departureDate":           date,
                "adults":                  1,
                "currencyCode":            "USD",
                "max":                     max_results,
            },
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json().get("data", [])

    return _parse_offers(data)


# ── Deterministic mock data ───────────────────────────────────────────────────

import hashlib

def _mock_price(origin: str, destination: str, seed_extra: str = "") -> float:
    """Consistent fake price based on route hash — avoids random drift."""
    key = f"{origin}{destination}{seed_extra}"
    h = int(hashlib.md5(key.encode()).hexdigest(), 16)
    return round(80 + (h % 470) + (h % 13) * 0.5, 2)


def _mock_flights(origin: str, destination: str, date: str, max_results: int) -> list[dict]:
    """
    Realistic mock offers for UI development without a live API key.

    Key pricing behaviour: through-hub routes to farther destinations are often
    priced *below* the direct-to-hub fare — this is the hidden city anomaly.
    We replicate that here so the algorithm finds deals in mock mode.
    """
    import json, pathlib
    hub_map_path = pathlib.Path(__file__).parent.parent / "data" / "hub_map.json"
    hub_map = json.loads(hub_map_path.read_text())

    hub_airlines = [
        code for code, info in hub_map.items()
        if destination in info["hubs"]
    ]

    # Base direct price for this route
    direct_price = _mock_price(origin, destination)

    offers = []

    # 1 — direct / nonstop offer
    offers.append({
        "price":      direct_price,
        "airline":    hub_airlines[0] if hub_airlines else "AA",
        "layovers":   [],
        "final_dest": destination,
        "segments":   [{"dep": origin, "arr": destination}],
    })

    # 2 — one-stop offers via the airline's primary hub
    for i, airline in enumerate(hub_airlines[:2]):
        mid = hub_map[airline]["hubs"][0]
        # Via-hub fares are typically 15-40 % cheaper than the destination direct fare
        # (this is the real anomaly airlines create with bulk seat pricing)
        discount_key = f"{origin}|{destination}|{mid}"
        h = int(hashlib.md5(discount_key.encode()).hexdigest(), 16)
        discount = 0.55 + (h % 30) / 100   # 55 – 85 % of direct price
        offers.append({
            "price":      round(direct_price * discount, 2),
            "airline":    airline,
            "layovers":   [mid],
            "final_dest": destination,
            "segments":   [{"dep": origin, "arr": mid}, {"dep": mid, "arr": destination}],
        })

    return offers[:max_results]
