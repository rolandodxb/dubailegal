import { formatUaeDateTime } from '@/lib/time';
import type { Locale } from './locales';
import { notificationsEsPatterns } from './dict/notifications';

/**
 * Renders a stored alert in the reader's language.
 *
 * An alert is written once, in English, at the moment something happens — and
 * with no request context, so it is stored that way. Every date inside it was
 * wrapped as `{{iso}}` at composition time; the words around it are rebuilt from
 * the catalogue here, where the reader's language is known.
 *
 * English is rebuilt byte for byte: each `{{iso}}` goes straight back to the same
 * "Wed, 23 Sept 2026 at 04:59" the service used to store, so the English build and
 * the existing test suite are untouched. A sentence the catalogue does not know is
 * returned with its date in the reader's language and its words in English — a
 * visible gap, never a wrong word.
 */
export function notificationText(locale: Locale | undefined, raw: string): string {
  if (locale !== 'es') return fillDates(raw, 'en');

  for (const pattern of PATTERNS) {
    const captured = pattern.regex.exec(raw);
    if (captured === null) continue;

    // The template's placeholders are numbered in appearance order, while the
    // Spanish may use them in a different order and more than once, so map
    // number -> value. A value that arrived wrapped in `{{...}}` is a date and is
    // formatted for the reader; everything else is a name, reference or amount and
    // is pasted through as it stands.
    const values: Record<string, string> = {};
    pattern.order.forEach((number, index) => {
      values[number] = formatValue(captured[index + 1] ?? '', 'es');
    });

    return pattern.es.replace(/\{(\d+)\}/g, (whole, digits: string) =>
      digits in values ? values[digits]! : whole,
    );
  }

  return fillDates(raw, 'es');
}

/** A date token as it is stored: `{{2026-09-23T00:59:00.000Z}}`. */
const DATE_TOKEN = /\{\{(.*?)\}\}/g;

/** Replaces every stored date token with the reader's local date and time. */
function fillDates(raw: string, locale: Locale): string {
  return raw.replace(DATE_TOKEN, (_whole, iso: string) => formatDate(iso, locale));
}

/** Formats one captured value, leaving anything that is not a date untouched. */
function formatValue(value: string, locale: Locale): string {
  const date = /^\{\{(.*?)\}\}$/.exec(value);
  return date ? formatDate(date[1]!, locale) : value;
}

function formatDate(iso: string, locale: Locale): string {
  const instant = new Date(iso);
  // A stored date that will not parse is left as it was written rather than
  // rendered as "Invalid Date".
  if (Number.isNaN(instant.getTime())) return `{{${iso}}}`;
  return formatUaeDateTime(instant, locale);
}

type CompiledPattern = { regex: RegExp; order: number[]; es: string };

/** Escapes the literal parts of a template so they are matched, not interpreted. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Builds a whole-sentence matcher from a template such as `Meeting booked for {0}`.
 *
 * Each `{n}` becomes a non-greedy capture, so it takes the shortest run of
 * characters that still lets the rest of the template match. `order` records which
 * placeholder number each capture belongs to. A stored date arrives as `{{iso}}`,
 * which the capture takes whole; `formatValue` unwraps it.
 */
function compile(entry: (typeof notificationsEsPatterns)[number]): CompiledPattern {
  const parts = entry.match.split(/\{(\d+)\}/g);
  const order: number[] = [];
  let source = '^';
  parts.forEach((part, index) => {
    if (index % 2 === 0) {
      source += escapeRegExp(part);
    } else {
      source += '(.*?)';
      order.push(Number(part));
    }
  });
  source += '$';
  return { regex: new RegExp(source, 's'), order, es: entry.es };
}

/** Compiled once at module load; the list is long but frozen. */
const PATTERNS: CompiledPattern[] = notificationsEsPatterns.map(compile);
