"""
FastAPI backend for PaddleOCR-based document scanning.
Supports file upload and base64 image input.
"""

import base64
import io
import logging
import os
import time
from contextlib import asynccontextmanager

import cv2
import numpy as np
from dotenv import load_dotenv
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from pydantic import BaseModel

import ocr_engine
import preprocessor

load_dotenv()

log_level = os.getenv("LOG_LEVEL", "info").upper()
logging.basicConfig(level=getattr(logging, log_level, logging.INFO))
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load PaddleOCR models on startup."""
    logger.info("Starting model loading...")
    ocr_engine.init_models()
    logger.info("Models ready.")
    yield


app = FastAPI(title="DispatchFlow OCR API", lifespan=lifespan)

# CORS configuration
allowed_origins_raw = os.getenv("ALLOWED_ORIGINS", "")
if allowed_origins_raw == "*":
    logger.warning("CORS ALLOWED_ORIGINS is set to '*'. Restrict this in production.")
    allowed_origins = ["*"]
elif allowed_origins_raw:
    allowed_origins = [o.strip() for o in allowed_origins_raw.split(",") if o.strip()]
else:
    logger.warning("CORS ALLOWED_ORIGINS is empty. Defaulting to '*'. Set explicit origins for production.")
    allowed_origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Base64Request(BaseModel):
    image: str
    mime_type: str = "image/jpeg"


class OcrResponse(BaseModel):
    text: str
    confidence: float
    language: str
    low_confidence: bool
    processing_time_ms: int
    lines: list[dict] = []
    error: str | None = None


def _decode_image_bytes(data: bytes) -> np.ndarray:
    """Decode raw image bytes to a numpy array (BGR)."""
    arr = np.frombuffer(data, dtype=np.uint8)
    image = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Could not decode image. Ensure the file is a valid image.")
    return image


def _process_image(image: np.ndarray) -> dict:
    """Run the full preprocessing + OCR pipeline and return result dict."""
    start = time.perf_counter()
    processed = preprocessor.preprocess(image)
    result = ocr_engine.run_ocr(processed)
    elapsed_ms = int((time.perf_counter() - start) * 1000)
    logger.info("OCR completed in %dms (confidence=%.2f)", elapsed_ms, result["confidence"])
    return {
        "text": result["text"],
        "confidence": result["confidence"],
        "language": result["language"],
        "low_confidence": result["low_confidence"],
        "processing_time_ms": elapsed_ms,
        "lines": result.get("lines", []),
        "error": result.get("error"),
    }


MAX_IMAGE_BYTES = 15 * 1024 * 1024  # 15 MB


@app.post("/ocr/upload", response_model=OcrResponse)
async def ocr_upload(file: UploadFile = File(...)):
    """Accept an uploaded image file, preprocess, and run OCR."""
    try:
        contents = await file.read()
        if len(contents) > MAX_IMAGE_BYTES:
            raise HTTPException(status_code=400, detail=f"Image too large ({len(contents)} bytes). Maximum is {MAX_IMAGE_BYTES} bytes.")
        image = _decode_image_bytes(contents)
        return _process_image(image)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("Error processing uploaded file")
        return OcrResponse(
            text="",
            confidence=0.0,
            language="unknown",
            low_confidence=True,
            processing_time_ms=0,
            error=f"Server error: {str(e)}",
        )


@app.post("/ocr/base64", response_model=OcrResponse)
async def ocr_base64(req: Base64Request):
    """Accept a base64-encoded image, decode, preprocess, and run OCR."""
    try:
        # Strip data URI prefix if present
        b64 = req.image
        if "," in b64:
            b64 = b64.split(",", 1)[1]
        raw = base64.b64decode(b64)
        if len(raw) > MAX_IMAGE_BYTES:
            raise HTTPException(status_code=400, detail=f"Image too large ({len(raw)} bytes). Maximum is {MAX_IMAGE_BYTES} bytes.")
        image = _decode_image_bytes(raw)
        return _process_image(image)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("Error processing base64 image")
        return OcrResponse(
            text="",
            confidence=0.0,
            language="unknown",
            low_confidence=True,
            processing_time_ms=0,
            error=f"Server error: {str(e)}",
        )


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "models_loaded": ocr_engine.models_loaded(),
    }
