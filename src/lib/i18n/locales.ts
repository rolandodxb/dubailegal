/**
 * The languages the application speaks.
 *
 * The code is what is stored in the cookie and in `<html lang>`; `native` is the
 * name of the language *in that language*, because a list that says "Arabic" to
 * somebody who reads Arabic is a list written for the wrong person.
 */
export const LOCALES = [
  { code: 'en', native: 'English', english: 'English', dir: 'ltr', ready: true },
  { code: 'es', native: 'Español', english: 'Spanish', dir: 'ltr', ready: true },
  // Offered, and honest about it: a language that is half translated is worse
  // than one that says so, because a reader cannot tell a missing string from a
  // broken one. They are listed so the intention is visible and switched on when
  // their dictionaries are complete.
  { code: 'ar', native: 'العربية', english: 'Arabic', dir: 'rtl', ready: false },
  { code: 'fr', native: 'Français', english: 'French', dir: 'ltr', ready: false },
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
