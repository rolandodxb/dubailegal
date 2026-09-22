/**
 * Currency formatting, shared by the server and the client.
 *
 * Amounts are held in fils (1/100 of a dirham) as integers everywhere, so no
 * rounding error can ever touch money. This is the only place they become text.
 */
export function formatAed(fils: number): string {
  return new Intl.NumberFormat('en-AE', {
    style: 'currency',
    currency: 'AED',
    minimumFractionDigits: 2,
  }).format(fils / 100);
}

/**
 * Card handling, shared by the simulated card form and by the server.
 *
 * Nothing here talks to a payment processor — there is not one. These helpers
 * exist so the card form can be filled in the way a real one is, and so the only
 * four digits ever kept are the last four.
 */

/** Everything that is not a digit, removed. */
export function digitsOnly(value: string): string {
  return value.replace(/\D+/g, '');
}

/**
 * The brand, from the leading digits. Only used to label the card on the receipt
 * and to decide how many digits a security code has.
 */
export function cardBrandOf(digits: string): string | null {
  if (/^4/.test(digits)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(digits)) return 'Mastercard';
  if (/^3[47]/.test(digits)) return 'American Express';
  if (/^6(?:011|5)/.test(digits)) return 'Discover';
  return null;
}

/**
 * The Luhn check-digit test, which every real card number satisfies. It catches
 * a mistyped digit, which is all it is good for — it says nothing about whether
 * a card exists or has funds.
 */
export function luhnOk(digits: string): boolean {
  if (!/^\d{12,19}$/.test(digits)) return false;
  let sum = 0;
  let double = false;
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number(digits[index]);
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }
  return sum % 10 === 0;
}

/** Grouped the way it is printed on the card: 4-4-4-4, or 4-6-5 for Amex. */
export function groupCardNumber(digits: string): string {
  if (/^3[47]/.test(digits)) {
    return [digits.slice(0, 4), digits.slice(4, 10), digits.slice(10, 15)].filter(Boolean).join(' ');
  }
  return (digits.match(/.{1,4}/g) ?? []).join(' ');
}

/** Keeps an expiry field as MM/YY while it is being typed. */
export function formatExpiryInput(value: string): string {
  const digits = digitsOnly(value).slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

/** The last four digits of a card number. */
export function cardLast4(digits: string): string {
  return digits.slice(-4);
}

/** The last four digits, masked for display. */
export function maskCard(brand: string | null, last4: string | null): string {
  if (!last4) return 'Card';
  return `${brand ? `${brand} ` : ''}•••• ${last4}`;
}

