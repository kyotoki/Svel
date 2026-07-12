import logging
import os

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address

import models
from database import engine, run_migrations
from logging_config import configure_logging
from routes import adventures, profile, reports, species, stats, uploads
from storage import UPLOAD_ROOT

configure_logging()
logger = logging.getLogger(__name__)

models.Base.metadata.create_all(bind=engine)
run_migrations()
UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="Svel API", version="1.0.0")

# Local Expo dev origins by default; the real svel.app origin is added purely
# via this env var in Month 4, with no code change.
DEFAULT_ALLOWED_ORIGINS = "http://localhost:8081,http://localhost:19006"
allowed_origins = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", DEFAULT_ALLOWED_ORIGINS).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

limiter = Limiter(key_func=get_remote_address, default_limits=[os.getenv("RATE_LIMIT_DEFAULT", "120/minute")])
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)


@app.exception_handler(Exception)
async def log_unhandled_exceptions(request: Request, exc: Exception):
    logger.exception(
        "Unhandled exception while processing request",
        extra={"path": request.url.path, "method": request.method},
    )
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


app.include_router(adventures.router)
app.include_router(profile.router)
app.include_router(reports.router)
app.include_router(species.router)
app.include_router(stats.router)
app.include_router(uploads.router)
# Registered after the uploads router: Starlette matches routes in
# registration order, and a Mount matches on path prefix alone (regardless of
# HTTP method), so mounting this first would shadow POST /uploads/ with a 405
# before it ever reached the router.
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_ROOT)), name="uploads")


@app.get("/")
def read_root():
    return {"status": "ok", "service": "Svel API"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}
