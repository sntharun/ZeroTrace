/**
 * @fileoverview Manages visual overlays for detections and redactions with accurate element tracking.
 */

(function() {
  if (window.__privacyLensOverlayInitialized) {
    return;
  }
  window.__privacyLensOverlayInitialized = true;

  let overlayContainer = null;
  let activeDetections = [];
  let isOverlayVisible = true;

  function getOrCreateOverlayContainer() {
    // Clean up duplicate overlay containers if any were created previously
    const existingRoots = document.querySelectorAll('#privacylens-overlay-root');
    if (existingRoots.length > 1) {
      for (let i = 1; i < existingRoots.length; i++) {
        existingRoots[i].remove();
      }
    }

    let container = document.getElementById('privacylens-overlay-root');
    if (!container) {
      container = document.createElement('div');
      container.id = 'privacylens-overlay-root';
      container.style.position = 'absolute';
      container.style.top = '0';
      container.style.left = '0';
      container.style.width = '100%';
      container.style.minHeight = '100%';
      container.style.pointerEvents = 'none';
      container.style.zIndex = '2147483647';
      container.style.overflow = 'visible';
      (document.body || document.documentElement).appendChild(container);
    }
    overlayContainer = container;
    return overlayContainer;
  }

  function renderMasks() {
    const container = getOrCreateOverlayContainer();
    container.innerHTML = '';
    
    if (!activeDetections || activeDetections.length === 0) {
      return;
    }

    // 1. Render Floating Status Pill (Allows user to toggle mask on/off directly on the page)
    const pill = document.createElement('div');
    pill.id = 'privacylens-status-pill';
    pill.style.position = 'fixed';
    pill.style.top = '16px';
    pill.style.right = '16px';
    pill.style.background = isOverlayVisible
      ? 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)'
      : 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)';
    pill.style.border = isOverlayVisible ? '1.5px solid #6366f1' : '1.5px solid #f59e0b';
    pill.style.boxShadow = isOverlayVisible
      ? '0 8px 24px rgba(99, 102, 241, 0.35)'
      : '0 8px 24px rgba(245, 158, 11, 0.25)';
    pill.style.borderRadius = '24px';
    pill.style.padding = '8px 16px';
    pill.style.color = '#ffffff';
    pill.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    pill.style.fontSize = '12px';
    pill.style.fontWeight = '600';
    pill.style.display = 'flex';
    pill.style.alignItems = 'center';
    pill.style.gap = '8px';
    pill.style.pointerEvents = 'auto';
    pill.style.cursor = 'pointer';
    pill.style.zIndex = '2147483647';
    pill.style.backdropFilter = 'blur(10px)';
    pill.style.userSelect = 'none';
    pill.style.transition = 'all 0.2s ease';

    const dotColor = isOverlayVisible ? '#10b981' : '#f59e0b';
    const labelText = isOverlayVisible
      ? `🛡️ PrivacyLens: <strong>${activeDetections.length}</strong> items masked`
      : `🛡️ PrivacyLens: <strong>Masks Hidden</strong> (${activeDetections.length} items detected)`;
    const actionBadge = isOverlayVisible
      ? `<span style="font-size:10px; background:rgba(99,102,241,0.3); padding:2px 8px; border-radius:10px; border:1px solid rgba(255,255,255,0.2); margin-left:4px;">👁️ Click to Unmask</span>`
      : `<span style="font-size:10px; background:rgba(245,158,11,0.3); color:#fde68a; padding:2px 8px; border-radius:10px; border:1px solid rgba(245,158,11,0.4); margin-left:4px;">🔒 Click to Redact</span>`;

    pill.innerHTML = `
      <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${dotColor}; box-shadow:0 0 8px ${dotColor};"></span>
      <span>${labelText}</span>
      ${actionBadge}
    `;

    pill.addEventListener('click', (e) => {
      e.stopPropagation();
      isOverlayVisible = !isOverlayVisible;
      renderMasks();
    });
    container.appendChild(pill);

    // If unmasked / hidden, do not render mask boxes
    if (!isOverlayVisible) {
      return;
    }

    // 2. Render Redaction Overlays for each detection
    activeDetections.forEach(det => {
      let top = 0;
      let left = 0;
      let width = 0;
      let height = 0;
      let borderRadius = '6px';

      // Find the real DOM element to get pixel-perfect live coordinates
      let targetEl = null;
      if (det.element_id) {
        targetEl = document.querySelector(`[data-privacylens-id="${det.element_id}"]`);
      }

      if (targetEl) {
        const rect = targetEl.getBoundingClientRect();
        // Skip element if it is zero size or completely offscreen
        if (rect.width === 0 || rect.height === 0) return;
        
        left = rect.left + window.scrollX;
        top = rect.top + window.scrollY;
        width = rect.width;
        height = rect.height;

        const computedStyle = window.getComputedStyle(targetEl);
        if (computedStyle.borderRadius && computedStyle.borderRadius !== '0px') {
          borderRadius = computedStyle.borderRadius;
        }
      } else if (det.bbox) {
        left = (det.bbox.docX !== undefined ? det.bbox.docX : (det.bbox.x + window.scrollX));
        top = (det.bbox.docY !== undefined ? det.bbox.docY : (det.bbox.y + window.scrollY));
        width = det.bbox.width;
        height = det.bbox.height;
      } else {
        return;
      }

      const box = document.createElement('div');
      box.className = 'privacylens-mask-item';
      box.style.position = 'absolute';
      box.style.left = `${left}px`;
      box.style.top = `${top}px`;
      box.style.width = `${width}px`;
      box.style.height = `${height}px`;
      box.style.borderRadius = borderRadius;
      box.style.pointerEvents = 'none';
      box.style.zIndex = '2147483646';
      box.style.transition = 'all 0.15s ease-out';
      box.style.boxSizing = 'border-box';
      box.style.display = 'flex';
      box.style.alignItems = 'center';
      box.style.justifyContent = 'center';
      box.style.textAlign = 'center';
      box.style.padding = '2px 6px';
      box.style.overflow = 'hidden';

      const isFace = det.type === 'FACE' || det.tag === 'img';
      const isSecret = det.type === 'PASSWORD' || det.type === 'CVV' || det.type === 'TPIN' || det.type === 'PIN' || det.type === 'OTP' || det.type === 'SECRET';

      if (isFace) {
        box.style.backgroundColor = 'rgba(15, 23, 42, 0.75)';
        box.style.border = '2px solid #8b5cf6';
        box.style.backdropFilter = 'blur(12px)';
        box.style.boxShadow = '0 0 16px rgba(139, 92, 246, 0.4)';
        box.style.color = '#e0e7ff';
        box.style.fontSize = '11px';
        box.style.fontWeight = '700';
        box.innerHTML = `<span style="background:rgba(0,0,0,0.6); padding:3px 6px; border-radius:4px; letter-spacing:0.5px;">🔒 FACE BLURRED</span>`;
      } else if (isSecret) {
        box.style.backgroundColor = '#090d16';
        box.style.border = '2px solid #ef4444';
        box.style.boxShadow = '0 0 12px rgba(239, 68, 68, 0.5)';
        box.style.color = '#f87171';
        box.style.fontSize = '11px';
        box.style.fontWeight = '800';
        box.style.letterSpacing = '1px';
        box.innerHTML = `🔒 [${det.type} REDACTED]`;
      } else {
        box.style.backgroundColor = 'rgba(15, 23, 42, 0.88)';
        box.style.border = '1.5px solid #3b82f6';
        box.style.boxShadow = '0 0 10px rgba(59, 130, 246, 0.35)';
        box.style.backdropFilter = 'blur(6px)';
        box.style.color = '#93c5fd';
        box.style.fontSize = '10px';
        box.style.fontWeight = '700';
        const displayLabel = (det.type || 'PII').replace(/_/g, ' ');
        box.innerHTML = `🔒 ${displayLabel}`;
      }

      container.appendChild(box);
    });
  }

  // Keep overlays positioned on resize and scroll
  window.addEventListener('resize', () => {
    if (activeDetections.length > 0 && isOverlayVisible) renderMasks();
  }, { passive: true });

  window.addEventListener('scroll', () => {
    if (activeDetections.length > 0 && isOverlayVisible) renderMasks();
  }, { passive: true });

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'RENDER_OVERLAY') {
      activeDetections = msg.detections || [];
      isOverlayVisible = msg.visible !== undefined ? msg.visible : true;
      renderMasks();
      sendResponse({ success: true, count: activeDetections.length, visible: isOverlayVisible });
    } else if (msg.type === 'TOGGLE_OVERLAY') {
      isOverlayVisible = msg.visible !== undefined ? msg.visible : !isOverlayVisible;
      renderMasks();
      sendResponse({ success: true, visible: isOverlayVisible, count: activeDetections.length });
    } else if (msg.type === 'GET_OVERLAY_STATE') {
      sendResponse({ success: true, visible: isOverlayVisible, count: activeDetections.length });
    } else if (msg.type === 'CLEAR_OVERLAY') {
      activeDetections = [];
      isOverlayVisible = true;
      renderMasks();
      sendResponse({ success: true });
    }
  });
})();


