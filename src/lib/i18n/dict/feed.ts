import type { Translated } from '../translated';

/**
 * Community ui — the strings, in English first.
 *
 * English is the source of truth: the Spanish object below is typed against it,
 * so a key that exists here and not there is a build error rather than an
 * English sentence on a Spanish page.
 */
export const feedEn = {};

export type FeedDict = Translated<typeof feedEn>;

export const feedEs: FeedDict = {};
