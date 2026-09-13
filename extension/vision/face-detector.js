/**
 * @fileoverview Face detection wrapper for ONNX BlazeFace.
 */

import { visionPipeline } from './pipeline.js';

export async function detectFaces(imageData) {
  try {
    return await visionPipeline.detectFaces(imageData);
  } catch (err) {
    console.error('[PrivacyLens] Face detection failed:', err);
    return []; // Graceful fallback
  }
}
