"""
Tests — run with: pytest tests/ -v
"""
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

import os
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"
os.environ["HF_API_TOKEN"] = "test_dummy"

from app.main import app
from app.database import init_db

pytestmark = pytest.mark.anyio


@pytest_asyncio.fixture(autouse=True)
async def setup_db():
    await init_db()


async def test_health():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        r = await c.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"
    assert "demo_mode" in r.json()


async def test_gallery_empty():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        r = await c.get("/api/gallery")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


async def test_stats():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        r = await c.get("/api/stats")
    assert r.status_code == 200
    assert "total_images" in r.json()


async def test_save_and_list_prompt():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        r = await c.post("/api/prompts", json={
            "title": "Sunset",
            "prompt": "A beautiful sunset over the ocean",
            "tags": "nature,sunset"
        })
        assert r.status_code == 200
        assert r.json()["title"] == "Sunset"
        r2 = await c.get("/api/prompts")
        assert r2.status_code == 200
        assert len(r2.json()) >= 1


async def test_generate_missing_prompt():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        r = await c.post("/api/generate", json={"prompt": ""})
    assert r.status_code == 422
