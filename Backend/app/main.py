"""FastAPI application: RAG chat, code generation, and the built React bundle.

Run locally with:
    uvicorn app.main:app --reload --port 8000
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from google.api_core import exceptions as google_exceptions

from app.api.auth_routes import router as auth_router
from app.api.routes import router
from app.core import config
from app.db.models import Base
from app.db.session import engine
from app.services import rag

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Creating tables here means a fresh deploy boots with a usable database
    # instead of 500ing on the first /upload.
    Base.metadata.create_all(bind=engine)

    if not config.JWT_SECRET_FROM_ENV:
        logger.warning(
            "JWT_SECRET is not set; using the generated secret at %s. "
            "Set JWT_SECRET in production or a redeploy will sign everyone out.",
            config.DATA_DIR / "jwt_secret",
        )

    if not config.GOOGLE_CLIENT_ID:
        logger.info("GOOGLE_CLIENT_ID is not set; Google sign-in is disabled.")

    rag.load_vectorstore()
    yield


app = FastAPI(title="ChatBot AI", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Upstream provider errors --------------------------------------------
# Without these, a Gemini quota or credential problem reaches the browser as a
# bare 500 and the UI can only say "Something went wrong."


@app.exception_handler(google_exceptions.ResourceExhausted)
async def handle_quota_exhausted(request: Request, exc: Exception):
    logger.warning("Gemini quota exhausted: %s", exc)
    return JSONResponse(
        status_code=429,
        content={
            "detail": "The AI provider's quota is used up. The free tier resets "
            "daily — try again later, or enable billing on your Google AI key."
        },
    )


@app.exception_handler(google_exceptions.Unauthenticated)
@app.exception_handler(google_exceptions.PermissionDenied)
async def handle_provider_auth(request: Request, exc: Exception):
    logger.error("Gemini rejected our credentials: %s", exc)
    return JSONResponse(
        status_code=502,
        content={"detail": "The server's AI credentials were rejected. Check GEMINI_API_KEY."},
    )


@app.exception_handler(google_exceptions.GoogleAPICallError)
async def handle_provider_error(request: Request, exc: Exception):
    logger.error("Gemini call failed: %s", exc)
    return JSONResponse(
        status_code=502,
        content={"detail": "The AI provider could not be reached. Please try again."},
    )


@app.get("/health")
def health() -> dict:
    """Public liveness probe — Render calls this without a token."""
    return {"status": "ok"}


app.include_router(auth_router)  # public: /auth/*
app.include_router(router)  # requires a bearer token


# --- Built React bundle ---------------------------------------------------
# Registered after the API router so the catch-all below cannot shadow it.

if (config.FRONTEND_DIST / "assets").is_dir():
    app.mount(
        "/assets",
        StaticFiles(directory=config.FRONTEND_DIST / "assets"),
        name="assets",
    )


@app.get("/{full_path:path}")
async def serve_react(full_path: str):
    """Serve bundle files directly and fall back to index.html for client routes.

    Serving real files first matters for the PWA: sw.js, registerSW.js,
    manifest.webmanifest and the icons all live at the bundle root, and handing
    them index.html breaks service-worker registration.
    """
    dist = config.FRONTEND_DIST.resolve()

    if full_path:
        candidate = (dist / full_path).resolve()
        # is_relative_to rejects any ../ traversal out of the bundle.
        if candidate.is_relative_to(dist) and candidate.is_file():
            return FileResponse(candidate)

    index_file = dist / "index.html"
    if index_file.is_file():
        return FileResponse(index_file)

    return {"message": "Frontend not built. Run npm run build inside Frontend."}
