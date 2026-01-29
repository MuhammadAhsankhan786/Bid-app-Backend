/**
 * Phone Number Utilities for Iraq Format
 * Normalizes and validates Iraq phone numbers
 */

/**
 * Normalize Iraq phone number
 * Supports: +964, 964, 00964, or leading 0 (e.g., 07701234567)
 * Removes spaces, hyphens, and other non-numeric characters except +
 * 
 * @param {string} phone - Phone number to normalize
 * @returns {string|null} - Normalized phone number or null if invalid format
 */
export function normalizeIraqPhone(phone) {
  if (!phone) return null;

  // Remove all non-numeric characters (allow + at start)
  let cleaned = phone.replace(/[^0-9+]/g, '');

  // Fix double +964 issue (e.g., +964964770091400 → +9647700914000)
  if (cleaned.startsWith('+964964')) {
    cleaned = '+964' + cleaned.substring(7); // Remove '+964964' (7 chars), keep rest
  }
  // If starts with 00964, replace with +964 (check this FIRST before checking single 0)
  else if (cleaned.startsWith('00964')) {
    cleaned = '+964' + cleaned.substring(5); // Remove '00964' (5 chars), keep rest
  }
  // If starts with 0, replace with +964 (e.g., 07701234567 → +9647701234567)
  else if (cleaned.startsWith('0')) {
    cleaned = '+964' + cleaned.substring(1);
  }
  // If starts with 964, add +
  else if (cleaned.startsWith('964')) {
    cleaned = '+' + cleaned;
  }
  // If doesn't start with +964, return null
  else if (!cleaned.startsWith('+964')) {
    return null;
  }

  return cleaned;
}

/**
 * Validate Iraq phone number
 * Must start with +964, 964, 00964, or 0
 * Format: +964 followed by 9-10 digits
 * 
 * @param {string} phone - Phone number to validate (can have spaces/formatting)
 * @returns {boolean} - True if valid Iraq phone format
 */
export function isValidIraqPhone(phone) {
  const normalized = normalizeIraqPhone(phone);
  if (!normalized) return false;

  // Iraq phone format: +964 followed by 9-10 digits
  const phoneRegex = /^\+964[0-9]{9,10}$/;
  return phoneRegex.test(normalized);
}

/**
 * Sanitize phone number for storage
 * Normalizes the phone and returns the clean version
 * 
 * @param {string} phone - Phone number to sanitize
 * @returns {string|null} - Sanitized phone number or null if invalid
 */
export function sanitizePhone(phone) {
  return normalizeIraqPhone(phone);
}

