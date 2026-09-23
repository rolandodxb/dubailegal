/**
 * Turns an English dictionary shape into the shape every other language must
 * satisfy: the same keys, the same nesting, strings in place of strings.
 *
 * This is what makes a missing translation a build error rather than an English
 * sentence sitting in the middle of a Spanish page. It is shared by the main
 * dictionary and by each of the per-area files under `dict/`, so a translator
 * working on one area gets the same guarantee without having to load the whole
 * dictionary to check their work.
 */
export type Translated<T> = {
  [K in keyof T]: T[K] extends string ? string : Translated<T[K]>;
};
