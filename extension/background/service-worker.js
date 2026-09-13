/**
 * @fileoverview Service worker orchestrating the PrivacyLens extension pipeline.
 */

import { detectPII } from '../privacy/pii-detector.js';
import { redactImage } from '../privacy/redactor.js';
import { sanitizeDOM } from '../privacy/dom-sanitizer.js';

const SERVER_URL = 'http://localhost:8000/api/process';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_STATUS') {
    fetch('http://localhost:8000/api/status')
      .then(res => res.ok ? sendResponse({ connected: true }) : sendResponse({ connected: false }))
      .catch(() => sendResponse({ connected: false }));
    return true;
  }

  if (message.type === 'ANALYZE_AND_REDACT') {
    handleAnalyzeAndRedact(message.tabId, message.redactEnabled !== false)
      .then(res => sendResponse(res))
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }
  
  if (message.type === 'SEND_TO_SERVER') {
    handleSendToServer(message.task)
      .then(res => sendResponse(res))
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }
});

let latestSanitizedData = null;

async function ensureContentScripts(tabId) {
  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => Boolean(window.__privacyLensOverlayInitialized && window.__getDomSkeleton)
    });
    if (!result?.result) {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: [
          'content/dom-analyzer.js',
          'content/action-executor.js',
          'content/overlay.js'
        ]
      });
    }
  } catch (err) {
    console.warn('[PrivacyLens] Content script injection notice:', err.message);
  }
}

async function handleAnalyzeAndRedact(tabId, redactEnabled = true) {
  console.log('[PrivacyLens] Starting analysis for tab', tabId, 'redactEnabled:', redactEnabled);
  
  // 1. Validate tab URL
  const tab = await chrome.tabs.get(tabId);
  if (!tab || !tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:') || tab.url.startsWith('chrome-extension://')) {
    throw new Error('Cannot run on internal browser pages. Please test on any regular website or localhost.');
  }

  // 2. Ensure content scripts are active on the tab (handles tabs opened before extension load)
  await ensureContentScripts(tabId);

  // 3. Capture screen
  const screenshotDataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });
  
  // 4. Extract DOM skeleton
  const [domResponse] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      if (typeof window.__getDomSkeleton === 'function') {
        return window.__getDomSkeleton();
      }
      return null;
    }
  });
  
  const domSkeleton = domResponse?.result;
  if (!domSkeleton) {
    throw new Error('Failed to analyze page DOM. Please refresh the web page and try again.');
  }

  // 5. Detect PII
  const piiDetections = await detectPII(domSkeleton, screenshotDataUrl);
  
  // 6. Redact image & sanitize DOM
  const viewport = domSkeleton.viewport || { width: 1280, height: 800 };
  viewport.dpr = domSkeleton.devicePixelRatio || 1;
  
  let finalImage = screenshotDataUrl;
  let finalDom = domSkeleton;
  let manifest = [];

  if (redactEnabled) {
    const redacted = await redactImage(screenshotDataUrl, piiDetections, viewport);
    finalImage = redacted.redactedImage;
    manifest = redacted.manifest;
    finalDom = sanitizeDOM(domSkeleton, piiDetections);
  }

  latestSanitizedData = {
    image: finalImage,
    dom: finalDom,
    manifest,
    viewport
  };

  // 7. Send overlay command to tab
  await chrome.tabs.sendMessage(tabId, {
    type: 'RENDER_OVERLAY',
    detections: piiDetections,
    visible: redactEnabled
  }).catch(async () => {
    // If message failed, re-inject overlay script and retry once
    await ensureContentScripts(tabId);
    await chrome.tabs.sendMessage(tabId, {
      type: 'RENDER_OVERLAY',
      detections: piiDetections,
      visible: redactEnabled
    }).catch(e => console.warn('[PrivacyLens] Overlay notice:', e.message));
  });

  return { message: `Detected ${piiDetections.length} PII items (Masking ${redactEnabled ? 'ON' : 'OFF'}).` };
}

async function handleSendToServer(task) {
  if (!latestSanitizedData) throw new Error('No sanitized data available. Analyze page first.');
  
  const payload = {
    screenshot_b64: latestSanitizedData.image,
    dom_skeleton: {
      url: latestSanitizedData.dom.url || '',
      title: latestSanitizedData.dom.title || '',
      elements: (latestSanitizedData.dom.elements || []).map(el => ({
        id: el.element_id || el.id || '',
        tag: el.tag || 'div',
        type: el.type,
        text: el.text,
        value: el.value,
        bbox: el.bbox ? {
          x1: el.bbox.x !== undefined ? el.bbox.x : (el.bbox.x1 || 0),
          y1: el.bbox.y !== undefined ? el.bbox.y : (el.bbox.y1 || 0),
          x2: el.bbox.width !== undefined ? el.bbox.x + el.bbox.width : (el.bbox.x2 || 0),
          y2: el.bbox.height !== undefined ? el.bbox.y + el.bbox.height : (el.bbox.y2 || 0)
        } : null
      })),
      redactions: (latestSanitizedData.manifest || []).map(m => ({
        type: m.type,
        bbox: m.bbox ? {
          x1: m.bbox.x !== undefined ? m.bbox.x : (m.bbox.x1 || 0),
          y1: m.bbox.y !== undefined ? m.bbox.y : (m.bbox.y1 || 0),
          x2: m.bbox.width !== undefined ? m.bbox.x + m.bbox.width : (m.bbox.x2 || 0),
          y2: m.bbox.height !== undefined ? m.bbox.y + m.bbox.height : (m.bbox.y2 || 0)
        } : { x1: 0, y1: 0, x2: 0, y2: 0 },
        method: m.method || 'blur'
      }))
    },
    user_task: task || 'Analyze page and perform requested action',
    viewport: {
      width: latestSanitizedData.viewport?.width || 1280,
      height: latestSanitizedData.viewport?.height || 800
    }
  };

  console.log('[PrivacyLens] Sending payload to server...', payload);
  const res = await fetch(SERVER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Server returned ${res.status}: ${errorText}`);
  }
  const data = await res.json();
  console.log('[PrivacyLens] Received response from server:', data);
  
  // If server returns actions, execute them in active tab
  if (data.actions && data.actions.length > 0) {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length > 0) {
      chrome.tabs.sendMessage(tabs[0].id, {
        type: 'EXECUTE_ACTION',
        actions: data.actions
      });
    }
  }

  return {
    success: true,
    reasoning: data.reasoning,
    message: data.message,
    status: data.status,
    actionsCount: data.actions?.length || 0
  };
}
