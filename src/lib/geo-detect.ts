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
