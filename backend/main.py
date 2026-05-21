from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers.hunt import router as hunt_router

app = FastAPI(title="AIRNET Hunt API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(hunt_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
