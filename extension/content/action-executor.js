/**
 * @fileoverview Executes actions sent from the server on the DOM.
 */

chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
  if (msg.type === 'EXECUTE_ACTION') {
    console.log('[PrivacyLens] Received actions:', msg.actions);
    await executeSequence(msg.actions);
    sendResponse({ success: true });
  }
});

async function executeSequence(actions) {
  for (const action of actions) {
    await executeAction(action);
    await new Promise(r => setTimeout(r, action.delay || 500));
  }
}

async function executeAction(action) {
  const elementId = action.target?.element_id || action.element_id;
  const selector = action.target?.selector;
  
  let el = null;
  if (elementId) {
    el = document.querySelector(`[data-privacylens-id="${elementId}"]`) || document.getElementById(elementId);
  }
  if (!el && selector) {
    try {
      el = document.querySelector(selector);
    } catch (_) {}
  }

  if (!el) {
    console.warn('[PrivacyLens] Target element not found for action:', action);
    return;
  }

  // Visual feedback
  const originalOutline = el.style.outline;
  el.style.outline = '3px solid #4CAF50';
  setTimeout(() => el.style.outline = originalOutline, 1200);

  switch (action.type) {
    case 'click':
      el.click();
      break;
    case 'type':
      el.focus();
      el.value = action.value || '';
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      break;
    case 'focus':
      el.focus();
      break;
    case 'scroll':
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      break;
    default:
      console.log('[PrivacyLens] Action executed:', action.type);
  }
}
