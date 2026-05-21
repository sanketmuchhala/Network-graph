"""
SQLite-backed anomaly cache.
Sits between the frontend and Amadeus — returns cached deals instantly,
only calls Amadeus when cache is empty or older than TTL (24 h).
"""
import sqlite3
import time
import pathlib
from typing import Optional

DB  = pathlib.Path(__file__).parent.parent / "data" / "anomalies.db"
TTL = 86_400   # 24 hours


def init() -> None:
    """Create table + index on first run. Safe to call repeatedly."""
    with sqlite3.connect(DB) as con:
        con.execute("""
            CREATE TABLE IF NOT EXISTS anomalies (
                route_id          TEXT    PRIMARY KEY,
                origin            TEXT    NOT NULL,
                target_hub        TEXT    NOT NULL,
                dummy_destination TEXT    NOT NULL,
                airline           TEXT    NOT NULL,
                airline_code      TEXT    NOT NULL,
                baseline_price    REAL    NOT NULL,
                hidden_price      REAL    NOT NULL,
                net_savings       REAL    NOT NULL,
                savings_pct       REAL    NOT NULL,
                date              TEXT    NOT NULL,
                timestamp         INTEGER NOT NULL
            )
        """)
        con.execute(
            "CREATE INDEX IF NOT EXISTS idx_origin_date ON anomalies(origin, date)"
        )
    print(f"[cache] DB ready → {DB}")


def get_cached(origin: str, date: str) -> Optional[list[dict]]:
    """
    Return cached rows for (origin, date) that are within TTL.
    Returns None (not []) on a cache miss so callers can distinguish
    'no deals found' (empty list) from 'never searched' (None).
    """
    cutoff = int(time.time()) - TTL
    with sqlite3.connect(DB) as con:
        con.row_factory = sqlite3.Row
        rows = con.execute(
            "SELECT * FROM anomalies WHERE origin=? AND date=? AND timestamp>?",
            (origin, date, cutoff),
        ).fetchall()

    if not rows:
        return None
    return [dict(r) for r in rows]


def mark_searched(origin: str, date: str) -> None:
    """
    Record that we searched (origin, date) but found zero deals.
    Prevents repeated live calls when Amadeus legitimately returns nothing.
    Stored as a sentinel row with a special route_id.
    """
    sentinel_id = f"__sentinel__{origin}__{date}"
    now = int(time.time())
    with sqlite3.connect(DB) as con:
        con.execute(
            "INSERT OR REPLACE INTO anomalies VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
            (sentinel_id, origin, "", "", "", "", 0, 0, 0, 0, date, now),
        )


def was_searched(origin: str, date: str) -> bool:
    """True if we already ran a live hunt for (origin, date) within TTL."""
    cutoff  = int(time.time()) - TTL
    sentinel = f"__sentinel__{origin}__{date}"
    with sqlite3.connect(DB) as con:
        row = con.execute(
            "SELECT 1 FROM anomalies WHERE route_id=? AND timestamp>?",
            (sentinel, cutoff),
        ).fetchone()
    return row is not None


def save_deals(origin: str, date: str, baseline: float, deals: list[dict]) -> int:
    """
    Persist a batch of deal dicts (as returned by hunt_engine.hunt).
    Returns the number of rows inserted/replaced.
    """
    now = int(time.time())
    inserted = 0
    with sqlite3.connect(DB) as con:
        for d in deals:
            route_id = (
                f"{origin}-{d['hidden_city']}-{d['booked_dest']}"
                f"-{d['airline_code']}-{date}"
            )
            con.execute(
                "INSERT OR REPLACE INTO anomalies VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
                (
                    route_id,
                    origin,
                    d["hidden_city"],
                    d["booked_dest"],
                    d["airline"],
                    d["airline_code"],
                    baseline,
                    d["price"],
                    d["savings"],
                    d["savings_pct"],
                    date,
                    now,
                ),
            )
            inserted += 1
    return inserted


def purge_expired() -> int:
    """Delete rows older than TTL. Returns number of rows removed."""
    cutoff = int(time.time()) - TTL
    with sqlite3.connect(DB) as con:
        cur = con.execute("DELETE FROM anomalies WHERE timestamp<?", (cutoff,))
    removed = cur.rowcount
    if removed:
        print(f"[cache] purged {removed} expired row(s)")
    return removed


def stats() -> dict:
    """Quick summary for /health or debug endpoints."""
    cutoff = int(time.time()) - TTL
    with sqlite3.connect(DB) as con:
        total  = con.execute("SELECT COUNT(*) FROM anomalies").fetchone()[0]
        fresh  = con.execute(
            "SELECT COUNT(*) FROM anomalies WHERE timestamp>? AND route_id NOT LIKE '__sentinel__%'",
            (cutoff,),
        ).fetchone()[0]
    return {"total_rows": total, "fresh_deals": fresh, "ttl_seconds": TTL}
