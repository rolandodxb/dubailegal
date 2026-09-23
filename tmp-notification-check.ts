/**
 * Throwaway check for the notification renderer. Deleted after the run.
 */
import { notificationText } from './src/lib/i18n/notifications';
import { notificationsEsPatterns } from './src/lib/i18n/dict/notifications';
import { formatUaeDateTime } from './src/lib/time';

const ISO_A = '2026-09-23T00:59:00.000Z';
const ISO_B = '2026-10-01T06:30:00.000Z';

let failures = 0;
function check(label: string, ok: boolean, detail = '') {
  if (!ok) {
    failures += 1;
    console.log(`FAIL  ${label}${detail ? ` — ${detail}` : ''}`);
  } else {
    console.log(`ok    ${label}`);
  }
}

// ── 1. English identity: renders back byte for byte ────────────────────────
const enSamples: [string, string][] = [
  ['Meeting booked for {{' + ISO_A + '}}', `Meeting booked for ${formatUaeDateTime(new Date(ISO_A), 'en')}`],
  ['You are asked to attend the office on {{' + ISO_A + '}}', `You are asked to attend the office on ${formatUaeDateTime(new Date(ISO_A), 'en')}`],
  ['Your meeting moved to {{' + ISO_A + '}}', `Your meeting moved to ${formatUaeDateTime(new Date(ISO_A), 'en')}`],
  [
    `Sara moved the meeting from {{${ISO_A}}} to {{${ISO_B}}} at Office 4, Dubai. Accept or decline the new time from My cases.`,
    `Sara moved the meeting from ${formatUaeDateTime(new Date(ISO_A), 'en')} to ${formatUaeDateTime(new Date(ISO_B), 'en')} at Office 4, Dubai. Accept or decline the new time from My cases.`,
  ],
  [
    `Sara moved the meeting from {{${ISO_A}}} to {{${ISO_B}}}. Open My cases to join the conference room.`,
    `Sara moved the meeting from ${formatUaeDateTime(new Date(ISO_A), 'en')} to ${formatUaeDateTime(new Date(ISO_B), 'en')}. Open My cases to join the conference room.`,
  ],
  [
    `Sara moved the meeting from {{${ISO_A}}} to {{${ISO_B}}}.`,
    `Sara moved the meeting from ${formatUaeDateTime(new Date(ISO_A), 'en')} to ${formatUaeDateTime(new Date(ISO_B), 'en')}.`,
  ],
  [`Omar will attend on {{${ISO_A}}}`, `Omar will attend on ${formatUaeDateTime(new Date(ISO_A), 'en')}`],
  [
    `They cannot come to the office for the meeting on {{${ISO_A}}}. You may want to offer a video call instead.`,
    `They cannot come to the office for the meeting on ${formatUaeDateTime(new Date(ISO_A), 'en')}. You may want to offer a video call instead.`,
  ],
  [`The client cancelled the meeting on {{${ISO_A}}}.`, `The client cancelled the meeting on ${formatUaeDateTime(new Date(ISO_A), 'en')}.`],
  [`The meeting on {{${ISO_A}}} has been cancelled.`, `The meeting on ${formatUaeDateTime(new Date(ISO_A), 'en')} has been cancelled.`],
  ['New case for your firm: CASE-1042', 'New case for your firm: CASE-1042'],
  ['Sara submitted “Visa dispute”. Any lawyer in the firm may review and accept it.', 'Sara submitted “Visa dispute”. Any lawyer in the firm may review and accept it.'],
  ['A fee of AED 1,250.50 was paid by transfer', 'A fee of AED 1,250.50 was paid by transfer'],
  ['On case CASE-9, for AED 1,250.50 (receipt RC-3).', 'On case CASE-9, for AED 1,250.50 (receipt RC-3).'],
  ['Sara (LAWYER) reported a problem. Ticket T-7.', 'Sara (LAWYER) reported a problem. Ticket T-7.'],
];

console.log('── English identity ──────────────────────────────────────────');
for (const [raw, expected] of enSamples) {
  const got = notificationText('en', raw);
  check(`en: ${expected.slice(0, 58)}`, got === expected, got === expected ? '' : `\n  expected: ${expected}\n  got:      ${got}`);
}
check('en: undefined locale behaves as English', notificationText(undefined, enSamples[0]![0]) === enSamples[0]![1]);

// ── 2. Spanish samples ─────────────────────────────────────────────────────
console.log('\n── Spanish samples ───────────────────────────────────────────');
for (const [raw] of enSamples) {
  console.log(`• ${raw.replace(/\{\{(.*?)\}\}/g, '«$1»')}`);
  console.log(`  EN  ${notificationText('en', raw)}`);
  console.log(`  ES  ${notificationText('es', raw)}`);
}

// ── 3. Every catalogue entry round-trips through its own template ──────────
console.log('\n── Catalogue coverage ────────────────────────────────────────');
for (const entry of notificationsEsPatterns) {
  const raw = entry.match;
  // Fill each placeholder with a token that cannot collide with a literal.
  const filled = raw.replace(/\{(\d+)\}/g, (_w, d: string) => `«VAL${d}»`);
  const expected = entry.es.replace(/\{(\d+)\}/g, (_w, d: string) => `«VAL${d}»`);
  const got = notificationText('es', filled);
  check(`es round-trip: ${entry.match.slice(0, 52)}`, got === expected, got === expected ? '' : `\n  expected: ${expected}\n  got:      ${got}`);
}
console.log(`\nCatalogue entries: ${notificationsEsPatterns.length}`);

// ── 4. Unmatched sentence keeps its Spanish date and English words ─────────
const unmatched = `A sentence nobody catalogued on {{${ISO_A}}} stays English.`;
check(
  'unmatched: Spanish date, English words',
  notificationText('es', unmatched) === `A sentence nobody catalogued on ${formatUaeDateTime(new Date(ISO_A), 'es')} stays English.`,
  notificationText('es', unmatched),
);

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
