from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    hf_api_token: str = Field("", env="HF_API_TOKEN")
    sdxl_model: str = Field("stabilityai/stable-diffusion-xl-base-1.0", env="SDXL_MODEL")
    sd_fast_model: str = Field("stabilityai/stable-diffusion-2-1", env="SD_FAST_MODEL")
    app_host: str = Field("0.0.0.0", env="APP_HOST")
    app_port: int = Field(8000, env="APP_PORT")
    debug: bool = Field(True, env="DEBUG")
    gallery_dir: str = Field("static/gallery", env="GALLERY_DIR")
    database_url: str = Field("sqlite+aiosqlite:///./studio.db", env="DATABASE_URL")
    rate_limit: int = Field(20, env="RATE_LIMIT")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()
