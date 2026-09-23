import type { AccountType, DocumentKind, Emirate, LegalArea } from '@prisma/client';
import type { Dictionary } from './en';

/**
 * The shared label vocabulary, resolved for one request.
 *
 * The maps in `lib/constants.ts`, `lib/community.ts` and friends used to be the
 * only copy of these words, in English, read directly as `SOMETHING_LABEL[code]`
 * from tables and chips all over the app. These helpers replace those reads: the
 * code stays the code, and the word comes from the dictionary of the language
 * being read.
 *
 * An unrecognised code falls back to the code itself rather than to an empty
 * string. A row that says `SOMETHING_NEW` is a visible bug; a row that says
 * nothing is a silent one, and the second is worse.
 */
function from(t: Dictionary, group: keyof Dictionary['labels'], code: string): string {
  const map = t.labels[group] as Record<string, string | undefined>;
  return map[code] ?? code;
}

export const accountTypeLabel = (t: Dictionary, code: AccountType | string): string =>
  from(t, 'accountType', code);

export const accountTypeDescription = (t: Dictionary, code: AccountType | string): string =>
  from(t, 'accountTypeDescription', code);

export const emirateLabel = (t: Dictionary, code: Emirate | string): string =>
  from(t, 'emirate', code);

export const legalAreaLabel = (t: Dictionary, code: LegalArea | string): string =>
  from(t, 'legalArea', code);

export const documentKindLabel = (t: Dictionary, code: DocumentKind | string): string =>
  from(t, 'documentKind', code);

export const documentKindHint = (t: Dictionary, code: DocumentKind | string): string =>
  from(t, 'documentKindHint', code);

export const verificationRequestLabel = (t: Dictionary, code: string): string =>
  from(t, 'verificationRequest', code);

export const caseStatusLabel = (t: Dictionary, code: string): string =>
  from(t, 'caseStatus', code);

export const communityTopicLabel = (t: Dictionary, code: string): string =>
  from(t, 'communityTopic', code);

export const communityTopicHint = (t: Dictionary, code: string): string =>
  from(t, 'communityTopicHint', code);

export const reactionLabel = (t: Dictionary, code: string): string => from(t, 'reaction', code);

export const blogKindLabel = (t: Dictionary, code: string): string => from(t, 'blogKind', code);

export const supportCategoryLabel = (t: Dictionary, code: string): string =>
  from(t, 'supportCategory', code);

export const supportStatusLabel = (t: Dictionary, code: string): string =>
  from(t, 'supportStatus', code);

export const bankFieldLabel = (t: Dictionary, code: string): string => from(t, 'bankField', code);

export const paymentPurposeLabel = (t: Dictionary, code: string): string =>
  from(t, 'paymentPurpose', code);

export const domainLabel = (t: Dictionary, code: string): string => from(t, 'domain', code);
