"""
Pydantic Schemas — request bodies + response shapes
"""

from pydantic import BaseModel, Field
from datetime import datetime


# ── Generation request ────────────────────────────────────────
class GenerateRequest(BaseModel):
    prompt: str = Field(..., min_length=3, max_length=1000,
                        description="What you want to generate")
    negative_prompt: str = Field(
        default="blurry, bad quality, distorted, watermark, ugly, low resolution",
        description="What to avoid in the image"
    )
    width:  int   = Field(default=512,  ge=256, le=1024)
    height: int   = Field(default=512,  ge=256, le=1024)
    steps:  int   = Field(default=20,   ge=10,  le=50,
                          description="More steps = better quality but slower")
    guidance_scale: float = Field(default=7.5, ge=1.0, le=20.0,
                                  description="How closely to follow the prompt")
    seed:   int   = Field(default=-1,
                          description="-1 = random seed")
    model:  str   = Field(default="sdxl",
                          description="sdxl | sd21")
    enhance_prompt: bool = Field(default=False,
                                 description="Auto-enhance prompt with style keywords")


# ── Response for a generated image ───────────────────────────
class ImageResponse(BaseModel):
    id:              int
    filename:        str
    url:             str
    prompt:          str
    negative_prompt: str
    model:           str
    width:           int
    height:          int
    steps:           int
    guidance_scale:  float
    seed:            int
    mode:            str
    generation_time: float
    rating:          int
    is_favourite:    bool
    created_at:      datetime

    class Config:
        from_attributes = True


# ── Prompt library ────────────────────────────────────────────
class PromptCreate(BaseModel):
    title:           str
    prompt:          str
    negative_prompt: str = ""
    tags:            str = ""


class PromptResponse(BaseModel):
    id:         int
    title:      str
    prompt:     str
    negative_prompt: str
    tags:       str
    use_count:  int
    created_at: datetime

    class Config:
        from_attributes = True


# ── Rating update ─────────────────────────────────────────────
class RatingUpdate(BaseModel):
    rating: int = Field(..., ge=0, le=5)


# ── Gallery stats (shown on dashboard) ───────────────────────
class GalleryStats(BaseModel):
    total_images:     int
    total_prompts:    int
    favourite_count:  int
    avg_rating:       float
    models_used:      dict
