import type { Dictionary } from './en';
import { emirateLabel } from './labels';
import { countryName } from './country-names';
import type { Locale } from './locales';
import { divisionName } from '@/lib/geo';
import { countryByCode } from '@/lib/countries';

/**
 * The place a profile is offered from, in the reader's language.
 *
 * A listing has two possible descriptions of where it is: the emirate, for the
 * United Arab Emirates, and a country-plus-division for everywhere else. Which one
 * is set decides what is shown, so a Dubai lawyer still reads "Dubai" and a lawyer
 * in Misiones reads "Misiones" — and a listing that has somehow recorded neither
 * says nothing rather than something wrong.
 *
 * Server-only, because resolving a division code to its name reads the reference
 * data from disk. Every caller is a server component or a service, so that costs
 * nothing: the resolved text is a string that crosses to the browser, not the data.
 */
export function listingPlaceText(
  t: Dictionary,
  listing: {
    primaryEmirate?: string | null;
    primaryDivisionCode?: string | null;
    primaryLocality?: string | null;
  },
): string | null {
  if (listing.primaryEmirate) return emirateLabel(t, listing.primaryEmirate);

  const division = listing.primaryDivisionCode ? divisionName(listing.primaryDivisionCode) : null;
  if (division) return listing.primaryLocality ? `${listing.primaryLocality}, ${division}` : division;

  return listing.primaryLocality ?? null;
}

/**
 * The further countries a professional offers to work in.
 *
 * A practice is not always in one country, and a card that shows only the first
 * hides exactly the thing a client abroad is looking for. The primary place is
 * already beside the name, so this returns the rest — named by their own division
 * where one is recorded, and by their country otherwise.
 */
export function listingOtherPlacesText(
  t: Dictionary,
  locale: Locale,
  listing: {
    primaryCountryCode?: string | null;
    primaryDivisionCode?: string | null;
    coverage?: {
      countryCode: string;
      divisionCode: string | null;
      locality: string | null;
      isPrimary: boolean;
    }[];
  },
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const place of listing.coverage ?? []) {
    if (place.isPrimary) continue;
    // A UAE emirate is already shown by the emirate fact, and the primary place is
    // beside the name, so neither is repeated here.
    if (place.countryCode === listing.primaryCountryCode && place.divisionCode === listing.primaryDivisionCode) {
      continue;
    }
    const division = place.divisionCode ? divisionName(place.divisionCode) : null;
    // "Madrid, Madrid" and "Santiago, Santiago Metropolitan" say the same thing
    // twice: the division list names a place by its capital often enough that the
    // locality is frequently the division itself, or its opening words.
    const locality = place.locality?.trim() ?? '';
    const localityAddsSomething =
      locality.length > 0 &&
      division !== null &&
      !division.toLowerCase().startsWith(locality.toLowerCase());

    const name =
      division && localityAddsSomething
        ? `${locality}, ${division}`
        : division ??
          countryName(locale, place.countryCode, countryByCode(place.countryCode)?.name ?? place.countryCode);
    if (seen.has(name)) continue;
    seen.add(name);
    out.push(name);
  }

  return out;
}
