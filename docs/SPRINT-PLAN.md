# 🗓️ 3-Day Sprint Plan — Team Assignment (6 Members)

## Team Roles

| Member | Role | Primary Focus |
|--------|------|---------------|
| **M1** | Extension Lead | Chrome extension, popup UI, service worker |
| **M2** | Privacy Engineer | PII detection, redaction engine, DOM sanitizer |
| **M3** | Vision ML Engineer | ONNX models (BlazeFace, text detection), WebGPU pipeline |
| **M4** | Server Lead | FastAPI server, VLM integration, prompt engineering |
| **M5** | Integration & Testing | End-to-end flow, test pages, debugging |
| **M6** | Demo & Documentation | Demo scenario, evaluation scripts, presentation, video |

---

## Day 1 — Foundation & Core Pipeline

### M1 (Extension Lead)
- [ ] Test-load the extension in Chrome (`chrome://extensions` → Load unpacked)
- [ ] Fix any manifest issues, verify popup loads
- [ ] Refine `service-worker.js` — ensure `captureVisibleTab` works correctly
- [ ] Wire up popup ↔ service worker ↔ content script message passing
- [ ] Test DOM analyzer on 2-3 real websites

### M2 (Privacy Engineer)
- [ ] Review and enhance `privacy/patterns.js` — add more Indian PII patterns
- [ ] Test `pii-detector.js` against the demo test pages
- [ ] Tune regex patterns — minimize false positives on non-PII text
- [ ] Add detection for displayed PII (not just form inputs) — scan `textContent` nodes
- [ ] Implement confidence scoring for each detection

### M3 (Vision ML Engineer)
- [ ] Download BlazeFace ONNX model from ONNX Model Zoo or MediaPipe
- [ ] Convert to ONNX int8/fp16 if needed, place in `extension/models/`
- [ ] Get ONNX Runtime Web loaded in the extension (CDN or bundled)
- [ ] Test face detection on profile photos in the test pages
- [ ] Research lightweight text detection models (EAST/CRAFT ONNX exports)

### M4 (Server Lead)
- [ ] Set up Python venv, install dependencies
- [ ] Get a Groq API key (free: https://console.groq.com)
- [ ] Copy `.env.example` → `.env`, add API key
- [ ] Start the server, verify health check works
- [ ] Test VLM inference with a sample screenshot (manually via curl/Postman)
- [ ] Tune prompt templates for better action output

### M5 (Integration & Testing)
- [ ] Set up git repo, create branches, establish workflow
- [ ] Test extension → server communication (CORS, payload format)
- [ ] Create a checklist of all PII types to test
- [ ] Set up the two demo test pages locally (simple HTTP server)
- [ ] Document any bugs found, create issues

### M6 (Demo & Documentation)
- [ ] Plan the demo scenario (what task, what page, what PII types)
- [ ] Start the presentation skeleton (problem → approach → architecture → demo)
- [ ] Design evaluation rubric aligned with the 5 metrics
- [ ] Create additional test pages if needed (healthcare portal, social media profile)
- [ ] Draft the README with setup instructions

---

## Day 2 — Integration & Refinement

### M1 + M2 (Client Pipeline)
- [ ] Wire up complete client pipeline: capture → DOM analyze → PII detect → redact → package payload
- [ ] Test redaction visually — verify faces are blurred, text PII is blacked out
- [ ] Add the overlay visualization (red boxes for detected PII)
- [ ] Handle edge cases: iframes, shadow DOM, dynamically loaded content
- [ ] Optimize for speed — profile and reduce bottlenecks

### M3 (Vision Models)
- [ ] Finalize BlazeFace integration — end-to-end face detection from screenshot
- [ ] If text detection model is too large, implement a simpler approach:
  - Use Canvas API to render text regions, detect via heuristics
- [ ] Benchmark model inference time (target: <500ms per screenshot)
- [ ] Test on various screen sizes and DPR settings

### M4 (Server Intelligence)
- [ ] Refine prompt engineering for better action generation
- [ ] Test with sanitized screenshots — verify VLM understands redaction markers
- [ ] Implement multi-turn conversation support
- [ ] Add error handling for VLM timeouts/failures
- [ ] Test with both Groq and Together AI

### M5 (Integration)
- [ ] Run full end-to-end flow: extension → server → action execution
- [ ] Fix any integration bugs (payload format mismatches, timing issues)
- [ ] Test action execution: does click/type/scroll work correctly?
- [ ] Performance profiling: measure total latency per round-trip
- [ ] Cross-browser test (Firefox if time permits)

### M6 (Evaluation)
- [ ] Build evaluation script that measures:
  - PII detection recall/precision (ground truth annotations on test pages)
  - Redaction accuracy (compare redacted vs original)
  - Client-side memory/CPU usage
  - Round-trip latency
- [ ] Record partial demo video for backup
- [ ] Refine presentation with architecture diagrams

---

## Day 3 — Polish, Evaluate & Present

### All Members — Morning
- [ ] Final integration testing on fresh machine
- [ ] Fix any remaining bugs
- [ ] Run evaluation scripts, collect metrics
- [ ] Prepare demo on stable test pages (use local pages as backup)

### M1 + M3 — Resource Optimization
- [ ] Minimize extension footprint (lazy model loading, code splitting)
- [ ] Measure and document client resource usage (RAM, CPU, GPU)
- [ ] Ensure graceful degradation if WebGPU unavailable (fallback to WASM)

### M2 + M4 — Accuracy Tuning
- [ ] Fine-tune PII detection thresholds for best precision/recall
- [ ] Improve server prompts based on test results
- [ ] Handle edge cases discovered during testing

### M5 + M6 — Demo & Presentation
- [ ] Final demo rehearsal
- [ ] Record backup demo video
- [ ] Finalize presentation slides
- [ ] Prepare for Q&A (likely questions about privacy guarantees, latency, model choices)

---

## Critical Success Criteria

> [!IMPORTANT]
> These must work during the live demo:

1. ✅ Extension loads and captures current tab screenshot
2. ✅ PII is visually detected and highlighted (overlay)
3. ✅ Screenshot is redacted (faces blurred, text PII blacked out)
4. ✅ Sanitized payload is sent to server (show network tab — no raw PII)
5. ✅ Server returns intelligent action commands
6. ✅ Extension executes at least one action (e.g., click a button)

---

## Fallback Plans

| Risk | Fallback |
|------|----------|
| WebGPU not available on demo machine | WASM backend for ONNX Runtime (works everywhere) |
| ONNX model too large to load in browser | Use DOM + regex only (Layers 1+2), skip vision Layer 3 |
| Groq API down during demo | Pre-cached server responses + Together AI backup |
| Complex websites break DOM analyzer | Demo on our custom test pages (guaranteed to work) |
| Chrome extension issues | Firefox WebExtension as backup |
