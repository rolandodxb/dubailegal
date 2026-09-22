/**
 * The languages the application speaks.
 *
 * The code is what is stored in the cookie and in `<html lang>`; `native` is the
 * name of the language *in that language*, because a list that says "Arabic" to
 * somebody who reads Arabic is a list written for the wrong person.
 */
export const LOCALES = [
  { code: 'en', native: 'English', english: 'English', dir: 'ltr' },
  { code: 'ar', native: 'العربية', english: 'Arabic', dir: 'rtl' },
  { code: 'es', native: 'Español', english: 'Spanish', dir: 'ltr' },
  { code: 'fr', native: 'Français', english: 'French', dir: 'ltr' },
] as const;

export type Locale = (typeof LOCALES)[number]['code'];
export type Direction = 'ltr' | 'rtl';

export const DEFAULT_LOCALE: Locale = 'en';

/** The cookie the choice is remembered in. */
export const LOCALE_COOKIE = 'dl_locale';

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && LOCALES.some((entry) => entry.code === value);
}

export function directionOf(locale: Locale): Direction {
  return LOCALES.find((entry) => entry.code === locale)?.dir ?? 'ltr';
}
