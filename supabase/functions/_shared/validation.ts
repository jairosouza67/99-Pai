// =============================================================
// Shared validation module for 99-Pai Edge Functions
// Context: Ralph Loop — Etapa 03
// =============================================================

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validate a link code (caregiver-link function).
 * Must be 6 alphanumeric characters.
 */
export function validateLinkCode(linkCode: unknown): ValidationError | null {
  if (typeof linkCode !== 'string') {
    return { field: 'linkCode', message: 'linkCode must be a string' };
  }
  const trimmed = linkCode.trim();
  if (trimmed.length === 0) {
    return { field: 'linkCode', message: 'linkCode is required' };
  }
  if (trimmed.length !== 6) {
    return { field: 'linkCode', message: 'linkCode must be exactly 6 characters' };
  }
  if (!/^[A-Z0-9]+$/i.test(trimmed)) {
    return { field: 'linkCode', message: 'linkCode must contain only letters and numbers' };
  }
  return null;
}

/**
 * Validate a push token (notification-register function).
 * Max 200 characters.
 */
export function validatePushToken(pushToken: unknown): ValidationError | null {
  if (typeof pushToken !== 'string') {
    return { field: 'pushToken', message: 'pushToken must be a string' };
  }
  if (pushToken.trim().length === 0) {
    return { field: 'pushToken', message: 'pushToken is required' };
  }
  if (pushToken.length > 200) {
    return { field: 'pushToken', message: 'pushToken must not exceed 200 characters' };
  }
  return null;
}

/**
 * Validate service request notes.
 * Max 1000 characters.
 */
export function validateServiceNotes(notes: unknown): ValidationError | null {
  if (notes === undefined || notes === null) return null;
  if (typeof notes !== 'string') {
    return { field: 'notes', message: 'notes must be a string' };
  }
  if (notes.length > 1000) {
    return { field: 'notes', message: 'notes must not exceed 1000 characters' };
  }
  return null;
}

/**
 * Validate TTS text input.
 * Max 600 characters, non-empty.
 */
export function validateTtsText(text: unknown): ValidationError | null {
  if (typeof text !== 'string') {
    return { field: 'text', message: 'text must be a string' };
  }
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return { field: 'text', message: 'text is required' };
  }
  if (trimmed.length > 600) {
    return { field: 'text', message: 'text must not exceed 600 characters' };
  }
  return null;
}

/**
 * Validate weather location input.
 * Max 100 characters.
 */
export function validateWeatherLocation(location: unknown): ValidationError | null {
  if (location === undefined || location === null) return null;
  if (typeof location !== 'string') {
    return { field: 'location', message: 'location must be a string' };
  }
  if (location.length > 100) {
    return { field: 'location', message: 'location must not exceed 100 characters' };
  }
  return null;
}
