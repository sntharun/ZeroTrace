/**
 * @fileoverview Redacts sensitive information from screenshots via OffscreenCanvas API.
 */

function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  const chunkSize = 8192;
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
    binary += String.fromCharCode.apply(null, chunk);
  }
  return btoa(binary);
}

/**
 * Applies redaction masks to an image based on PII detections.
 * @param {string} dataUrl - Base64 image
 * @param {Array<Object>} detections - PII detections with bboxes
 * @param {Object} [viewport] - Viewport dimensions and DPR
 * @returns {Promise<Object>} { redactedImage: string, manifest: Array }
 */
export async function redactImage(dataUrl, detections, viewport = { width: 1280, height: 800, dpr: 1 }) {
  console.log('[PrivacyLens] Redacting screenshot for', detections.length, 'PII regions.');

  const manifest = detections.map(d => ({
    type: d.type,
    bbox: d.bbox,
    method: d.redaction_method
  }));

  try {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const bitmap = await createImageBitmap(blob);

    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext('2d');
    
    // Draw original captured screen
    ctx.drawImage(bitmap, 0, 0);

    const scaleX = bitmap.width / (viewport.width || bitmap.width);
    const scaleY = bitmap.height / (viewport.height || bitmap.height);

    // Apply redactions onto the canvas image
    detections.forEach(det => {
      if (!det.bbox) return;

      const x = (det.bbox.x !== undefined ? det.bbox.x : (det.bbox.x1 || 0)) * scaleX;
      const y = (det.bbox.y !== undefined ? det.bbox.y : (det.bbox.y1 || 0)) * scaleY;
      const w = (det.bbox.width !== undefined ? det.bbox.width : ((det.bbox.x2 || 0) - (det.bbox.x1 || 0))) * scaleX;
      const h = (det.bbox.height !== undefined ? det.bbox.height : ((det.bbox.y2 || 0) - (det.bbox.y1 || 0))) * scaleY;

      if (w <= 0 || h <= 0) return;

      const isFace = det.type === 'FACE' || det.tag === 'img';
      const isPassword = det.type === 'PASSWORD' || det.type === 'CVV' || det.type === 'PIN' || det.type === 'OTP' || det.type === 'TPIN' || det.type === 'SECRET';

      if (isFace) {
        // Blur / solid privacy fill for face
        ctx.fillStyle = '#1e1b4b';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = '#8b5cf6';
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, w, h);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText('🔒 [FACE REDACTED]', x + Math.max(4, w / 2 - 60), y + h / 2 + 4);
      } else if (isPassword) {
        // Solid black redaction
        ctx.fillStyle = '#000000';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);
      } else {
        // Label overlay redaction
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x, y, w, h);

        ctx.fillStyle = '#93c5fd';
        const fontSize = Math.min(13, Math.max(9, Math.floor(h * 0.5)));
        ctx.font = `bold ${fontSize}px sans-serif`;
        const labelText = `🔒 [${det.type}]`;
        ctx.fillText(labelText, x + 6, y + h / 2 + fontSize / 3);
      }
    });

    const redactedBlob = await canvas.convertToBlob({ type: 'image/png' });
    const buffer = await redactedBlob.arrayBuffer();
    const redactedBase64 = 'data:image/png;base64,' + arrayBufferToBase64(buffer);

    return {
      redactedImage: redactedBase64,
      manifest
    };
  } catch (err) {
    console.warn('[PrivacyLens] OffscreenCanvas redaction fallback:', err);
    return {
      redactedImage: dataUrl,
      manifest
    };
  }
}

