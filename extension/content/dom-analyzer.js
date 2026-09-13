/**
 * @fileoverview Content script for DOM extraction and PII heuristic detection.
 */

window.__getDomSkeleton = function() {
  const elements = [];
  const sensitiveElements = [];
  let idCounter = 0;

  const interactables = document.querySelectorAll('input, button, a, select, textarea, [role="button"], [role="link"], [role="checkbox"]');
  
  interactables.forEach(el => {
    const rect = el.getBoundingClientRect();
    // Skip invisible elements
    if (rect.width === 0 || rect.height === 0 || rect.top < 0 || rect.left < 0) return;

    const elId = `el_${idCounter++}`;
    el.setAttribute('data-privacylens-id', elId);

    const type = el.tagName.toLowerCase();
    const inputType = el.getAttribute('type') || '';
    const name = el.getAttribute('name') || '';
    const id = el.getAttribute('id') || '';
    const autocomplete = el.getAttribute('autocomplete') || '';
    const textContent = el.innerText || el.value || '';
    
    // Basic heuristics for sensitivity
    let isSensitive = false;
    let sensitivityReason = '';

    if (inputType === 'password') {
      isSensitive = true;
      sensitivityReason = 'password';
    } else if (inputType === 'email' || autocomplete.includes('email')) {
      isSensitive = true;
      sensitivityReason = 'email';
    } else {
      const sensitiveKeywords = ['ssn', 'aadhaar', 'pan', 'phone', 'mobile', 'dob', 'birth', 'credit.card', 'cvv', 'account', 'routing'];
      const combinedAttribs = `${name} ${id} ${autocomplete}`.toLowerCase();
      
      for (const kw of sensitiveKeywords) {
        if (combinedAttribs.includes(kw)) {
          isSensitive = true;
          sensitivityReason = kw;
          break;
        }
      }
    }

    const elementData = {
      element_id: elId,
      tag: type,
      type: inputType,
      name,
      id,
      bbox: { x: rect.left, y: rect.top, width: rect.width, height: rect.height },
      text: textContent,
      isSensitive,
      sensitivityReason
    };

    elements.push(elementData);
    if (isSensitive) sensitiveElements.push(elementData);
  });

  return {
    url: window.location.href,
    title: document.title,
    elements,
    sensitiveElements
  };
};

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'ANALYZE_DOM') {
    sendResponse(window.__getDomSkeleton());
  }
});
