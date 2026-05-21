from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers.hunt import router as hunt_router
from services import cache


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Startup: initialise DB, purge stale rows. Shutdown: nothing to clean up."""
    cache.init()
    cache.purge_expired()
    yield


app = FastAPI(title="AIRNET Hunt API", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(hunt_router)


@app.get("/health")
async def health():
    return {"status": "ok", "cache": cache.stats()}
