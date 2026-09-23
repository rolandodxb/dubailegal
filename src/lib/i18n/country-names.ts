import type { Locale } from './locales';
import { countriesEs } from './dict/countries';

/**
 * Country names, in the reader's language.
 *
 * The names are not part of the main dictionary on purpose. The dictionary's
 * guarantee is that every key in English has a counterpart in the other language,
 * and it enforces that at the type level — but the country list is 154 entries
 * whose English source of truth is `lib/countries.ts`, along with the currency and
 * banking facts that belong with it. Copying all 154 names into the dictionary
 * would create a second English list to keep in step for no gain.
 *
 * So this is a plain code-to-name lookup, keyed by language, and anything missing
 * falls back to the English name rather than to an empty string: a country
 * rendered in the wrong language is a bug you can see, and a country rendered as
 * nothing is a bug you cannot.
 */
const BY_LOCALE: Partial<Record<Locale, Record<string, string>>> = {
  es: countriesEs,
};

/** The reader's word for a country, or the English name it came with. */
export function countryName(locale: Locale, code: string, englishName: string): string {
  return BY_LOCALE[locale]?.[code] ?? englishName;
}

/**
 * Every localised name for a language, for a picker that has to search them.
 *
 * Returns `undefined` for a language with no list, which is what tells the picker
 * to keep using the English names it was given.
 */
export function countryNamesFor(locale: Locale): Record<string, string> | undefined {
  return BY_LOCALE[locale];
}
