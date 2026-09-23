import { headers } from 'next/headers';

/**
 * Where the visitor is, as far as the network will say.
 *
 * This is deliberately quiet. Nothing on the page mentions it, nothing asks the
 * visitor for permission, and no third party is contacted: the country is read
 * from a header that the hosting platform has *already* attached to the request,
 * because that is the only place it can be read without either a lookup service or
 * a browser API. If no platform supplies one, there is simply no country and the
 * directory shows everywhere — which is the honest answer, not a guess.
 *
 * What it is used for is a *default*: the directory and the community open on the
 * visitor's own country, and the country filter overrides it the moment the
 * visitor says otherwise. It is never used for anything the visitor cannot undo.
 *
 * The headers are listed in the order they are trusted. They all mean the same
 * thing; which one exists depends on who is hosting the app.
 */
const COUNTRY_HEADERS = [
  'x-vercel-ip-country', // Vercel
  'cf-ipcountry', // Cloudflare
  'cloudfront-viewer-country', // AWS CloudFront
  'fastly-client-country', // Fastly, older
  'x-country-code', // Fastly, newer
  'x-geo-country', // generic proxies
  'x-appengine-country', // Google App Engine
];

/** Two ISO letters, or nothing. `XX` and `T1` are how some networks say "unknown". */
function normalise(value: string | null | undefined): string | null {
  if (!value) return null;
  const code = value.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return null;
  if (code === 'XX' || code === 'ZZ' || code === 'T1') return null;
  return code;
}

/**
 * The country the request came from, or null when the network does not say.
 *
 * Server-only: it reads the request headers, so it cannot be called from a client
 * component. The value is a two-letter string, which is all that crosses to the
 * browser — never the address it came from, and never anything derived from it.
 */
export async function detectedCountry(): Promise<string | null> {
  const store = await headers();
  for (const name of COUNTRY_HEADERS) {
    const found = normalise(store.get(name));
    if (found) return found;
  }
  return null;
}

/**
 * A fallback when the network will not say, from the language the browser asks for.
 *
 * `Accept-Language` is not a location: it is the language the reader wants, and
 * somebody in Argentina running an English browser asks for `en-US`. So this is
 * used *only* when no platform header supplied a country, and only when the tag
 * names a region — `es-AR` gives Argentina, `en` alone gives nothing, because a
 * language without a region is a language and not a place.
 *
 * It is a hint rather than a fact, and it is treated as one: it decides which
 * country's directory opens *by default*, and the filter overrides it in a click.
 * The alternative — showing the whole world because a proxy did not pass a header —
 * is what makes the feature look broken on an installation like this one.
 */
function countryFromLanguage(header: string | null): string | null {
  if (!header) return null;
  for (const part of header.split(',')) {
    const tag = part.trim().split(';')[0]?.trim();
    if (!tag) continue;
    const match = /^[A-Za-z]{2,3}-([A-Za-z]{2})$/.exec(tag);
    const region = normalise(match?.[1]);
    if (region) return region;
  }
  return null;
}

/** The country the reader's browser asks for, as a last resort. */
export async function detectedCountryOrLanguage(): Promise<string | null> {
  const fromNetwork = await detectedCountry();
  if (fromNetwork) return fromNetwork;
  const store = await headers();
  return countryFromLanguage(store.get('accept-language'));
}
