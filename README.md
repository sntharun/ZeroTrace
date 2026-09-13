# 🛡️ PrivacyLens — On-device Visual Perception for Light-weight Browser Agents

> **SIH 2026** | Privacy-Preserving Vision Agent for Browsers

## Overview

PrivacyLens is a privacy-preserving browser agent that runs visual perception **on-device** to detect and redact sensitive/PII data before sending any information to a server. The server-side VLM processes only sanitized context and returns actionable browser commands.

```
┌──────────────────── Client (Browser Extension) ────────────────────┐
│                                                                     │
│  Screen Capture → PII Detection → Redaction → Sanitized Payload    │
│  (DOM + Screenshot)  (3 layers)    (blur/mask)   (no raw PII)      │
│                                                                     │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ HTTPS (sanitized only)
                               ▼
┌──────────────────── Server (FastAPI + VLM) ────────────────────────┐
│                                                                     │
│  Receive Context → VLM Reasoning → Action Planning → Response      │
│  (redacted image)  (Qwen2.5-VL)    (click/type/scroll)            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Key Features

- 🔒 **Privacy-First**: All PII detection and redaction happens locally in the browser
- 👁️ **Multi-Layer PII Detection**: DOM heuristics + regex patterns + vision models (BlazeFace)
- 🎯 **Precise Redaction**: Type-specific methods — blur for faces, black-fill for text PII
- 🤖 **Intelligent Actions**: Server-side VLM understands redacted context and plans browser actions
- ⚡ **Lightweight**: Client models total ~10-15MB, WebGPU accelerated
- 🌐 **Cross-Browser**: Chrome (MV3) and Firefox compatible

## Architecture

### PII Detection Layers

| Layer | Method | Catches | Latency |
|-------|--------|---------|---------|
| 1 | DOM Heuristics | Password fields, email inputs, form fields with sensitive names/labels | <10ms |
| 2 | Regex Patterns | Email, phone, Aadhaar, PAN, credit card, SSN, DOB, IP addresses | <50ms |
| 3 | Vision Models | Faces (BlazeFace), text in images/canvas | ~200ms |

### Redaction Methods

| PII Type | Method | Server Marker |
|----------|--------|---------------|
| Faces | Gaussian blur | `[FACE_REDACTED]` |
| Passwords | Solid black fill | `[PASSWORD_REDACTED]` |
| Emails | Black fill + label | `[EMAIL_REDACTED]` |
| Phone numbers | Black fill + label | `[PHONE_REDACTED]` |
| ID numbers | Black fill + label | `[ID_REDACTED]` |
| Credit cards | Black fill + label | `[CC_REDACTED]` |

## Project Structure

```
SIH26/
├── extension/           # Browser extension (Chrome MV3)
│   ├── manifest.json
│   ├── popup/           # Extension popup UI
│   ├── background/      # Service worker
│   ├── content/         # Content scripts (DOM analysis, action execution)
│   ├── vision/          # On-device ML pipeline (ONNX Runtime Web)
│   ├── privacy/         # PII detection & redaction engine
│   └── models/          # ONNX model files
│
├── server/              # FastAPI server
│   ├── main.py          # Application entry point
│   ├── routers/         # API endpoints
│   ├── services/        # VLM, prompt building, action planning
│   └── models/          # Pydantic schemas
│
├── demo/                # Demo test pages & evaluation
│   └── test-pages/      # HTML pages with various PII types
│
└── docs/                # Documentation
```

## Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+ (for development tools)
- Chrome or Firefox browser
- Groq API key (free at https://console.groq.com) OR Together AI API key

### Server Setup

```bash
cd server
python -m venv venv
source venv/bin/activate   # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env and add your API key
python main.py
```

Server runs at `http://localhost:8000`

### Extension Setup

1. Open Chrome → `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked" → select the `extension/` folder
4. Pin the PrivacyLens extension in the toolbar

### Usage

1. Navigate to any web page
2. Click the PrivacyLens extension icon
3. Enter your task (e.g., "Help me fill this form")
4. Click "Analyze Page" to detect PII
5. Review detected PII in the overlay
6. Click "Send to Server" to get AI assistance
7. Watch the agent execute actions

## Evaluation Metrics

| Metric | Weight | Our Approach |
|--------|--------|--------------|
| Visual context accuracy | 25% | Hybrid DOM + Vision for structural + visual understanding |
| PII detection recall/precision | 20% | 3-layer detection for maximum recall |
| Redaction precision | 20% | Pixel-accurate bbox redaction with type-specific methods |
| Client resource utilization | 20% | Quantized ONNX models, lazy loading, <200MB RAM |
| End-to-end latency | 15% | Parallel processing, target <3s round-trip |

## Tech Stack

- **Client**: Chrome Extension (MV3), ONNX Runtime Web, WebGPU
- **Server**: Python, FastAPI, Groq/Together AI
- **VLM**: Llama 4 Scout (Groq) / Qwen2.5-VL-72B (Together AI)
- **Models**: BlazeFace (face detection), EAST/CRAFT (text detection)

## Team

SIH 2026 Team — 6 Members

## License

MIT
