import { NextResponse, type NextRequest } from 'next/server';
import { divisionsFor, districtWord, districtsFor, divisionWord } from '@/lib/geo';

/**
 * The divisions of a country, and of one of its divisions.
 *
 *   /api/geo/divisions?country=AR            → Argentina's 24 provinces
 *   /api/geo/divisions?country=AR&division=AR.14  → Misiones' 17 departments
 *
 * The directory cascades through these as a professional describes where they
 * work. They are fetched rather than shipped because the whole world's second
 * level is 47,000 entries — sending that to every visitor so they can pick one
 * province would be absurd.
 *
 * Public, because the directory is public: knowing that Mendoza is a province of
 * Argentina reveals nothing. Cached hard at the edge, because the answers only
 * change when GeoNames does.
 */
export async function GET(request: NextRequest): Promise<Response> {
  const country = (request.nextUrl.searchParams.get('country') ?? '').trim().toUpperCase();
  const division = (request.nextUrl.searchParams.get('division') ?? '').trim().toUpperCase();

  if (!/^[A-Z]{2}$/.test(country)) {
    return NextResponse.json({ error: 'A two-letter country code is required.' }, { status: 400 });
  }

  // A division must belong to the country it was asked about, so a mismatched
  // pair cannot be used to read another country's list.
  if (division && !division.startsWith(`${country}.`)) {
    return NextResponse.json({ error: 'That division is not in that country.' }, { status: 400 });
  }

  const words = division
    ? { ...districtWord(country), country }
    : { ...divisionWord(country), country };

  const divisions = division ? districtsFor(division) : divisionsFor(country);

  return NextResponse.json(
    { country, division: division || null, label: words.one, labelPlural: words.many, divisions },
    {
      headers: {
        // A day at the edge, a week stale-while-revalidate: this is reference data.
        'cache-control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    },
  );
}
