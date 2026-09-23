/**
 * The world's administrative divisions, and what each country calls them.
 *
 * The directory is not one country's directory any more, so "which emirate" is
 * not a question that can be asked of everybody. What is asked instead is:
 *
 *   country  →  its first-level division  →  the division beneath that
 *
 * The names change from place to place — a province in Argentina and Canada, a
 * state in the United States and Australia, an emirate in the United Arab
 * Emirates, a governorate in Egypt, a Land in Germany, a prefecture in Japan — so
 * the *label* is chosen from the country too. Asking a lawyer in Buenos Aires for
 * their "emirate" would be nonsense; asking for their "provincia" is not.
 *
 * The data itself lives in `data/geo/` (see the attribution there) and is loaded
 * once, lazily, on the server. It is never sent to a browser: a picker asks for one
 * country's list when the country is chosen.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';

export type Division = {
  /** The stable code: `AR` for a country, `AR.14` for a province, `AR.14.54021` for a department. */
  code: string;
  name: string;
};

/**
 * What the first-level division is called, by country.
 *
 * Deliberately partial: anywhere not listed falls back to "State / Province", and
 * a country can be added in one line. The singular and plural are kept separate
 * because a field label is singular and a picker's heading is often plural.
 */
const DIVISION_WORDS: Record<string, { one: string; many: string }> = {
  AE: { one: 'Emirate', many: 'Emirates' },
  AR: { one: 'Province', many: 'Provinces' },
  AT: { one: 'State', many: 'States' },
  AU: { one: 'State or territory', many: 'States and territories' },
  BE: { one: 'Region', many: 'Regions' },
  BR: { one: 'State', many: 'States' },
  CA: { one: 'Province or territory', many: 'Provinces and territories' },
  CH: { one: 'Canton', many: 'Cantons' },
  CL: { one: 'Region', many: 'Regions' },
  CN: { one: 'Province', many: 'Provinces' },
  CO: { one: 'Department', many: 'Departments' },
  DE: { one: 'State', many: 'States' },
  EG: { one: 'Governorate', many: 'Governorates' },
  ES: { one: 'Province', many: 'Provinces' },
  FR: { one: 'Region', many: 'Regions' },
  GB: { one: 'Nation or region', many: 'Nations and regions' },
  IE: { one: 'County', many: 'Counties' },
  IN: { one: 'State or union territory', many: 'States and union territories' },
  IT: { one: 'Region', many: 'Regions' },
  JP: { one: 'Prefecture', many: 'Prefectures' },
  KR: { one: 'Province', many: 'Provinces' },
  MA: { one: 'Region', many: 'Regions' },
  MX: { one: 'State', many: 'States' },
  NL: { one: 'Province', many: 'Provinces' },
  NZ: { one: 'Region', many: 'Regions' },
  PE: { one: 'Region', many: 'Regions' },
  PL: { one: 'Voivodeship', many: 'Voivodeships' },
  PT: { one: 'District', many: 'Districts' },
  RU: { one: 'Federal subject', many: 'Federal subjects' },
  SA: { one: 'Province', many: 'Provinces' },
  SE: { one: 'County', many: 'Counties' },
  TR: { one: 'Province', many: 'Provinces' },
  US: { one: 'State', many: 'States' },
  ZA: { one: 'Province', many: 'Provinces' },
};

/**
 * What the second-level division is called, by country.
 *
 * Only where it differs from the generic word — a department in Argentina and
 * Bolivia, a municipality in Colombia and Chile, a district in several places.
 */
const DISTRICT_WORDS: Record<string, { one: string; many: string }> = {
  AR: { one: 'Department', many: 'Departments' },
  BO: { one: 'Department', many: 'Departments' },
  BR: { one: 'Municipality', many: 'Municipalities' },
  CL: { one: 'Commune', many: 'Communes' },
  CO: { one: 'Municipality', many: 'Municipalities' },
  DE: { one: 'District', many: 'Districts' },
  ES: { one: 'Municipality', many: 'Municipalities' },
  FR: { one: 'Department', many: 'Departments' },
  IT: { one: 'Province', many: 'Provinces' },
  MX: { one: 'Municipality', many: 'Municipalities' },
  PE: { one: 'Province', many: 'Provinces' },
  PT: { one: 'Municipality', many: 'Municipalities' },
  TR: { one: 'District', many: 'Districts' },
};

const DEFAULT_WORDS = { one: 'State / Province', many: 'States and provinces' };
const DEFAULT_DISTRICT_WORDS = { one: 'District', many: 'Districts' };

export function divisionWord(countryCode: string): { one: string; many: string } {
  return DIVISION_WORDS[countryCode.toUpperCase()] ?? DEFAULT_WORDS;
}

export function districtWord(countryCode: string): { one: string; many: string } {
  return DISTRICT_WORDS[countryCode.toUpperCase()] ?? DEFAULT_DISTRICT_WORDS;
}

// ── The data ────────────────────────────────────────────────────────────────
//
// Read once and held for the life of the process. Both files are plain JSON keyed
// by code, so a lookup is a property read rather than a scan.

let firstLevel: Record<string, Division[]> | null = null;
let secondLevel: Record<string, Division[]> | null = null;

function load(): { first: Record<string, Division[]>; second: Record<string, Division[]> } {
  if (firstLevel && secondLevel) return { first: firstLevel, second: secondLevel };
  const read = (file: string) =>
    JSON.parse(readFileSync(path.join(process.cwd(), 'data', 'geo', file), 'utf8')) as Record<
      string,
      Division[]
    >;
  firstLevel = read('admin1.json');
  secondLevel = read('admin2.json');
  return { first: firstLevel, second: secondLevel };
}

/** The first-level divisions of a country — its provinces, states or emirates. */
export function divisionsFor(countryCode: string): Division[] {
  return load().first[countryCode.toUpperCase()] ?? [];
}

/** The divisions beneath one first-level division — its departments or municipalities. */
export function districtsFor(divisionCode: string): Division[] {
  return load().second[divisionCode.toUpperCase()] ?? [];
}

/** Whether we hold a first-level list for a country at all. */
export function hasDivisions(countryCode: string): boolean {
  return divisionsFor(countryCode).length > 0;
}

/** The name of any division or district, by code. */
export function divisionName(code: string): string | null {
  const { first, second } = load();
  const country = code.split('.')[0] ?? '';
  const one = (first[country] ?? []).find((entry) => entry.code === code);
  if (one) return one.name;
  for (const list of Object.values(second)) {
    const match = list.find((entry) => entry.code === code);
    if (match) return match.name;
  }
  return null;
}
