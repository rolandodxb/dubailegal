/**
 * UAE calendar arithmetic.
 *
 * The United Arab Emirates observes UTC+04:00 all year with no daylight saving,
 * so a fixed offset is exact rather than an approximation. Instants are stored
 * in UTC; everything a person sees or picks is converted through here so that
 * "09:00" always means 09:00 in the UAE, whatever the server's own timezone is.
 */

export const UAE_UTC_OFFSET_HOURS = 4;

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** The UAE calendar date (YYYY-MM-DD) an instant falls on. */
export function toUaeDateKey(instant: Date): string {
  const shifted = new Date(instant.getTime() + UAE_UTC_OFFSET_HOURS * MS_PER_HOUR);
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`;
}

/** Today's date key in the UAE. */
export function todayKey(): string {
  return toUaeDateKey(new Date());
}

export type DateParts = { year: number; month: number; day: number };

export function parseDateKey(key: string): DateParts {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) throw new Error(`Invalid date key: ${key}`);
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

/**
 * Converts a UAE wall-clock date and hour into the UTC instant to store.
 * 09:00 on 1 March in Dubai becomes 05:00Z on 1 March.
 */
export function fromUaeDateTime(dateKey: string, hour: number, minute = 0): Date {
  const { year, month, day } = parseDateKey(dateKey);
  return new Date(Date.UTC(year, month - 1, day, hour - UAE_UTC_OFFSET_HOURS, minute, 0, 0));
}

/** Same instant, expressed as the UAE wall-clock hour (may be fractional minutes). */
export function toUaeHour(instant: Date): number {
  const shifted = new Date(instant.getTime() + UAE_UTC_OFFSET_HOURS * MS_PER_HOUR);
  return shifted.getUTCHours();
}

export function formatUaeTime(instant: Date): string {
  const shifted = new Date(instant.getTime() + UAE_UTC_OFFSET_HOURS * MS_PER_HOUR);
  return `${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}`;
}

export function formatUaeDate(instant: Date): string {
  const shifted = new Date(instant.getTime() + UAE_UTC_OFFSET_HOURS * MS_PER_HOUR);
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(shifted);
}

export function formatUaeDateTime(instant: Date): string {
  return `${formatUaeDate(instant)} at ${formatUaeTime(instant)}`;
}

/** Formats a date key such as 2026-03-01 for display. */
export function formatDateKey(key: string): string {
  const { year, month, day } = parseDateKey(key);
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function formatDateKeyShort(key: string): string {
  const { year, month, day } = parseDateKey(key);
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function addDaysToKey(key: string, days: number): string {
  const { year, month, day } = parseDateKey(key);
  const shifted = new Date(Date.UTC(year, month - 1, day) + days * MS_PER_DAY);
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`;
}

export function addMonthsToKey(key: string, months: number): string {
  const { year, month, day } = parseDateKey(key);
  const shifted = new Date(Date.UTC(year, month - 1 + months, day));
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`;
}

/** Monday-based start of the week containing `key`. */
export function startOfWeekKey(key: string): string {
  const { year, month, day } = parseDateKey(key);
  const date = new Date(Date.UTC(year, month - 1, day));
  const weekday = date.getUTCDay(); // 0 = Sunday
  const backToMonday = weekday === 0 ? 6 : weekday - 1;
  return addDaysToKey(key, -backToMonday);
}

export function weekKeysFrom(startKey: string): string[] {
  return Array.from({ length: 7 }, (_, index) => addDaysToKey(startKey, index));
}

export function monthLabel(key: string): string {
  const { year, month } = parseDateKey(key);
  return new Intl.DateTimeFormat('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

/** Six Monday-aligned weeks covering the month, for a month grid. */
export function monthGridKeys(anchorKey: string): string[] {
  const { year, month } = parseDateKey(anchorKey);
  const firstOfMonth = `${year}-${pad(month)}-01`;
  const gridStart = startOfWeekKey(firstOfMonth);
  return Array.from({ length: 42 }, (_, index) => addDaysToKey(gridStart, index));
}

export function isSameMonth(key: string, anchorKey: string): boolean {
  const a = parseDateKey(key);
  const b = parseDateKey(anchorKey);
  return a.year === b.year && a.month === b.month;
}

/** "09:00" for an hour integer. */
export function hourLabel(hour: number): string {
  return `${pad(hour)}:00`;
}

/** "just now", "12 minutes ago", "3 hours ago" — for live situations. */
export function minutesLabel(instant: Date): string {
  const seconds = Math.max(0, Math.round((Date.now() - instant.getTime()) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.round(minutes / 60);
  return `${hours} hour${hours === 1 ? '' : 's'} ago`;
}
