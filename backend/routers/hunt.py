import json
import pathlib
from datetime import date as date_type, timedelta

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, field_validator

from services.hunt_engine import hunt as run_hunt

router = APIRouter(prefix="/hunt", tags=["hunt"])

_HUB_MAP = json.loads(
    (pathlib.Path(__file__).parent.parent / "data" / "hub_map.json").read_text()
)


class HuntRequest(BaseModel):
    origin:      str
    destination: str
    date:        str  # YYYY-MM-DD

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


@router.post("")
async def hunt_endpoint(req: HuntRequest):
    if req.origin == req.destination:
        raise HTTPException(status_code=400, detail="Origin and destination must differ")
    try:
        result = await run_hunt(req.origin, req.destination, req.date)
        return result
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))


@router.get("/hubs")
async def get_hubs():
    """Return full hub map — used by frontend autocomplete and info display."""
    return _HUB_MAP
