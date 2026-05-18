"""
Demo Generation Service — ZERO setup required
=============================================
Uses https://pollinations.ai — completely free, no API key, no signup.
Pollinations runs open-source diffusion models (Flux, SDXL) on their GPU.

This is the DEFAULT mode so the project works immediately out of the box.
Switch to HuggingFace mode by setting USE_HF_API=true in .env
"""

import httpx
import time
import random
from pathlib import Path
from urllib.parse import quote
from PIL import Image
from io import BytesIO
from app.config import settings


# Pollinations.ai free endpoint — no auth needed
POLLINATIONS_URL = "https://image.pollinations.ai/prompt/{prompt}"

# Style suffix map — appended to prompt for style control
STYLE_MAP = {
    "photorealistic": "photorealistic, DSLR photo, 8k, sharp focus",
    "cinematic":      "cinematic shot, movie still, dramatic lighting, anamorphic",
    "anime":          "anime style, studio ghibli, vibrant colors, cel shading",
    "oil_painting":   "oil painting, classical art, impasto, canvas texture",
    "watercolor":     "watercolor painting, soft washes, artistic, delicate",
    "none":           "highly detailed, masterpiece, sharp focus",
}

NEGATIVE_TEMPLATE = "blurry, low quality, distorted, watermark, ugly, noisy"


class DemoGenerationService:
    """
    Generates images via Pollinations.ai — completely free.
    Architecture is identical to HF mode; only the HTTP call changes.
    This is what you show recruiters in a live demo.
    """

    def __init__(self):
        Path(settings.gallery_dir).mkdir(parents=True, exist_ok=True)

    async def generate(
        self,
        prompt: str,
        negative_prompt: str = "",
        width: int = 512,
        height: int = 512,
        steps: int = 20,
        guidance_scale: float = 7.5,
        seed: int = -1,
        model: str = "sd21",
        enhance_prompt: bool = False,
        style: str = "none",
    ) -> dict:
        start = time.time()
        actual_seed = seed if seed != -1 else random.randint(0, 999999)

        # Build enriched prompt
        style_suffix = STYLE_MAP.get(style, STYLE_MAP["none"])
        if enhance_prompt:
            full_prompt = f"{prompt}, {style_suffix}, professional quality"
        else:
            full_prompt = f"{prompt}, {style_suffix}"

        # Call Pollinations free API
        image_bytes = await self._call_pollinations(
            prompt=full_prompt,
            width=width,
            height=height,
            seed=actual_seed,
            model=model,
        )

        # Save to disk
        filename = f"gen_{actual_seed}_{int(time.time())}.png"
        filepath = Path(settings.gallery_dir) / filename
        img = Image.open(BytesIO(image_bytes))
        img.save(filepath, "PNG")

        return {
            "filename":        filename,
            "prompt":          full_prompt,
            "original_prompt": prompt,
            "negative_prompt": negative_prompt,
            "model":           model,
            "width":           img.width,
            "height":          img.height,
            "steps":           steps,
            "guidance_scale":  guidance_scale,
            "seed":            actual_seed,
            "generation_time": round(time.time() - start, 2),
            "mode":            "txt2img",
        }

    async def _call_pollinations(
        self,
        prompt: str,
        width: int,
        height: int,
        seed: int,
        model: str,
    ) -> bytes:
        """
        Pollinations.ai API:
          GET https://image.pollinations.ai/prompt/{encoded_prompt}
              ?width=512&height=512&seed=42&model=flux&nologo=true

        Models available (all free):
          flux      — best quality (Flux.1 by Black Forest Labs)
          turbo     — fastest
          flux-realism — photorealistic
        """
        # Map our model names to Pollinations model names
        pollinations_model = {
            "sdxl": "flux",
            "sd21": "flux",
            "turbo": "turbo",
        }.get(model, "flux")

        encoded_prompt = quote(prompt)
        url = (
            f"https://image.pollinations.ai/prompt/{encoded_prompt}"
            f"?width={width}&height={height}&seed={seed}"
            f"&model={pollinations_model}&nologo=true&enhance=false"
        )

        async with httpx.AsyncClient(timeout=120.0, follow_redirects=True) as client:
            resp = await client.get(url)
            resp.raise_for_status()

            content_type = resp.headers.get("content-type", "")
            if "image" not in content_type:
                raise ValueError(f"Unexpected response: {resp.text[:200]}")

            return resp.content

    async def validate_token(self) -> bool:
        """Always valid — no token needed for demo mode."""
        return True


demo_service = DemoGenerationService()
