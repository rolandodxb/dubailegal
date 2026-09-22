import { cookies } from 'next/headers';
import { cache } from 'react';
import { DEFAULT_LOCALE, LOCALE_COOKIE, directionOf, isLocale, type Direction, type Locale } from './locales';
import type { Dictionary } from './en';
import { en } from './en';
import { ar } from './ar';
import { es } from './es';
import { fr } from './fr';

export { LOCALES, LOCALE_COOKIE, DEFAULT_LOCALE, isLocale, directionOf } from './locales';
export type { Locale, Direction } from './locales';
export type { Dictionary } from './en';

const DICTIONARIES: Record<Locale, Dictionary> = { en, ar, es, fr };

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

export type I18n = { locale: Locale; dir: Direction; t: Dictionary };

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
  return { locale, dir: directionOf(locale), t: DICTIONARIES[locale] };
});
