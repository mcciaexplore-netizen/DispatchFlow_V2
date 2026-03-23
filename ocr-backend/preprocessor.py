"""
Image preprocessing pipeline for OCR optimization.
Designed for low-quality phone camera photos of Indian MSME documents.
"""

import cv2
import numpy as np


def preprocess(image: np.ndarray) -> np.ndarray:
    """
    Full preprocessing pipeline:
    1. Grayscale conversion
    2. Upscale if shortest dimension < 1000px
    3. Adaptive thresholding (Gaussian, block=11, C=2)
    4. Deskew via minAreaRect on contours (correct if angle > 0.5 deg)
    5. Denoise with fastNlMeansDenoising
    """
    # 1. Convert to grayscale
    if len(image.shape) == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image.copy()

    # 2. Upscale if shortest dimension is below 1000px
    h, w = gray.shape[:2]
    shortest = min(h, w)
    if shortest < 1000:
        scale = 1000 / shortest
        new_w = int(w * scale)
        new_h = int(h * scale)
        gray = cv2.resize(gray, (new_w, new_h), interpolation=cv2.INTER_CUBIC)

    # 3. Adaptive thresholding for uneven lighting
    thresh = cv2.adaptiveThreshold(
        gray,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        blockSize=11,
        C=2,
    )

    # 4. Deskew
    thresh = _deskew(thresh)

    # 5. Denoise
    denoised = cv2.fastNlMeansDenoising(thresh, h=10)

    return denoised


def _deskew(image: np.ndarray) -> np.ndarray:
    """Detect text angle via minAreaRect on contours and rotate to correct."""
    coords = cv2.findNonZero(cv2.bitwise_not(image))
    if coords is None:
        return image

    rect = cv2.minAreaRect(coords)
    angle = rect[-1]

    # minAreaRect returns angles in [-90, 0). Normalize:
    # If angle < -45, the rect is nearly upright, so add 90.
    if angle < -45:
        angle += 90

    # Only correct if deviation is more than 0.5 degrees
    if abs(angle) <= 0.5:
        return image

    h, w = image.shape[:2]
    center = (w // 2, h // 2)
    rotation_matrix = cv2.getRotationMatrix2D(center, angle, 1.0)
    rotated = cv2.warpAffine(
        image,
        rotation_matrix,
        (w, h),
        flags=cv2.INTER_CUBIC,
        borderMode=cv2.BORDER_REPLICATE,
    )
    return rotated
