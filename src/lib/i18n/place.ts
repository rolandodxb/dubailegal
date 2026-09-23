import type { Dictionary } from './en';
import { emirateLabel } from './labels';
import { divisionName } from '@/lib/geo';

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
