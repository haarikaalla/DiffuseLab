"""
API Routes
==========
POST /api/generate          — generate an image
GET  /api/gallery           — list all images
GET  /api/gallery/{id}      — single image metadata
DELETE /api/gallery/{id}    — delete image
PATCH /api/gallery/{id}/rate — rate an image
PATCH /api/gallery/{id}/favourite — toggle favourite
GET  /api/stats             — dashboard statistics
POST /api/prompts           — save a prompt
GET  /api/prompts           — list saved prompts
DELETE /api/prompts/{id}    — delete prompt
GET  /api/health            — health check
"""

import os
from pathlib import Path
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete

from app.database import get_db, GeneratedImage, PromptLibrary
from app.schemas import (
    GenerateRequest, ImageResponse, PromptCreate, PromptResponse,
    RatingUpdate, GalleryStats,
)
from app.config import settings

# Auto-select service:
#   - Demo mode (default): Pollinations.ai — FREE, no token, works immediately
#   - HF mode: set USE_HF_API=true + HF_API_TOKEN in .env for HuggingFace models
if os.getenv("USE_HF_API", "false").lower() == "true":
    from app.services.generation import generation_service as _svc
else:
    from app.services.demo_generation import demo_service as _svc  # type: ignore

generation_service = _svc

router = APIRouter(prefix="/api")


# ── Health ────────────────────────────────────────────────────
@router.get("/health")
async def health():
    demo_mode = os.getenv("USE_HF_API", "false").lower() != "true"
    token_ok  = await generation_service.validate_token()
    return {
        "status":    "ok",
        "token_ok":  token_ok,
        "demo_mode": demo_mode,
        "timestamp": datetime.utcnow().isoformat(),
        "message":   (
            "Demo mode — Pollinations.ai (free, no token needed)" if demo_mode
            else ("Token valid" if token_ok else "Set HF_API_TOKEN in .env")
        ),
    }


