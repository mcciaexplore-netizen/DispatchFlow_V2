# DispatchFlow V2

**Smart OCR-powered dispatch & invoice digitization for Indian MSMEs**

DispatchFlow V2 is an offline-first web application that uses Vision OCR to digitize dispatch slips and invoices. Built for Indian MSMEs, it supports multilingual documents (Hindi, Marathi, English), works on mobile devices, and syncs data to Google Sheets — all without requiring an ERP system.

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Frontend Setup](#frontend-setup)
  - [Backend Setup](#backend-setup)
- [OCR Pipeline](#ocr-pipeline)
- [Google Sheets Integration](#google-sheets-integration)
- [Deployment](#deployment)
- [Environment Variables](#environment-variables)
- [Screenshots](#screenshots)

---

## Features

### OCR & Document Processing
- **Multilingual OCR** — Hindi, Marathi, and English via PaddleOCR backend
- **AI-Powered Extraction** — Gemini 2.5 Flash for structured field extraction from scanned images
- **Multi-Line Item Detection** — Automatically detects invoice tables with multiple rows and extracts each item separately
- **Smart Fallback Chain** — PaddleOCR (backend) -> Tesseract.js (browser) -> Manual entry
- **Image Preprocessing** — Grayscale, upscaling, adaptive thresholding, deskew, denoising via OpenCV
- **OCR Caching** — Hash-based cache prevents redundant cloud API calls

### Data Management
- **Offline-First** — All data stored locally in IndexedDB (Dexie.js), works without internet
- **Google Sheets Sync** — Background sync worker queues records and pushes to Google Sheets via Apps Script
- **Multi-Row Sync** — Multi-item invoices expand into separate rows in Google Sheets (one per line item)
- **CSV Export** — Download dispatch/invoice history as CSV files
- **Backup & Restore** — Full database export/import as JSON files
- **Data Retention** — Configurable auto-cleanup of old records (default: 6 months)

### Forms & Schema
- **Dynamic Schema** — Customizable field definitions per document type (dispatch/invoice)
- **Drag-to-Reorder** — Rearrange form fields via drag-and-drop (dnd-kit)
- **OCR Auto-Fill** — Fields auto-populate from scanned data with amber highlight animation
- **Editable Line Items** — Multi-item invoices show editable cards for each detected item
- **Grace Period Editing** — Records editable within a configurable time window after creation

### Security & Sessions
- **Admin PIN Gate** — SHA-256 hashed PIN protects settings access
- **Operator Tracking** — Daily operator name prompt, attributed on every record
- **Auto-Lock** — Configurable inactivity timeout locks the app
- **Session Management** — Admin and app session timeouts

### User Experience
- **Mobile-First Design** — 44px touch targets, compact 8px grid layout
- **Camera Scanning** — Live camera preview with frame capture
- **File Upload** — Drag-and-drop or click to upload document images
- **Print-Ready Previews** — Slip previews with company header, logo, and print media queries
- **Sync Status Indicator** — Real-time sync state (synced/pending/failing)

---

## Architecture

```
+----------------------------------------------------------+
|                      User's Browser                       |
|                                                           |
|  +----------------------------------------------------+  |
|  |              React Frontend (Vite + TS)             |  |
|  |                                                     |  |
|  |  +-------------+  +------------+  +--------------+  |  |
|  |  |  ScanZone   |  | DynamicForm|  | SlipPreview  |  |  |
|  |  |  (Camera/   |  | (React Hook|  | (Print-ready |  |  |
|  |  |   Upload)   |  |   Form)    |  |   layout)    |  |  |
|  |  +------+------+  +-----+------+  +--------------+  |  |
|  |         |                |                            |  |
|  |  +------v----------------v-----------+               |  |
|  |  |         OCR Pipeline              |               |  |
|  |  |  Preprocess -> Extract -> Parse   |               |  |
|  |  +--+-------------------+------------+               |  |
|  |     |                   |                             |  |
|  +----------------------------------------------------+  |
|        |                   |                              |
+--------|-------------------|------------------------------+
         |                   |
         v                   v
+----------------+  +------------------+
| PaddleOCR      |  | Gemini 2.5 Flash |
| Backend (FastAPI)  | (Google AI API)  |
| - Hindi model  |  | - Structured     |
| - English model|  |   field extract  |
| - OpenCV       |  | - Multi-item     |
|   preprocess   |  |   detection      |
+----------------+  +------------------+

         Storage & Sync Layer
+----------------------------------------------------------+
|                                                           |
|  +------------------+  +----------------+  +-----------+  |
|  |  Dexie/IndexedDB |  | Sync Worker    |  | Google    |  |
|  |  - dispatch      |  | - Queue-based  |  | Sheets    |  |
|  |  - invoice       |  | - 5min interval|  | (via Apps |  |
|  |  - syncQueue     |  | - Retry logic  |  |  Script)  |  |
|  |  - syncLog       |  | - Max 5 retries|  |           |  |
|  +------------------+  +-------+--------+  +-----^-----+  |
|                                |                  |        |
|                                +------------------+        |
+----------------------------------------------------------+
```

### OCR Pipeline Flow

```
Image Capture/Upload
        |
        v
+-------------------+
| Image Preprocessing|
| (compress, sharpen,|
|  contrast enhance) |
+--------+----------+
         |
         v
+-------------------+     +-------------------+
| PaddleOCR Backend |---->| Tesseract.js      |
| (preferred)       |fail | (browser fallback)|
| Hindi + English   |     | English only      |
+--------+----------+     +--------+----------+
         |                          |
         +-----------+--------------+
                     |
                     v
         +---------------------+
         | Gemini 2.5 Flash    |
         | Structured Extract  |
         | - Schema-aware      |
         | - Multi-item detect |
         | - Field confidence  |
         +----------+----------+
                    |
                    v
         +---------------------+
         | JSON Parser         |
         | - Truncation repair |
         | - Field mapping     |
         | - Item extraction   |
         +----------+----------+
                    |
                    v
         +---------------------+
         | DynamicForm         |
         | - Auto-fill fields  |
         | - Line item cards   |
         | - User edits        |
         +---------------------+
```

### Data Sync Flow

```
User Saves Record
        |
        v
+-------------------+
| Save to Dexie     |
| (IndexedDB)       |
+--------+----------+
         |
         v
+-------------------+
| Enqueue to        |
| syncQueue         |
| (expand multi-    |
|  item -> rows)    |
+--------+----------+
         |
         v
+-------------------+     +-------------------+
| Sync Worker       |---->| Google Apps Script |
| POST payload      |     | Web App (proxy)   |
| text/plain JSON   |     |                   |
+--------+----------+     +--------+----------+
         |                          |
    on failure                      v
         |                 +-------------------+
         v                 | Google Sheets     |
+-------------------+      | - One row per item|
| Retry (up to 5x)  |      | - Header fields   |
| Exponential backoff|      |   repeated        |
+-------------------+      +-------------------+
```

---

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| React 19 | UI framework |
| TypeScript 5.9 | Type safety |
| Vite 8 | Build tool & dev server |
| Tailwind CSS 3.4 | Utility-first styling |
| Zustand 5 | State management |
| Dexie 4 | IndexedDB wrapper (offline storage) |
| React Hook Form 7 | Form handling & validation |
| React Router 7 | Client-side routing |
| Tesseract.js 7 | Browser-based OCR fallback |
| dnd-kit | Drag-and-drop for schema editor |

### Backend
| Technology | Purpose |
|---|---|
| Python 3.10+ | Runtime |
| FastAPI | Async web framework |
| PaddleOCR | Multilingual OCR (Hindi/Marathi/English) |
| PaddlePaddle | Deep learning framework |
| OpenCV | Image preprocessing pipeline |
| Pillow | Image format handling |
| Uvicorn | ASGI server |

### External Services
| Service | Purpose |
|---|---|
| Gemini 2.5 Flash | AI-powered structured field extraction |
| Google Sheets API | Read records from cloud |
| Google Apps Script | CORS proxy for Sheets writes |

---

## Project Structure

```
OCRscan/
|
+-- ocr-backend/                  # Python FastAPI backend
|   +-- main.py                   # FastAPI app, endpoints, CORS, lifespan
|   +-- app.py                    # HF Spaces entry point
|   +-- ocr_engine.py             # PaddleOCR dual-model (Hindi + English)
|   +-- preprocessor.py           # OpenCV pipeline (grayscale, threshold, deskew, denoise)
|   +-- requirements.txt          # Python dependencies
|   +-- Dockerfile                # Container build (python:3.10-slim)
|   +-- .env.example              # Environment variable template
|
+-- ocr-frontend/                 # React/TypeScript frontend
|   +-- src/
|   |   +-- components/
|   |   |   +-- forms/
|   |   |   |   +-- DynamicForm.tsx       # Schema-driven form with OCR auto-fill & line items
|   |   |   +-- layout/
|   |   |   |   +-- AppShell.tsx          # Main wrapper (auth, sync init, timeouts)
|   |   |   |   +-- NavBar.tsx            # Navigation + sync indicator
|   |   |   +-- scanner/
|   |   |   |   +-- ScanZone.tsx          # Camera/upload OCR component
|   |   |   +-- schema/
|   |   |   |   +-- SchemaEditor.tsx      # Drag-to-reorder field editor
|   |   |   +-- preview/
|   |   |   |   +-- SlipPreview.tsx       # Print-ready slip layout
|   |   |   +-- session/
|   |   |   |   +-- PinGate.tsx           # Admin PIN modal
|   |   |   |   +-- OperatorModal.tsx     # Operator name prompt
|   |   |   |   +-- AppLock.tsx           # Inactivity lock screen
|   |   |   +-- ui/                       # Reusable UI primitives
|   |   |
|   |   +-- ocr/
|   |   |   +-- ocr.ts                   # OCR orchestrator (cache -> preprocess -> extract -> parse)
|   |   |   +-- ocrCloud.ts              # Gemini API wrapper with rate limiting
|   |   |   +-- ocrParser.ts             # JSON extraction, truncation repair, field mapping
|   |   |   +-- localOcr.ts              # Tesseract.js Web Worker coordination
|   |   |   +-- imagePreprocessor.ts     # Canvas-based image optimization
|   |   |   +-- ocrCache.ts              # Hash-based OCR result cache
|   |   |   +-- networkQueue.ts          # Offline job queue
|   |   |
|   |   +-- pages/
|   |   |   +-- OnboardingWizard.tsx     # 4-step setup wizard
|   |   |   +-- Dashboard.tsx            # Home with status indicators
|   |   |   +-- CreateDispatch.tsx       # Dispatch form + OCR
|   |   |   +-- CreateInvoice.tsx        # Invoice form + multi-item OCR
|   |   |   +-- DispatchHistory.tsx      # Filterable dispatch list + CSV export
|   |   |   +-- InvoiceHistory.tsx       # Invoice list + CSV export
|   |   |   +-- DispatchDetail.tsx       # Single dispatch record view
|   |   |   +-- InvoiceDetail.tsx        # Single invoice record view
|   |   |   +-- Settings.tsx             # Configuration hub
|   |   |
|   |   +-- lib/
|   |   |   +-- syncWorker.ts            # Background Google Sheets sync
|   |   |   +-- sheetsRead.ts            # Sheets API read client
|   |   |   +-- backup.ts                # Export/import/retention logic
|   |   |   +-- config.ts                # localStorage config readers
|   |   |   +-- schema.ts                # Schema persistence + ID generation
|   |   |   +-- pinAuth.ts               # SHA-256 PIN hashing
|   |   |   +-- csvExport.ts             # CSV generation
|   |   |
|   |   +-- services/
|   |   |   +-- ocrService.ts            # PaddleOCR backend API client
|   |   |   +-- imageUtils.ts            # Image validation utilities
|   |   |
|   |   +-- store/
|   |   |   +-- sessionStore.ts          # Operator & admin session state
|   |   |   +-- syncStore.ts             # Sync status state
|   |   |
|   |   +-- db/
|   |   |   +-- index.ts                 # Dexie database schema
|   |   |
|   |   +-- types/
|   |   |   +-- index.ts                 # TypeScript interfaces
|   |   |
|   |   +-- constants/
|   |   |   +-- storage.ts               # localStorage key registry
|   |   |   +-- schemaTemplates.ts       # Default dispatch/invoice schemas
|   |   |
|   |   +-- App.tsx                      # Router setup
|   |   +-- main.tsx                     # React entry point
|   |   +-- index.css                    # Global styles + animations
|   |
|   +-- package.json
|   +-- vite.config.ts
|   +-- tailwind.config.js
|   +-- tsconfig.json
|   +-- .env.example
|
+-- context.md                    # Application goals & user narrative
+-- design_brief.md               # Design system specification
+-- modules.md                    # Module-by-module architecture doc
+-- README.md                     # This file
```

---

## Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.10+ (for backend)
- **Google Gemini API Key** — [Get one here](https://aistudio.google.com/apikey)
- **Google Apps Script URL** (optional, for Sheets sync)

### Frontend Setup

```bash
# Navigate to frontend
cd ocr-frontend

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local
# Edit .env.local and set VITE_OCR_API_URL (default: http://localhost:8000)

# Start development server
npm run dev
```

Frontend runs at `http://localhost:5173`

### Backend Setup

```bash
# Navigate to backend
cd ocr-backend

# Create virtual environment
python -m venv venv
source venv/bin/activate        # Linux/Mac
# venv\Scripts\activate         # Windows

# Install dependencies
pip install paddlepaddle==2.6.2
pip install paddleocr==2.9.1
pip install -r requirements.txt

# Create environment file
cp .env.example .env
# Edit .env — set ALLOWED_ORIGINS to your frontend URL

# Start the server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Backend runs at `http://localhost:8000`

> **Note:** On first startup, PaddleOCR downloads Hindi and English models (~200MB). This is a one-time download.

> **Windows Users:** If you see OneDNN errors, ensure you're using `paddlepaddle==2.6.2` (not 3.x). For Python 3.12+, use `paddlepaddle==2.6.2` and `paddleocr==2.9.1`.

### First-Time App Setup

1. Open `http://localhost:5173` in your browser
2. The **Onboarding Wizard** guides you through:
   - **Step 1:** Company identity (name, GST, address, logo)
   - **Step 2:** Choose schema template (dispatch/invoice)
   - **Step 3:** Customize form fields (drag to reorder, add/remove)
   - **Step 4:** Configure Google integration (Gemini API key, Apps Script URL)

---

## OCR Pipeline

The OCR system uses a multi-stage pipeline for maximum accuracy on Indian MSME documents:

### Stage 1 — Image Preprocessing (Browser)
- Compression (fast/high quality profiles)
- Contrast enhancement and sharpening

### Stage 2 — Raw Text Extraction
- **Primary:** PaddleOCR backend (Hindi + English dual model)
  - OpenCV preprocessing: grayscale, upscale, adaptive threshold, deskew, denoise
  - Runs both Hindi and English models, picks higher confidence result
  - Detects Devanagari script to preserve Hindi/Marathi text
- **Fallback:** Tesseract.js (in-browser, English only)

### Stage 3 — Structured Extraction (Gemini 2.5 Flash)
- Sends image + raw OCR text as hint to Gemini API
- Schema-aware prompt extracts specific fields (customer name, date, amounts, etc.)
- Multi-line item detection for invoice tables
- Returns JSON with field values + per-item breakdowns
- Configuration: `thinkingBudget: 0`, `maxOutputTokens: 8192`, `temperature: 0`

### Stage 4 — Parsing & Validation
- JSON extraction with truncation repair (closes unclosed braces/brackets)
- Field mapping to schema keys
- Line item array extraction
- Confidence scoring per field

---

## Google Sheets Integration

### Write (Apps Script Proxy)
Records sync to Google Sheets via a Google Apps Script Web App:

1. On save, records are queued in IndexedDB (`syncQueue`)
2. Multi-item invoices expand into separate rows (one per line item)
3. Background worker POSTs JSON to your Apps Script URL every 5 minutes
4. Failed records retry up to 5 times with exponential backoff
5. Sync status shown in navbar (synced/pending/failing)

### Read (Sheets API)
History pages can pull records from Google Sheets using a read-only API key.

### Setting Up Google Apps Script

1. Create a new Google Apps Script project
2. Write a `doPost(e)` function that:
   - Parses the JSON payload from `e.postData.contents`
   - Appends a row to the appropriate sheet tab (`recordType` field)
   - Returns `"ok"` on success
3. Deploy as Web App with access set to **Anyone**
4. Copy the deployment URL into the app's Settings page

---

## Deployment

### Backend — Hugging Face Spaces (Recommended, Free)

1. Create a new Space on [Hugging Face](https://huggingface.co/spaces) (SDK: Docker)
2. Upload the `ocr-backend/` files (or connect your GitHub repo)
3. The `Dockerfile` handles everything — installs deps and pre-downloads OCR models
4. Set environment variable: `ALLOWED_ORIGINS=https://your-frontend-domain.vercel.app`
5. Space URL becomes your backend endpoint (e.g., `https://your-space.hf.space`)

### Frontend — Vercel (Recommended, Free)

1. Connect your GitHub repo to [Vercel](https://vercel.com)
2. Set root directory to `ocr-frontend`
3. Add environment variable: `VITE_OCR_API_URL=https://your-space.hf.space`
4. Vercel auto-detects Vite and deploys on every push

### Alternative Deployment Options

| Service | Frontend | Backend |
|---|---|---|
| Vercel | Yes (static) | No |
| Netlify | Yes (static) | No |
| Railway | Yes | Yes (Docker) |
| Render | Yes | Yes (Docker) |
| HF Spaces | No | Yes (Docker/FastAPI) |

---

## Environment Variables

### Frontend (`ocr-frontend/.env.local`)

| Variable | Description | Default |
|---|---|---|
| `VITE_OCR_API_URL` | PaddleOCR backend URL | `http://localhost:8000` |

### Backend (`ocr-backend/.env`)

| Variable | Description | Default |
|---|---|---|
| `ALLOWED_ORIGINS` | Comma-separated CORS origins | `*` |
| `PORT` | Server port | `8000` |
| `LOG_LEVEL` | Logging level (debug/info/warning/error) | `info` |

### In-App Configuration (Settings page)
These are configured through the app's onboarding wizard or settings page:

| Setting | Purpose |
|---|---|
| Gemini API Key | Powers AI-structured extraction |
| Apps Script URL | Google Sheets write proxy |
| Sheets API Key | Read-only access to Google Sheets |
| Spreadsheet ID | Target Google Sheets spreadsheet |
| Admin PIN | Protects settings access |
| Grace Period | Time window for editing saved records |
| Session Timeouts | Admin unlock and app lock durations |

---

## API Endpoints (Backend)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/ocr/upload` | OCR from uploaded image file (multipart/form-data, max 15MB) |
| `POST` | `/ocr/base64` | OCR from base64-encoded image |
| `GET` | `/health` | Health check + model status |

### Response Format

```json
{
  "text": "Extracted text from document...",
  "confidence": 0.92,
  "language": "mixed",
  "low_confidence": false,
  "processing_time_ms": 1234,
  "lines": [
    {
      "text": "Line text",
      "confidence": 0.95,
      "bbox": [[x1,y1], [x2,y2], [x3,y3], [x4,y4]]
    }
  ],
  "error": null
}
```

---

## Design System

- **Theme:** Warm-industrial (paper-like warmth meets technical precision)
- **Colors:** Warm neutrals with amber accent (`#E07B00`)
- **Typography:** Barlow Semi Condensed (headings), Source Sans 3 (body), JetBrains Mono (monospace)
- **Motion:** 150ms stagger animations, 80ms amber flash on OCR fill, paper grain overlay at 2% opacity
- **Layout:** High-density 8px grid, 44px minimum touch targets

---

## License

This project is developed for MCCIA (Mahratta Chamber of Commerce, Industries and Agriculture).
