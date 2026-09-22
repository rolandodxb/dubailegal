/**
 * Emirates ID handling.
 *
 * Structure: 784-YYYY-NNNNNNN-C  (15 digits)
 *   784      UAE country code, always.
 *   YYYY     An identification block assigned by the ICP. It is *not* a birth
 *            year, despite being widely described as one, so it is never
 *            validated as a date.
 *   NNNNNNN  7-digit sequence.
 *   C        Check digit.
 *
 * The check-digit test is the Luhn variant used for Emirates IDs. It is
 * deliberately advisory: a mismatch is surfaced to the reviewer rather than
 * blocking the user, because the number is always confirmed by a human against
 * the uploaded document.
 */

const EMIRATES_ID_PATTERN = /^784\d{12}$/;

/** Strips formatting and returns bare digits, or null if the input is unusable. */
export function normaliseEmiratesId(input: string): string | null {
  const digits = input.replace(/[\s-]/g, '');
  if (!/^\d+$/.test(digits)) return null;
  return digits;
}

/** True when the value has the exact 15-digit 784-prefixed structure. */
export function hasValidEmiratesIdFormat(input: string): boolean {
  const digits = normaliseEmiratesId(input);
  return digits !== null && EMIRATES_ID_PATTERN.test(digits);
}

/** 784-YYYY-NNNNNNN-C */
export function formatEmiratesId(input: string): string {
  const digits = normaliseEmiratesId(input);
  if (!digits || digits.length !== 15) return input;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 14)}-${digits.slice(14)}`;
}

/**
 * Computes the check digit for the first 14 digits, returning a single digit.
 * Returns null when the input is not 15 clean digits.
 */
export function computeCheckDigit(input: string): number | null {
  const digits = normaliseEmiratesId(input);
  if (!digits || digits.length !== 15) return null;

  let sum = 0;
  let double = true;
  // Walk the 14 payload digits right-to-left, doubling every other one.
  for (let index = 13; index >= 0; index -= 1) {
    let value = Number.parseInt(digits[index], 10);
    if (double) {
      value *= 2;
      if (value > 9) value -= 9;
    }
    sum += value;
    double = !double;
  }
  return (sum * 9) % 10;
}

/**
 * True when the trailing digit matches the computed check digit.
 * Returns null when the number cannot be tested (bad length or non-digits).
 */
export function emiratesIdCheckDigitMatches(input: string): boolean | null {
  const digits = normaliseEmiratesId(input);
  if (!digits || !EMIRATES_ID_PATTERN.test(digits)) return null;
  const expected = computeCheckDigit(digits);
  if (expected === null) return null;
  return expected === Number.parseInt(digits[14], 10);
}

/**
 * Masked for display anywhere the owner is not the reviewer — keeps the country
 * code and the last 4 digits so a person can recognise their own number.
 */
export function maskEmiratesId(input: string): string {
  const digits = normaliseEmiratesId(input);
  if (!digits || digits.length !== 15) return '—';
  return `${digits.slice(0, 3)}-••••-•••${digits.slice(11, 14)}-•`;
}

/** Cheap structural hint shown while typing, before full validation. */
export function emiratesIdInputHint(input: string): string | null {
  const digits = normaliseEmiratesId(input);
  if (digits === null) return 'Use digits only, for example 784-1990-1234567-1.';
  if (digits.length < 15) return `${digits.length} of 15 digits entered.`;
  if (digits.length > 15) return 'An Emirates ID has exactly 15 digits.';
  if (!digits.startsWith('784')) return 'A UAE Emirates ID always starts with 784.';
  return null;
}
