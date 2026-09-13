/**
 * @fileoverview Text region detection wrapper for ONNX models (EAST/CRAFT).
 */

import { visionPipeline } from './pipeline.js';

export async function detectTextRegions(imageData) {
  try {
    return await visionPipeline.detectTextRegions(imageData);
  } catch (err) {
    console.error('[PrivacyLens] Text detection failed:', err);
    return []; // Graceful fallback
  }
}
