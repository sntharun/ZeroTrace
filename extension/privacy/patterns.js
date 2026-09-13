/**
 * @fileoverview Patterns and definitions for PII detection.
 */

export const PII_PATTERNS = {
  EMAIL: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
  PHONE_IN: /(?:\+91|0)?[7-9]\d{9}/,
  PHONE_US: /(?:\+1)?\s?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/,
  AADHAAR: /\d{4}\s?\d{4}\s?\d{4}/,
  PAN: /[A-Z]{5}[0-9]{4}[A-Z]{1}/,
  CREDIT_CARD: /(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13})/,
  SSN: /\d{3}-\d{2}-\d{4}/,
  IP_ADDRESS: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/,
};

export const SENSITIVE_FIELD_NAMES = [
  'ssn', 'aadhaar', 'pan', 'phone', 'mobile', 'dob', 'birth', 'credit.card', 'cvv', 'account', 'routing'
];

export const SENSITIVE_AUTOCOMPLETE_VALUES = [
  'cc-number', 'cc-csc', 'cc-exp', 'bday', 'tel', 'email'
];

export const SENSITIVE_LABEL_KEYWORDS = [
  'social security', 'password', 'credit card', 'cvv', 'aadhaar', 'pan card'
];

export const REDACTION_METHODS = {
  PASSWORD: 'solid_black',
  EMAIL: 'label_overlay',
  PHONE_IN: 'label_overlay',
  PHONE_US: 'label_overlay',
  AADHAAR: 'label_overlay',
  PAN: 'label_overlay',
  CREDIT_CARD: 'label_overlay',
  SSN: 'label_overlay',
  FACE: 'blur',
  GENERIC: 'semi_transparent_black'
};
