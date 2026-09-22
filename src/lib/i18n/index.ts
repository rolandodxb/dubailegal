import { cookies } from 'next/headers';
import { cache } from 'react';
import { DEFAULT_LOCALE, LOCALE_COOKIE, directionOf, isLocale, type Direction, type Locale } from './locales';
import type { Dictionary } from './en';
import { en } from './en';
import { es } from './es';

export { LOCALES, LOCALE_COOKIE, DEFAULT_LOCALE, isLocale, directionOf } from './locales';
export type { Locale, Direction } from './locales';
export type { Dictionary } from './en';

/**
 * The dictionaries that are complete.
 *
 * A locale with no entry here falls back to English — which is why the two
 * unfinished languages are also marked `ready: false` in the switcher and cannot
 * be chosen. The fallback exists so the site never breaks, not so it can quietly
 * serve English under another language's name.
 */
const DICTIONARIES: Partial<Record<Locale, Dictionary>> = { en, es };

/**
 * The language this request is in.
 *
 * Held in a cookie rather than in the URL. That keeps every existing route — and
 * every link anybody has already shared — working exactly as it did, which
 * matters more here than a locale prefix in the address.
 */
export const currentLocale = cache(async (): Promise<Locale> => {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
});

export type I18n = {
  /** The language that was asked for. */
  locale: Locale;
  dir: Direction;
  t: Dictionary;
  /** False when the chosen language has no dictionary yet and English is shown. */
  isTranslated: boolean;
  effectiveLocale: Locale;
};

/**
 * Everything a page needs to render in the reader's language: the locale, the
 * writing direction, and the dictionary itself.
 *
 * `t` is the dictionary rather than a lookup function, so `t.nav.directory` is
 * checked by the compiler — a mistyped key is a build error, not a blank space
 * on the page.
 */
export const getI18n = cache(async (): Promise<I18n> => {
  const locale = await currentLocale();
  const dictionary = DICTIONARIES[locale];
  // An unfinished language still renders, in English, rather than throwing.
  const effective: Locale = dictionary ? locale : DEFAULT_LOCALE;
  return {
    locale,
    dir: directionOf(locale),
    t: dictionary ?? en,
    isTranslated: Boolean(dictionary),
    effectiveLocale: effective,
  };
});
