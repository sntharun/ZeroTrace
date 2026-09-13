/**
 * @fileoverview Manages visual overlays for detections and redactions.
 */

let overlayContainer = null;

function createOverlay() {
  if (overlayContainer) return overlayContainer;
  
  overlayContainer = document.createElement('div');
  overlayContainer.id = 'privacylens-overlay';
  overlayContainer.style.position = 'fixed';
  overlayContainer.style.top = '0';
  overlayContainer.style.left = '0';
  overlayContainer.style.width = '100vw';
  overlayContainer.style.height = '100vh';
  overlayContainer.style.pointerEvents = 'none';
  overlayContainer.style.zIndex = '2147483647'; // max z-index
  document.body.appendChild(overlayContainer);
  
  return overlayContainer;
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'RENDER_OVERLAY') {
    const container = createOverlay();
    container.innerHTML = ''; // clear existing
    
    msg.detections.forEach(det => {
      if (!det.bbox) return;
      
      const box = document.createElement('div');
      box.style.position = 'absolute';
      box.style.left = `${det.bbox.x}px`;
      box.style.top = `${det.bbox.y}px`;
      box.style.width = `${det.bbox.width}px`;
      box.style.height = `${det.bbox.height}px`;
      box.style.border = '2px solid rgba(255, 0, 0, 0.7)';
      box.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
      box.style.color = 'white';
      box.style.fontSize = '10px';
      box.style.display = 'flex';
      box.style.alignItems = 'center';
      box.style.justifyContent = 'center';
      box.style.backdropFilter = 'blur(4px)';
      box.textContent = det.type;
      
      container.appendChild(box);
    });
    sendResponse({ success: true });
  }
});
