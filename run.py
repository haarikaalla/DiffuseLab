"""
AI Image Generation Studio
==========================
Entry point — just run:  python run.py
"""

import uvicorn
from app.main import app          # noqa: F401 (imported for side-effects)

if __name__ == "__main__":
    print("\n" + "="*55)
    print("  🎨  AI Image Generation Studio")
    print("  ➜   http://localhost:8000")
    print("  ➜   API Docs: http://localhost:8000/docs")
    print("="*55 + "\n")
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )
