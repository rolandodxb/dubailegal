import type { Translated } from '../translated';

/**
 * Member Cases — the strings, in English first.
 *
 * English is the source of truth: the Spanish object below is typed against it,
 * so a key that exists here and not there is a build error rather than an
 * English sentence on a Spanish page.
 */
export const memberCasesEn = {};

export type MemberCasesDict = Translated<typeof memberCasesEn>;

export const memberCasesEs: MemberCasesDict = {};
