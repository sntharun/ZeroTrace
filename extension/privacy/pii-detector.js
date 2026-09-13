/**
 * @fileoverview PII Detector combining DOM heuristics, RegEx patterns, and ML Vision.
 */

import { PII_PATTERNS, REDACTION_METHODS } from './patterns.js';
// Vision pipeline imports would go here, mock for now to keep it lightweight in background script context

/**
 * Detects PII in a given DOM skeleton and screenshot.
 * @param {Object} domSkeleton - Extracted from dom-analyzer
 * @param {string} screenshotDataUrl - Base64 image
 * @returns {Array<Object>} List of PII detections
 */
export async function detectPII(domSkeleton, screenshotDataUrl) {
  const detections = [];
  
  // Layer 1: DOM Heuristics
  domSkeleton.sensitiveElements.forEach(el => {
    detections.push({
      type: el.sensitivityReason.toUpperCase() || 'SENSITIVE_FIELD',
      value: el.text,
      bbox: el.bbox,
      confidence: 0.9,
      source_layer: 'dom_heuristic',
      element_id: el.element_id,
      redaction_method: REDACTION_METHODS[el.sensitivityReason.toUpperCase()] || 'solid_black'
    });
  });

  // Layer 2: Text Pattern Matching (RegEx on text contents of elements)
  domSkeleton.elements.forEach(el => {
    if (!el.text) return;
    
    for (const [piiType, regex] of Object.entries(PII_PATTERNS)) {
      if (regex.test(el.text)) {
        // Avoid duplicates if already caught by DOM heuristics
        if (!detections.find(d => d.element_id === el.element_id && d.type === piiType)) {
          detections.push({
            type: piiType,
            value: el.text,
            bbox: el.bbox,
            confidence: 0.8,
            source_layer: 'regex_pattern',
            element_id: el.element_id,
            redaction_method: REDACTION_METHODS[piiType] || 'solid_black'
          });
        }
      }
    }
  });

  // Layer 3: Vision (Mock for this setup, would process screenshotDataUrl)
  // e.g., faces, raw text blocks not in standard DOM nodes

  return detections;
}
