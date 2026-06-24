from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import players, pitching, analytics_routes

app = FastAPI(title="PitchIQ API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(players.router, prefix="/api/players", tags=["players"])
app.include_router(pitching.router, prefix="/api/pitching", tags=["pitching"])
app.include_router(analytics_routes.router, prefix="/api/analytics", tags=["analytics"])


@app.get("/")
def root():
    return {"status": "PitchIQ API running"}


@app.get("/health")
def health():
    return {"status": "ok"}