# ── Generate ──────────────────────────────────────────────────
@router.post("/generate", response_model=ImageResponse)
async def generate_image(
    req: GenerateRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Main generation endpoint.
    Calls HuggingFace Inference API → saves image → stores metadata.
    """
    # Validate token before attempting
    if not await generation_service.validate_token():
        raise HTTPException(
            status_code=400,
            detail="HuggingFace token missing or invalid. "
                   "Add HF_API_TOKEN to your .env file. "
                   "Get free token at huggingface.co/settings/tokens"
        )

    try:
        result = await generation_service.generate(
            prompt=req.prompt,
            negative_prompt=req.negative_prompt,
            width=req.width,
            height=req.height,
            steps=req.steps,
            guidance_scale=req.guidance_scale,
            seed=req.seed,
            model=req.model,
            enhance_prompt=req.enhance_prompt,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")

    # Save metadata to DB
    img_record = GeneratedImage(
        filename=result["filename"],
        prompt=result["prompt"],
        negative_prompt=result["negative_prompt"],
        model=result["model"],
        width=result["width"],
        height=result["height"],
        steps=result["steps"],
        guidance_scale=result["guidance_scale"],
        seed=result["seed"],
        mode=result["mode"],
        generation_time=result["generation_time"],
    )
    db.add(img_record)
    await db.commit()
    await db.refresh(img_record)

    return _to_response(img_record)


# ── Gallery ───────────────────────────────────────────────────
@router.get("/gallery", response_model=list[ImageResponse])
async def list_gallery(
    skip: int = 0,
    limit: int = 50,
    favourites_only: bool = False,
    db: AsyncSession = Depends(get_db),
):
    q = select(GeneratedImage).order_by(GeneratedImage.created_at.desc())
    if favourites_only:
        q = q.where(GeneratedImage.is_favourite == True)
    q = q.offset(skip).limit(limit)
    result = await db.execute(q)
    images = result.scalars().all()
    return [_to_response(img) for img in images]


@router.get("/gallery/{image_id}", response_model=ImageResponse)
async def get_image(image_id: int, db: AsyncSession = Depends(get_db)):
    img = await _get_or_404(db, image_id)
    return _to_response(img)


@router.delete("/gallery/{image_id}")
async def delete_image(image_id: int, db: AsyncSession = Depends(get_db)):
    img = await _get_or_404(db, image_id)
    filepath = Path(settings.gallery_dir) / img.filename
    if filepath.exists():
        os.remove(filepath)
    await db.delete(img)
    await db.commit()
    return {"deleted": True, "id": image_id}


@router.patch("/gallery/{image_id}/rate")
async def rate_image(
    image_id: int,
    body: RatingUpdate,
    db: AsyncSession = Depends(get_db),
):
    img = await _get_or_404(db, image_id)
    img.rating = body.rating
    await db.commit()
    return {"id": image_id, "rating": body.rating}


@router.patch("/gallery/{image_id}/favourite")
async def toggle_favourite(image_id: int, db: AsyncSession = Depends(get_db)):
    img = await _get_or_404(db, image_id)
    img.is_favourite = not img.is_favourite
    await db.commit()
    return {"id": image_id, "is_favourite": img.is_favourite}


# ── Stats ─────────────────────────────────────────────────────
@router.get("/stats", response_model=GalleryStats)
async def get_stats(db: AsyncSession = Depends(get_db)):
    total  = (await db.execute(select(func.count(GeneratedImage.id)))).scalar()
    favs   = (await db.execute(
        select(func.count(GeneratedImage.id)).where(GeneratedImage.is_favourite == True)
    )).scalar()
    avg_r  = (await db.execute(select(func.avg(GeneratedImage.rating)))).scalar() or 0.0
    prompts = (await db.execute(select(func.count(PromptLibrary.id)))).scalar()

    # Count by model
    rows = (await db.execute(
        select(GeneratedImage.model, func.count(GeneratedImage.id))
        .group_by(GeneratedImage.model)
    )).all()
    models_used = {row[0]: row[1] for row in rows}

    return GalleryStats(
        total_images=total or 0,
        total_prompts=prompts or 0,
        favourite_count=favs or 0,
        avg_rating=round(avg_r, 1),
        models_used=models_used,
    )


# ── Prompt library ────────────────────────────────────────────
@router.post("/prompts", response_model=PromptResponse)
async def save_prompt(body: PromptCreate, db: AsyncSession = Depends(get_db)):
    p = PromptLibrary(**body.model_dump())
    db.add(p)
    await db.commit()
    await db.refresh(p)
    return p


@router.get("/prompts", response_model=list[PromptResponse])
async def list_prompts(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(PromptLibrary).order_by(PromptLibrary.use_count.desc())
    )
    return result.scalars().all()


@router.delete("/prompts/{prompt_id}")
async def delete_prompt(prompt_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(PromptLibrary).where(PromptLibrary.id == prompt_id)
    )
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Prompt not found")
    await db.delete(p)
    await db.commit()
    return {"deleted": True}


# ── Helpers ───────────────────────────────────────────────────
async def _get_or_404(db: AsyncSession, image_id: int) -> GeneratedImage:
    result = await db.execute(
        select(GeneratedImage).where(GeneratedImage.id == image_id)
    )
    img = result.scalar_one_or_none()
    if not img:
        raise HTTPException(status_code=404, detail="Image not found")
    return img


def _to_response(img: GeneratedImage) -> ImageResponse:
    return ImageResponse(
        id=img.id,
        filename=img.filename,
        url=f"/static/gallery/{img.filename}",
        prompt=img.prompt,
        negative_prompt=img.negative_prompt,
        model=img.model,
        width=img.width,
        height=img.height,
        steps=img.steps,
        guidance_scale=img.guidance_scale,
        seed=img.seed,
        mode=img.mode,
        generation_time=img.generation_time,
        rating=img.rating,
        is_favourite=img.is_favourite,
        created_at=img.created_at,
    )
