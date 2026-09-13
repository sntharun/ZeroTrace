/**
 * @fileoverview Sanitizes DOM payload before sending to server.
 */

/**
 * Replaces sensitive values in DOM structure with redaction markers.
 * @param {Object} domSkeleton 
 * @param {Array<Object>} detections 
 * @returns {Object} Sanitized DOM skeleton
 */
export function sanitizeDOM(domSkeleton, detections) {
  const sanitized = JSON.parse(JSON.stringify(domSkeleton)); // Deep copy
  
  const detectionMap = new Map();
  detections.forEach(d => {
    if (d.element_id) {
      detectionMap.set(d.element_id, d.type);
    }
  });

  sanitized.elements.forEach(el => {
    if (detectionMap.has(el.element_id)) {
      const type = detectionMap.get(el.element_id);
      el.text = `[${type}_REDACTED]`;
      if (el.value) el.value = `[${type}_REDACTED]`;
      el.isRedacted = true;
    }
  });

  return sanitized;
}
