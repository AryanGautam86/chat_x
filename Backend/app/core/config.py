"""Settings and filesystem paths.

Every path is derived from BACKEND_DIR rather than the process working
directory, so the app behaves identically whether uvicorn is launched from
Backend/, from the repo root, or from / inside the container.
"""

import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

# app/core/config.py -> Backend/
BACKEND_DIR = Path(__file__).resolve().parents[2]

DATA_DIR = BACKEND_DIR / "data"
INDEX_DIR = DATA_DIR / "index"
DATABASE_PATH = DATA_DIR / "app.db"

# The Dockerfile copies the built React bundle here in stage 2.
FRONTEND_DIST = Path(os.getenv("FRONTEND_DIST") or BACKEND_DIR / "frontend_dist")

DATABASE_URL = os.getenv("DATABASE_URL") or f"sqlite:///{DATABASE_PATH}"

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
CHAT_MODEL = os.getenv("CHAT_MODEL", "gemini-2.5-flash")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "models/gemini-embedding-2")

# In production the bundle is served from this same origin, so CORS only
# matters for the Vite dev server.
CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
    ).split(",")
    if origin.strip()
]

RETRIEVAL_K = int(os.getenv("RETRIEVAL_K", "3"))
# FAISS returns L2 distances here, so lower is more similar.
RETRIEVAL_SCORE_THRESHOLD = float(os.getenv("RETRIEVAL_SCORE_THRESHOLD", "50"))

CODE_EXEC_TIMEOUT = int(os.getenv("CODE_EXEC_TIMEOUT", "10"))

# Uploads are read fully into memory before going to Gemini, so keep the cap
# well under the container's memory limit.
MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_MB", "10")) * 1_048_576

DATA_DIR.mkdir(parents=True, exist_ok=True)

# --- Auth -----------------------------------------------------------------

JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_TTL_MINUTES = int(os.getenv("ACCESS_TOKEN_TTL_MINUTES", str(60 * 24 * 7)))

# Google sign-in stays disabled until a client ID is configured; the frontend
# hides the button when this is empty.
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "").strip()

MIN_PASSWORD_LENGTH = 8

_SECRET_FILE = DATA_DIR / "jwt_secret"


def _resolve_jwt_secret() -> str:
    """Prefer JWT_SECRET from the environment; fall back to a persisted file.

    Generating a fresh secret on every boot would silently sign every user out
    on restart, so the dev fallback is written to disk once. Set JWT_SECRET in
    production: the container filesystem is ephemeral, so a redeploy would
    otherwise invalidate all outstanding tokens.
    """
    from_env = os.getenv("JWT_SECRET", "").strip()
    if from_env:
        return from_env

    if _SECRET_FILE.exists():
        stored = _SECRET_FILE.read_text().strip()
        if stored:
            return stored

    import secrets

    generated = secrets.token_urlsafe(48)
    _SECRET_FILE.write_text(generated)
    _SECRET_FILE.chmod(0o600)
    return generated


JWT_SECRET = _resolve_jwt_secret()
JWT_SECRET_FROM_ENV = bool(os.getenv("JWT_SECRET", "").strip())
