/**
 * The seam between the Emirates and the worldwide model.
 *
 * The platform began in the United Arab Emirates, and everything written before it
 * went worldwide describes a place as one of the seven emirates. Those seven are
 * also the seven first-level divisions of `AE` in the reference data, so the two
 * descriptions are the same thing under different names:
 *
 *   ABU_DHABI         ↔ AE.01
 *   AJMAN             ↔ AE.02
 *   DUBAI             ↔ AE.03
 *   FUJAIRAH          ↔ AE.04
 *   RAS_AL_KHAIMAH    ↔ AE.05
 *   SHARJAH           ↔ AE.06
 *   UMM_AL_QUWAIN     ↔ AE.07
 *
 * This module holds only that mapping, and imports nothing — no filesystem, no
 * reference data, no database. `lib/geo.ts` reads the world's divisions and must
 * never be pulled into a browser bundle, but validation needs this mapping and
 * validation is shared, so the two are kept apart on purpose.
 */

import type { Emirate } from '@prisma/client';

/** The seven emirates, as the reference data codes them. */
export const EMIRATE_DIVISION: Record<Emirate, string> = {
  ABU_DHABI: 'AE.01',
  AJMAN: 'AE.02',
  DUBAI: 'AE.03',
  FUJAIRAH: 'AE.04',
  RAS_AL_KHAIMAH: 'AE.05',
  SHARJAH: 'AE.06',
  UMM_AL_QUWAIN: 'AE.07',
};

/** The same mapping read the other way. */
export const DIVISION_EMIRATE: Record<string, Emirate> = Object.fromEntries(
  Object.entries(EMIRATE_DIVISION).map(([emirate, division]) => [division, emirate as Emirate]),
) as Record<string, Emirate>;

export const UAE = 'AE';

/** The division code for an emirate, or null when the emirate is unknown. */
export function divisionOfEmirate(emirate: string | null | undefined): string | null {
  if (!emirate) return null;
  return EMIRATE_DIVISION[emirate as Emirate] ?? null;
}

/** The emirate a division code names, or null when it is not one of the seven. */
export function emirateOfDivision(division: string | null | undefined): Emirate | null {
  if (!division) return null;
  return DIVISION_EMIRATE[division.toUpperCase()] ?? null;
}

/** The country a division code belongs to, e.g. `AR.14` → `AR`. */
export function countryOfDivision(division: string | null | undefined): string | null {
  if (!division) return null;
  const country = division.split('.')[0];
  return country && /^[A-Z]{2}$/.test(country.toUpperCase()) ? country.toUpperCase() : null;
}

/**
 * A place, reconciled: whichever way it was described, both descriptions agree.
 *
 * A form in the United Arab Emirates sends emirates, because that is what the
 * select offers. A form anywhere else sends a country and a division. The stored
 * row always carries both, so the emirate filter keeps working for UAE listings
 * and the country filter works for everybody — which is only true if exactly one
 * place decides the other.
 */
export type ResolvedPlace = {
  primaryCountryCode: string | null;
  primaryDivisionCode: string | null;
  primaryEmirate: Emirate | null;
};

export function resolvePlace(input: {
  primaryCountryCode?: string | null;
  primaryDivisionCode?: string | null;
  primaryEmirate?: string | null;
  emirates?: string[] | null;
}): ResolvedPlace {
  const emirates = (input.emirates ?? []).filter((value) => value in EMIRATE_DIVISION);
  const emirate = input.primaryEmirate && input.primaryEmirate in EMIRATE_DIVISION
    ? (input.primaryEmirate as Emirate)
    : (emirates[0] as Emirate | undefined) ?? null;

  // The country is stated, or read off the division, or implied by an emirate.
  const country =
    input.primaryCountryCode ??
    countryOfDivision(input.primaryDivisionCode) ??
    (emirate ? UAE : null);

  const division =
    input.primaryDivisionCode ?? (country === UAE ? divisionOfEmirate(emirate) : null);

  // A listing in the United Arab Emirates always carries its emirate, so nothing
  // that reads the emirate has to learn about the rest of the world. A listing
  // anywhere else carries none, because there is none to carry.
  const resolvedEmirate =
    country === UAE ? (emirateOfDivision(division) ?? emirate) : null;

  return {
    primaryCountryCode: country,
    primaryDivisionCode: division,
    primaryEmirate: resolvedEmirate,
  };
}
