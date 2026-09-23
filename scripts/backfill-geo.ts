/**
 * Moves existing rows into the worldwide geographic model.
 *
 *   npm run geo:backfill
 *
 * The platform began in the United Arab Emirates, so every listing that exists
 * today is a UAE listing and every post was written from there. This says so in the
 * new columns and creates the matching `ListingCoverage` row, without touching
 * anything else. It is idempotent: a row that already has a country is left alone,
 * so running it twice is harmless and running it after a new UAE listing is created
 * by a test is harmless too.
 *
 * The seven emirates are the seven admin1 divisions of `AE` in the reference data —
 * `AE.01` Abu Dhabi … `AE.07` Umm Al Quwain — so nothing is guessed.
 */

process.loadEnvFile('.env');

import { prisma } from '../src/lib/db';

/** The emirates, as the reference data codes them. */
const EMIRATE_CODES: Record<string, string> = {
  ABU_DHABI: 'AE.01',
  AJMAN: 'AE.02',
  DUBAI: 'AE.03',
  FUJAIRAH: 'AE.04',
  RAS_AL_KHAIMAH: 'AE.05',
  SHARJAH: 'AE.06',
  UMM_AL_QUWAIN: 'AE.07',
};

async function main(): Promise<void> {
  const listings = await prisma.listing.findMany({
    select: {
      id: true,
      kind: true,
      primaryEmirate: true,
      emirates: true,
      areas: true,
      primaryCountryCode: true,
      coverage: { select: { id: true } },
    },
  });

  let updated = 0;
  let coverageRows = 0;

  for (const listing of listings) {
    const primaryDivision = listing.primaryEmirate
      ? EMIRATE_CODES[listing.primaryEmirate] ?? null
      : null;

    if (listing.primaryCountryCode === null) {
      await prisma.listing.update({
        where: { id: listing.id },
        data: { primaryCountryCode: 'AE', primaryDivisionCode: primaryDivision },
      });
      updated += 1;
    }

    if (listing.coverage.length === 0) {
      // One row per emirate the listing covers, so the map is complete rather than
      // only the headline one. The primary emirate is flagged, which is what the
      // profile shows first and what a future currency default reads.
      const divisions =
        listing.emirates.length > 0
          ? listing.emirates
          : ([listing.primaryEmirate].filter(Boolean) as string[]);
      for (const emirate of divisions) {
        const divisionCode = emirate ? EMIRATE_CODES[emirate] : undefined;
        if (!divisionCode) continue;
        await prisma.listingCoverage.create({
          data: {
            listingId: listing.id,
            countryCode: 'AE',
            divisionCode,
            areas: listing.areas,
            isPrimary: emirate === listing.primaryEmirate,
          },
        });
        coverageRows += 1;
      }
    }
  }

  // A post written before the platform went worldwide belongs to the country its
  // author lives in, and to the United Arab Emirates where that was never recorded.
  const posts = await prisma.blogPost.findMany({
    where: { countryCode: null },
    select: { id: true, author: { select: { profile: { select: { countryOfResidenceCode: true } } } } },
  });

  for (const post of posts) {
    await prisma.blogPost.update({
      where: { id: post.id },
      data: { countryCode: post.author.profile?.countryOfResidenceCode ?? 'AE' },
    });
  }

  // A member's own residence division is left alone: it narrows a directory and is
  // theirs to set, so the backfill does not invent one.

  console.info(`listings given a country: ${updated} of ${listings.length}`);
  console.info(`coverage rows created:    ${coverageRows}`);
  console.info(`posts given a country:    ${posts.length}`);

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

export {};
