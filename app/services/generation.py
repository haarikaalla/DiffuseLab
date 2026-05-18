"""
Generation Service
==================
Calls HuggingFace Inference API to generate images.
Handles: txt2img, prompt enhancement, error handling, retries.

HOW DIFFUSION WORKS (in code terms):
  1. Your prompt → CLIP text encoder → embeddings (numbers)
  2. HF starts with random noise tensor
  3. UNet denoises it step by step, guided by your embeddings
  4. VAE decoder → final pixel image
  We don't run this locally — HF's GPU does it, we just call their API.
"""

import httpx
import base64
import time
import random
import asyncio
from io import BytesIO
from pathlib import Path
from PIL import Image
from app.config import settings

# ── HuggingFace API endpoints ─────────────────────────────────
HF_API_BASE = "https://api-inference.huggingface.co/models"

MODEL_MAP = {
    "sdxl": settings.sdxl_model,
    "sd21": settings.sd_fast_model,
}

# Prompt enhancement keywords — improves output quality automatically
QUALITY_BOOSTERS = [
    "highly detailed", "sharp focus", "professional photography",
    "8k uhd", "high quality", "masterpiece",
]

STYLE_PRESETS = {
    "photorealistic": "photorealistic, DSLR photo, natural lighting",
    "anime":          "anime style, studio ghibli, cel shading",
    "oil_painting":   "oil painting, classical art, brush strokes, canvas texture",
    "watercolor":     "watercolor painting, soft colors, artistic",
    "cinematic":      "cinematic shot, movie still, dramatic lighting, anamorphic lens",
    "none":           "",
}


class GenerationService:
    """Handles all image generation logic."""

    def __init__(self):
        self.headers = {
            "Authorization": f"Bearer {settings.hf_api_token}",
            "Content-Type": "application/json",
        }
        Path(settings.gallery_dir).mkdir(parents=True, exist_ok=True)

    # ── Public method called by API route ─────────────────────
    async def generate(
        self,
        prompt: str,
        negative_prompt: str,
        width: int,
        height: int,
        steps: int,
        guidance_scale: float,
        seed: int,
        model: str,
        enhance_prompt: bool = False,
        style: str = "none",
    ) -> dict:
        """
        Main generation pipeline:
          1. (Optional) Enhance prompt
          2. Call HuggingFace API
          3. Save image to disk
          4. Return metadata dict
        """
        start = time.time()

        # Step 1 — resolve seed
        actual_seed = seed if seed != -1 else random.randint(0, 2**32 - 1)

        # Step 2 — optionally enhance the prompt
        final_prompt = prompt
        if enhance_prompt:
            final_prompt = self._enhance_prompt(prompt, style)

        # Step 3 — add style preset
        if style != "none" and STYLE_PRESETS.get(style):
            final_prompt = f"{final_prompt}, {STYLE_PRESETS[style]}"

        # Step 4 — generate via HF API
        image_bytes = await self._call_hf_api(
            model_key=model,
            prompt=final_prompt,
            negative_prompt=negative_prompt,
            width=width,
            height=height,
            steps=steps,
            guidance_scale=guidance_scale,
            seed=actual_seed,
        )

        # Step 5 — save image
        filename = f"gen_{actual_seed}_{int(time.time())}.png"
        filepath = Path(settings.gallery_dir) / filename
        img = Image.open(BytesIO(image_bytes))
        img.save(filepath, "PNG")

        generation_time = round(time.time() - start, 2)

        return {
            "filename": filename,
            "prompt": final_prompt,
            "original_prompt": prompt,
            "negative_prompt": negative_prompt,
            "model": model,
            "width": img.width,
            "height": img.height,
            "steps": steps,
            "guidance_scale": guidance_scale,
            "seed": actual_seed,
            "generation_time": generation_time,
            "mode": "txt2img",
        }

    # ── HuggingFace API call ───────────────────────────────────
    async def _call_hf_api(
        self,
        model_key: str,
        prompt: str,
        negative_prompt: str,
        width: int,
        height: int,
        steps: int,
        guidance_scale: float,
        seed: int,
        retries: int = 3,
    ) -> bytes:
        """
        Calls HF Inference API. Handles model loading (503) with retries.
        HF sometimes returns 503 when the model is cold-starting — we wait and retry.
        """
        model_id = MODEL_MAP.get(model_key, MODEL_MAP["sd21"])
        url = f"{HF_API_BASE}/{model_id}"

        payload = {
            "inputs": prompt,
            "parameters": {
                "negative_prompt": negative_prompt,
                "width":           width,
                "height":          height,
                "num_inference_steps": steps,
                "guidance_scale":  guidance_scale,
                "seed":            seed,
            },
            "options": {
                "wait_for_model": True,   # wait instead of error on cold start
                "use_cache":      False,  # always generate fresh
            },
        }

        async with httpx.AsyncClient(timeout=120.0) as client:
            for attempt in range(retries):
                try:
                    response = await client.post(url, json=payload, headers=self.headers)

                    # Model still loading
                    if response.status_code == 503:
                        wait = 20 * (attempt + 1)
                        print(f"[HF] Model loading, retrying in {wait}s...")
                        await asyncio.sleep(wait)
                        continue

                    # Bad token / auth error
                    if response.status_code == 401:
                        raise ValueError(
                            "Invalid HuggingFace token. "
                            "Get yours free at huggingface.co/settings/tokens"
                        )

                    # Rate limit
                    if response.status_code == 429:
                        raise ValueError("HuggingFace rate limit hit. Wait 1 minute.")

                    response.raise_for_status()

                    # Success — response body is raw image bytes
                    content_type = response.headers.get("content-type", "")
                    if "image" not in content_type:
                        raise ValueError(
                            f"Unexpected response from HF: {response.text[:200]}"
                        )

                    return response.content

                except httpx.TimeoutException:
                    if attempt == retries - 1:
                        raise ValueError(
                            "Request timed out. HF API may be slow — try again."
                        )
                    await asyncio.sleep(5)

        raise ValueError("Generation failed after all retries.")

    # ── Prompt enhancer ───────────────────────────────────────
    def _enhance_prompt(self, prompt: str, style: str) -> str:
        """
        Adds quality-boosting keywords to the prompt.
        In a production system this would call an LLM (GPT-4/Claude).
        Here we use a curated keyword approach — still works very well.
        """
        boosters = random.sample(QUALITY_BOOSTERS, 3)
        enhanced = f"{prompt}, {', '.join(boosters)}"
        return enhanced

    # ── Validate token on startup ─────────────────────────────
    async def validate_token(self) -> bool:
        """Quick check that the HF token works."""
        if not settings.hf_api_token or settings.hf_api_token == "hf_your_token_here":
            return False
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(
                "https://huggingface.co/api/whoami",
                headers={"Authorization": f"Bearer {settings.hf_api_token}"},
            )
            return r.status_code == 200


# Singleton
generation_service = GenerationService()
