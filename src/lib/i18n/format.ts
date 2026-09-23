import type { Dictionary } from './en';

/**
 * Two small things that are formatted rather than written: how long ago something
 * happened, and the labels on a set of bank details.
 *
 * Both used to be English-only helpers in `lib/time.ts` and `lib/payment-service.ts`,
 * which is fine for a value but wrong for a word — "3 hours ago" and "Branch" appear
 * in the feed, the alert lists and on the payment surfaces, so they have to be said
 * in the reader's language like everything else.
 *
 * The English output is byte for byte what those helpers produced, because the test
 * suite asserts on some of it.
 */

/** Fills `{count}`, leaving an unknown placeholder visible rather than blank. */
function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    key in values ? String(values[key]) : whole,
  );
}

/**
 * "just now", "4 minutes ago", "2 hours ago".
 *
 * Coarse on purpose: this is a feed timestamp, and the exact minute stopped being
 * interesting the moment the entry scrolled past.
 */
export function relativeTime(t: Dictionary, instant: Date): string {
  const seconds = Math.max(0, Math.round((Date.now() - instant.getTime()) / 1000));
  if (seconds < 60) return t.common.justNow;

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return fill(minutes === 1 ? t.common.minuteAgo : t.common.minutesAgo, { count: minutes });
  }

  const hours = Math.round(minutes / 60);
  return fill(hours === 1 ? t.common.hourAgo : t.common.hoursAgo, { count: hours });
}

/** The label each bank line is quoted under, by the English label it was built with. */
function bankLineLabel(t: Dictionary, label: string): string {
  const map = t.bankTransfer as Record<string, string | undefined>;
  const keys: Record<string, keyof Dictionary['bankTransfer']> = {
    'Account name': 'accountName',
    Bank: 'bank',
    IBAN: 'iban',
    'Account number': 'accountNumber',
    'SWIFT / BIC': 'swift',
    Branch: 'branch',
  };
  const key = keys[label];
  return key ? (map[key] ?? label) : label;
}

/**
 * The bank details as the client reads them.
 *
 * Takes what `bankTransferLines` already produced and puts the labels into the
 * reader's language, so a value like an IBAN — which is the same everywhere — is
 * never touched, and an unrecognised label is left alone rather than blanked.
 */
export function localiseBankLines(
  t: Dictionary,
  lines: { label: string; value: string }[],
): { label: string; value: string }[] {
  return lines.map((line) => ({ label: bankLineLabel(t, line.label), value: line.value }));
}
