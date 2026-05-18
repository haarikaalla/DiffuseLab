"""
FastAPI Application
===================
Wires everything together: routes, static files, DB init, CORS, metrics.
"""

from pathlib import Path
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from prometheus_fastapi_instrumentator import Instrumentator

from app.routes import router
from app.database import init_db
from app.config import settings

# ── Create app ────────────────────────────────────────────────
app = FastAPI(
    title="AI Image Generation Studio",
    description="Generate images using Stable Diffusion via HuggingFace API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS (allow frontend dev server on :3000 + :5173) ────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Prometheus metrics at /metrics ────────────────────────────
Instrumentator().instrument(app).expose(app)

# ── Mount static files (generated images served here) ────────
gallery_path = Path(settings.gallery_dir)
gallery_path.mkdir(parents=True, exist_ok=True)
app.mount("/static/gallery", StaticFiles(directory=str(gallery_path)), name="gallery")

# ── Mount frontend build (if it exists) ───────────────────────
frontend_build = Path("frontend/dist")
if frontend_build.exists():
    app.mount("/assets", StaticFiles(directory=str(frontend_build / "assets")), name="assets")

# ── Include API routes ────────────────────────────────────────
app.include_router(router)


# ── Startup: init DB ─────────────────────────────────────────
@app.on_event("startup")
async def startup():
    await init_db()
    print("[DB] Tables created / verified ✓")


# ── Serve frontend index.html for all non-API routes ─────────
@app.get("/")
async def serve_frontend():
    frontend_index = Path("frontend/dist/index.html")
    if frontend_index.exists():
        return FileResponse(str(frontend_index))
    # Fallback: API-only mode message
    return {
        "message": "AI Image Studio API is running!",
        "docs":    "http://localhost:8000/docs",
        "health":  "http://localhost:8000/api/health",
    }


@app.get("/{full_path:path}")
async def catch_all(full_path: str):
    """Serve React SPA for all frontend routes."""
    if full_path.startswith("api/") or full_path.startswith("static/"):
        from fastapi import HTTPException
        raise HTTPException(status_code=404)
    frontend_index = Path("frontend/dist/index.html")
    if frontend_index.exists():
        return FileResponse(str(frontend_index))
    return {"detail": "Frontend not built. Run: cd frontend && npm install && npm run build"}
