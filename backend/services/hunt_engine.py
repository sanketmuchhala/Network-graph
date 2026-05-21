"""
The Hidden City Hunt Algorithm — 4 steps.

Step A  Baseline : cheapest direct/connecting price for origin → destination
Step B  Hub check: which airlines treat destination as a hub?
Step C  Anomaly  : search origin → [city_beyond_hub] filtered for layovers at hub
Step D  Math     : savings = baseline - hidden_city_price  (return all > 0)
"""
import asyncio
import json
import pathlib
from typing import Any

from services.amadeus import search_flights

_HUB_MAP: dict[str, Any] = json.loads(
    (pathlib.Path(__file__).parent.parent / "data" / "hub_map.json").read_text()
)


def get_all_hubs() -> list[str]:
    """Return every unique hub airport code across all airlines in hub_map.json."""
    seen: set[str] = set()
    for info in _HUB_MAP.values():
        seen.update(info.get("hubs", []))
    return sorted(seen)


def _hub_airlines_for(destination: str) -> list[tuple[str, str]]:
    """Return [(airline_code, airline_name)] whose hub list includes destination."""
    return [
        (code, info["name"])
        for code, info in _HUB_MAP.items()
        if destination in info["hubs"]
    ]


def _beyond_cities(airline_code: str, hub: str) -> list[str]:
    """Cities reachable beyond `hub` on `airline_code`."""
    return _HUB_MAP.get(airline_code, {}).get("beyond", {}).get(hub, [])


async def hunt(origin: str, destination: str, date: str) -> dict[str, Any]:
    # ── Step A: baseline ─────────────────────────────────────────────────────
    baseline_offers = await search_flights(origin, destination, date, max_results=5)
    if not baseline_offers:
        return {"baseline_price": None, "deals": [], "error": "No baseline flights found"}

    baseline_price = min(o["price"] for o in baseline_offers)
    baseline_airline = min(baseline_offers, key=lambda o: o["price"])["airline"]

    # ── Step B: hub check ─────────────────────────────────────────────────────
    hub_airlines = _hub_airlines_for(destination)
    if not hub_airlines:
        return {
            "baseline_price": baseline_price,
            "baseline_airline": baseline_airline,
            "deals": [],
            "note": f"{destination} is not mapped as a hub — no hidden city opportunities to check.",
        }

    # ── Step C: anomaly hunt ──────────────────────────────────────────────────
    # Build search tasks concurrently (one per beyond-city per airline)
    search_tasks: list[tuple[str, str, str]] = []  # (airline_code, airline_name, beyond_city)
    for airline_code, airline_name in hub_airlines:
        for city in _beyond_cities(airline_code, destination):
            if city != origin:
                search_tasks.append((airline_code, airline_name, city))

    async def _check(airline_code: str, airline_name: str, beyond_city: str) -> list[dict]:
        try:
            offers = await search_flights(origin, beyond_city, date, max_results=5)
        except Exception:
            return []

        hits = []
        for offer in offers:
            if destination not in offer["layovers"]:
                continue
            savings = round(baseline_price - offer["price"], 2)
            if savings <= 0:
                continue
            hits.append({
                "hidden_city":    destination,
                "booked_dest":    beyond_city,
                "origin":         origin,
                "price":          offer["price"],
                "savings":        savings,
                "savings_pct":    round(savings / baseline_price * 100, 1),
                "airline":        airline_name,
                "airline_code":   airline_code,
                "route_label":    f"{origin} → {beyond_city} (exit at {destination})",
                "segments":       offer["segments"],
            })
        return hits

    results = await asyncio.gather(*[
        _check(ac, an, bc) for ac, an, bc in search_tasks
    ])

    # ── Step D: collate + sort ────────────────────────────────────────────────
    deals = [deal for group in results for deal in group]
    deals.sort(key=lambda d: d["savings"], reverse=True)

    return {
        "origin":           origin,
        "destination":      destination,
        "date":             date,
        "baseline_price":   baseline_price,
        "baseline_airline": baseline_airline,
        "hubs_checked":     [name for _, name in hub_airlines],
        "searches_run":     len(search_tasks),
        "deals":            deals,
    }
