"""
Database — SQLite (no setup needed, file created automatically)
Tables: generated_images, prompt_library
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

# ── Engine & session ─────────────────────────────────────────
engine = create_async_engine(settings.database_url, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
Base = declarative_base()


# ── ORM Models ───────────────────────────────────────────────
class GeneratedImage(Base):
    __tablename__ = "generated_images"

    id           = Column(Integer, primary_key=True, index=True)
    filename     = Column(String, unique=True, index=True)
    prompt       = Column(Text)
    negative_prompt = Column(Text, default="")
    model        = Column(String)
    width        = Column(Integer, default=512)
    height       = Column(Integer, default=512)
    steps        = Column(Integer, default=20)
    guidance_scale = Column(Float, default=7.5)
    seed         = Column(Integer, default=-1)
    mode         = Column(String, default="txt2img")   # txt2img | img2img | inpaint
    generation_time = Column(Float, default=0.0)       # seconds
    rating       = Column(Integer, default=0)          # 0-5 stars
    created_at   = Column(DateTime, default=datetime.utcnow)
    is_favourite = Column(Boolean, default=False)


class PromptLibrary(Base):
    __tablename__ = "prompt_library"

    id         = Column(Integer, primary_key=True, index=True)
    title      = Column(String)
    prompt     = Column(Text)
    negative_prompt = Column(Text, default="")
    tags       = Column(String, default="")            # comma-separated
    use_count  = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)


# ── Helpers ──────────────────────────────────────────────────
async def init_db():
    """Create all tables if they don't exist."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db():
    """Dependency injected into FastAPI routes."""
    async with AsyncSessionLocal() as session:
        yield session
