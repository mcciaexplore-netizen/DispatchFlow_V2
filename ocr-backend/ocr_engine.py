"""
PaddleOCR wrapper for multilingual document OCR.
Supports Hindi + Marathi (Devanagari) + English mixed text.
"""

import re
import logging
from typing import Any

import numpy as np

logger = logging.getLogger(__name__)

# Module-level OCR instances (initialized via init_models)
_ocr_hi: Any = None
_ocr_en: Any = None
_models_loaded = False


def init_models() -> None:
    """Load PaddleOCR models at startup. Call once during app lifespan."""
    global _ocr_hi, _ocr_en, _models_loaded
    from paddleocr import PaddleOCR

    logger.info("Loading PaddleOCR models (lang=hi for Devanagari+English)...")
    _ocr_hi = PaddleOCR(use_angle_cls=True, lang="hi", show_log=False)
    logger.info("Loading PaddleOCR models (lang=en for pure English)...")
    _ocr_en = PaddleOCR(use_angle_cls=True, lang="en", show_log=False)
    _models_loaded = True
    logger.info("PaddleOCR models loaded successfully.")


def models_loaded() -> bool:
    return _models_loaded


def run_ocr(image: np.ndarray) -> dict:
    """
    Run OCR on a preprocessed image.

    Returns:
        {
            "text": str,           # joined lines
            "confidence": float,   # average confidence 0-1
            "language": str,       # "hi" | "en" | "mixed"
            "low_confidence": bool, # true if avg confidence < 0.75
            "lines": [{"text": str, "confidence": float, "bbox": list}, ...]
        }
    """
    if not _models_loaded:
        return {
            "text": "",
            "confidence": 0.0,
            "language": "unknown",
            "low_confidence": True,
            "lines": [],
            "error": "Models not loaded. Server is still starting up.",
        }

    try:
        # Run with Hindi model first (covers Devanagari + English)
        result_hi = _ocr_hi.ocr(image, cls=True)
        lines_hi = _extract_lines(result_hi)

        # Run with English model
        result_en = _ocr_en.ocr(image, cls=True)
        lines_en = _extract_lines(result_en)

        # Pick the result with higher average confidence
        avg_hi = _avg_confidence(lines_hi)
        avg_en = _avg_confidence(lines_en)

        if avg_en > avg_hi and not _has_devanagari(_join_text(lines_hi)):
            lines = lines_en
            avg_conf = avg_en
        else:
            lines = lines_hi
            avg_conf = avg_hi

        text = _join_text(lines)
        language = _detect_language(text)

        return {
            "text": text,
            "confidence": round(avg_conf, 4),
            "language": language,
            "low_confidence": avg_conf < 0.75,
            "lines": lines,
        }

    except Exception as e:
        logger.exception("OCR engine error")
        return {
            "text": "",
            "confidence": 0.0,
            "language": "unknown",
            "low_confidence": True,
            "lines": [],
            "error": str(e),
        }


def _extract_lines(result: list) -> list[dict]:
    """Extract line data from PaddleOCR result format."""
    lines = []
    if not result or not result[0]:
        return lines
    for item in result[0]:
        bbox = item[0]
        text = item[1][0]
        confidence = item[1][1]
        lines.append({
            "text": text,
            "confidence": round(float(confidence), 4),
            "bbox": [[int(p[0]), int(p[1])] for p in bbox],
        })
    return lines


def _avg_confidence(lines: list[dict]) -> float:
    if not lines:
        return 0.0
    return sum(l["confidence"] for l in lines) / len(lines)


def _join_text(lines: list[dict]) -> str:
    return "\n".join(l["text"] for l in lines)


def _has_devanagari(text: str) -> bool:
    """Check if text contains Devanagari characters (Hindi/Marathi)."""
    return bool(re.search(r"[\u0900-\u097F]", text))


def _detect_language(text: str) -> str:
    """Detect primary language based on character set analysis."""
    if not text.strip():
        return "unknown"

    devanagari_count = len(re.findall(r"[\u0900-\u097F]", text))
    latin_count = len(re.findall(r"[a-zA-Z]", text))
    total = devanagari_count + latin_count

    if total == 0:
        return "unknown"

    devanagari_ratio = devanagari_count / total

    if devanagari_ratio > 0.6:
        return "hi"
    elif devanagari_ratio < 0.1:
        return "en"
    else:
        return "mixed"
