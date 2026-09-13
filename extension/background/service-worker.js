/**
 * @fileoverview Service worker orchestrating the PrivacyLens extension pipeline.
 */

import { detectPII } from '../privacy/pii-detector.js';
import { redactImage } from '../privacy/redactor.js';
import { sanitizeDOM } from '../privacy/dom-sanitizer.js';

const SERVER_URL = 'http://localhost:8000/api/analyze';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_STATUS') {
    // Simple mock status check
    fetch(SERVER_URL.replace('/api/analyze', '/status'))
      .then(res => res.ok ? sendResponse({ connected: true }) : sendResponse({ connected: false }))
      .catch(() => sendResponse({ connected: false }));
    return true;
  }

  if (message.type === 'ANALYZE_AND_REDACT') {
    handleAnalyzeAndRedact(message.tabId)
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

async function handleAnalyzeAndRedact(tabId) {
  console.log('[PrivacyLens] Starting analysis for tab', tabId);
  
  // 1. Capture screen
  const screenshotDataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });
  
  // 2. Extract DOM skeleton
  const [domResponse] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => window.__getDomSkeleton()
  });
  
  const domSkeleton = domResponse.result;

  // 3. Detect PII
  const piiDetections = await detectPII(domSkeleton, screenshotDataUrl);
  
  // 4. Redact image & sanitize DOM
  const { redactedImage, manifest } = await redactImage(screenshotDataUrl, piiDetections);
  const sanitizedDom = sanitizeDOM(domSkeleton, piiDetections);

  latestSanitizedData = {
    image: redactedImage,
    dom: sanitizedDom,
    manifest
  };

  // 5. Send overlay command to tab
  await chrome.tabs.sendMessage(tabId, {
    type: 'RENDER_OVERLAY',
    detections: piiDetections
  }).catch(() => console.log('[PrivacyLens] Overlay script not ready.'));

  return { message: `Detected ${piiDetections.length} PII items.` };
}

async function handleSendToServer(task) {
  if (!latestSanitizedData) throw new Error('No sanitized data available. Analyze first.');
  
  const payload = {
    task,
    context: latestSanitizedData
  };

  console.log('[PrivacyLens] Sending payload to server...');
  const res = await fetch(SERVER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) throw new Error('Server returned ' + res.status);
  const data = await res.json();
  
  // If server returns actions, execute them
  if (data.actions && data.actions.length > 0) {
    const tabs = await chrome.tabs.query({active: true, currentWindow: true});
    if (tabs.length > 0) {
      chrome.tabs.sendMessage(tabs[0].id, {
        type: 'EXECUTE_ACTION',
        actions: data.actions
      });
    }
  }

  return { success: true };
}
