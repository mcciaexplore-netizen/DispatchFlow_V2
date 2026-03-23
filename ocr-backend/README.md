---
title: DispatchFlow OCR API
emoji: 📄
colorFrom: yellow
colorTo: orange
sdk: docker
app_port: 7860
pinned: false
---

# DispatchFlow OCR API

FastAPI backend for multilingual document OCR using PaddleOCR.

Supports Hindi, Marathi, and English text extraction from dispatch slips and invoices.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/ocr/upload` | OCR from uploaded image (multipart/form-data) |
| POST | `/ocr/base64` | OCR from base64-encoded image |
| GET | `/health` | Health check + model status |
