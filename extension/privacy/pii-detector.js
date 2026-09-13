/**
 * @fileoverview PII Detector combining DOM heuristics, RegEx patterns, and ML Vision.
 */

import { PII_PATTERNS, REDACTION_METHODS } from './patterns.js';

/**
 * Detects PII in a given DOM skeleton and screenshot.
 * @param {Object} domSkeleton - Extracted from dom-analyzer
 * @param {string} screenshotDataUrl - Base64 image
 * @returns {Array<Object>} List of PII detections
 */
export async function detectPII(domSkeleton, screenshotDataUrl) {
  const detections = [];
  const seenIds = new Set();
  
  // Layer 1: DOM Sensitive Elements (Inputs, Images, Text)
  (domSkeleton.sensitiveElements || []).forEach(el => {
    const rawReason = el.sensitivityReason ? el.sensitivityReason.toUpperCase() : 'SENSITIVE_FIELD';
    const redactionMethod = REDACTION_METHODS[rawReason] || (rawReason === 'FACE' ? 'blur' : 'label_overlay');
    
    detections.push({
      type: rawReason,
      value: el.text || el.value || '',
      bbox: el.bbox,
      confidence: 0.95,
      source_layer: 'dom_heuristic',
      element_id: el.element_id,
      tag: el.tag,
      redaction_method: redactionMethod
    });
    seenIds.add(el.element_id);
  });

  // Layer 2: Text Pattern Matching (RegEx on remaining elements)
  (domSkeleton.elements || []).forEach(el => {
    if (seenIds.has(el.element_id) || !el.text) return;
    
    for (const [piiType, regex] of Object.entries(PII_PATTERNS)) {
      if (regex.test(el.text)) {
        detections.push({
          type: piiType,
          value: el.text,
          bbox: el.bbox,
          confidence: 0.88,
          source_layer: 'regex_pattern',
          element_id: el.element_id,
          tag: el.tag,
          redaction_method: REDACTION_METHODS[piiType] || 'label_overlay'
        });
        seenIds.add(el.element_id);
        break;
      }
    }
  });

  return detections;
}

