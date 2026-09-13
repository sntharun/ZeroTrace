import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger
from contextlib import asynccontextmanager

from config import settings
from routers import agent

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("[PrivacyLens Server] Starting up...")
    logger.info(f"[PrivacyLens Server] Using VLM Provider: {settings.VLM_PROVIDER}")
    logger.info(f"[PrivacyLens Server] Using Model: {settings.VLM_MODEL}")
    yield
    logger.info("[PrivacyLens Server] Shutting down...")

app = FastAPI(
    title="PrivacyLens API",
    description="Backend server for privacy-preserving browser agent",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all for browser extension
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(agent.router, prefix="/api", tags=["agent"])

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.get("/")
async def root():
    return {
        "app": "PrivacyLens API",
        "version": "1.0.0",
        "docs_url": "/docs"
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host=settings.SERVER_HOST, port=settings.SERVER_PORT, reload=True)
