/**
 * International Phone Number Validator
 * Supports common international formats
 */

export interface PhoneValidationResult {
  isValid: boolean;
  formatted: string;
  country?: string;
  error?: string;
}

// Country code mappings
const COUNTRY_CODES: Record<string, { code: string; length: number; pattern?: RegExp }> = {
  US: { code: '+1', length: 10 },
  CA: { code: '+1', length: 10 },
  GB: { code: '+44', length: 10 },
  AU: { code: '+61', length: 9 },
  IN: { code: '+91', length: 10 },
  DE: { code: '+49', length: 9 },
  FR: { code: '+33', length: 9 },
  JP: { code: '+81', length: 10 },
  CN: { code: '+86', length: 11 },
  BR: { code: '+55', length: 11 },
};

/**
 * Validates and formats international phone numbers
 * Accepts: 1234567890, +11234567890, +1 123-456-7890, (123) 456-7890
 */
export function validatePhoneNumber(phoneInput: string): PhoneValidationResult {
  // Remove all non-numeric characters except leading +
  let cleaned = phoneInput.trim().replace(/[^0-9+]/g, '');

  // Handle case where + might be in the middle
  if (cleaned.includes('+')) {
    cleaned = '+' + cleaned.replace(/\+/g, '');
  }

  // Minimum length check (at least 10 digits)
  const digitsOnly = cleaned.replace(/\D/g, '');
  if (digitsOnly.length < 10) {
    return {
      isValid: false,
      formatted: phoneInput,
      error: 'Phone number must have at least 10 digits',
    };
  }

  // Maximum length check (at most 15 digits per E.164 standard)
  if (digitsOnly.length > 15) {
    return {
      isValid: false,
      formatted: phoneInput,
      error: 'Phone number cannot exceed 15 digits',
    };
  }

  // Try to detect country and validate
  let formatted = cleaned;
  let country = 'Unknown';

  // If starts with +, it's E.164 format
  if (cleaned.startsWith('+')) {
    // Find matching country
    for (const [cc, info] of Object.entries(COUNTRY_CODES)) {
      if (cleaned.startsWith(info.code)) {
        const numberPart = cleaned.substring(info.code.length);
        if (numberPart.length >= info.length - 1 && numberPart.length <= info.length + 1) {
          country = cc;
          formatted = `${info.code} ${numberPart}`;
          break;
        }
      }
    }
  } else if (digitsOnly.length === 10) {
    // Assume US/Canada
    country = 'US';
    formatted = `+1 ${digitsOnly}`;
  } else if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
    // US with leading 1
    country = 'US';
    formatted = `+1 ${digitsOnly.substring(1)}`;
  } else if (digitsOnly.length === 11) {
    // Could be CN, BR, etc
    country = 'Unknown';
    formatted = `+${digitsOnly}`;
  }

  return {
    isValid: true,
    formatted,
    country: country !== 'Unknown' ? country : undefined,
  };
}

/**
 * Quick validation for form input
 * Returns true/false only
 */
export function isValidPhone(phoneInput: string): boolean {
  const result = validatePhoneNumber(phoneInput);
  return result.isValid;
}

/**
 * Get formatted phone number string
 */
export function formatPhoneNumber(phoneInput: string): string {
  const result = validatePhoneNumber(phoneInput);
  return result.formatted;
}

/**
 * Get error message if invalid
 */
export function getPhoneError(phoneInput: string): string | null {
  const result = validatePhoneNumber(phoneInput);
  return result.error || null;
}
