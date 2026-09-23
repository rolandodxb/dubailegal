/** Presentation helpers. Pure functions, no I/O. */

/** The BCP-47 tag each language is formatted with. Display only. */
const LOCALE_TAG: Record<string, string> = { en: 'en-GB', es: 'es-ES' };

export function calculateAge(dateOfBirth: Date | null | undefined, now = new Date()): number | null {
  if (!dateOfBirth) return null;
  let age = now.getUTCFullYear() - dateOfBirth.getUTCFullYear();
  const monthDelta = now.getUTCMonth() - dateOfBirth.getUTCMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getUTCDate() < dateOfBirth.getUTCDate())) {
    age -= 1;
  }
  if (age < 0 || age > 130) return null;
  return age;
}

export function formatDate(value: Date | null | undefined, locale = 'en'): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat(LOCALE_TAG[locale] ?? 'en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(value);
}

export function formatDateTime(value: Date | null | undefined, locale = 'en'): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat(LOCALE_TAG[locale] ?? 'en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(value);
}

/** Converts an HTML date input value (YYYY-MM-DD) to a UTC-midnight Date. */
export function parseDateInput(value: string | null | undefined): Date | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const parsed = new Date(`${trimmed}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Converts a Date to the YYYY-MM-DD string an <input type="date"> expects. */
export function toDateInputValue(value: Date | null | undefined): string {
  if (!value) return '';
  return value.toISOString().slice(0, 10);
}

export function initials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((part) => part.length > 0);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Rejects anything that is not an http(s) URL. Used before rendering
 * user-supplied website fields as links.
 */
export function safeExternalUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.toString();
  } catch {
    return null;
  }
}
