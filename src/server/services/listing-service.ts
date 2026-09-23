import { prisma } from '@/lib/db';
import { divisionOfEmirate, resolvePlace, UAE } from '@/lib/geo-emirates';
import { invalidate } from '@/lib/ttl-cache';
import { recordAudit } from '@/lib/audit';
import { listingSchema } from '@/lib/validation';
import { fromZodError, failure, success, type ServiceResult } from './result';

/**
 * Creates or updates the public directory entry. Lawyers and firms only.
 *
 * Nothing is published implicitly: `published` is set by the owner ticking the
 * box, and a listing stays a private draft until then.
 */
export async function saveListing(
  userId: string,
  rawInput: unknown,
  meta: { ip?: string | null } = {},
): Promise<ServiceResult<{ published: boolean }>> {
  const parsed = listingSchema.safeParse(rawInput);
  if (!parsed.success) return fromZodError(parsed.error);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { accountType: true, verificationStatus: true },
  });
  if (!user) return failure('That account no longer exists.', { status: 404 });
  if (user.accountType !== 'LAWYER' && user.accountType !== 'FIRM') {
    return failure('Only lawyer and legal-firm accounts can appear in the directory.', { status: 403 });
  }

  // `coverage` is the extra countries the form sent, and it shares its name with
  // the relation, so it is taken out of the spread before the rest is written.
  const { coverage: extraPlaces, ...data } = parsed.data;

  // Whichever way the place was described, both descriptions are stored and they
  // agree — so the emirate filter keeps working for a UAE listing and the country
  // filter works for everybody.
  const place = resolvePlace(data);

  // One coverage row per place covered: every emirate for a UAE listing, or the
  // single country-and-division for one anywhere else.
  // The primary place always counts as covered, and any further countries are added
  // beside it. Duplicates are dropped so adding a country that is already the
  // primary one cannot produce two identical offers.
  const seen = new Set<string>();
  const keyOf = (row: { countryCode: string; divisionCode: string | null; districtCode: string | null }) =>
    `${row.countryCode}|${row.divisionCode ?? ''}|${row.districtCode ?? ''}`;

  const coverage: {
    countryCode: string;
    divisionCode: string | null;
    districtCode: string | null;
    locality: string | null;
    areas: typeof data.areas;
    isPrimary: boolean;
  }[] = [];

  const add = (row: (typeof coverage)[number]) => {
    const key = keyOf(row);
    if (seen.has(key)) return;
    seen.add(key);
    coverage.push(row);
  };

  if (data.emirates.length > 0) {
    // A UAE listing covers the emirates it ticked, which is what the checklist is
    // for; the primary place is the one flagged among them.
    for (const emirate of data.emirates) {
      add({
        countryCode: UAE,
        divisionCode: divisionOfEmirate(emirate),
        districtCode: null,
        locality: null,
        areas: data.areas,
        isPrimary: emirate === place.primaryEmirate,
      });
    }
  } else if (place.primaryCountryCode) {
    add({
      countryCode: place.primaryCountryCode,
      divisionCode: place.primaryDivisionCode,
      districtCode: data.primaryDistrictCode ?? null,
      locality: data.primaryLocality ?? null,
      areas: data.areas,
      isPrimary: true,
    });
  }

  for (const extra of extraPlaces) {
    add({
      countryCode: extra.countryCode,
      divisionCode: extra.divisionCode,
      districtCode: extra.districtCode,
      locality: extra.locality,
      areas: data.areas,
      isPrimary: false,
    });
  }

  await prisma.$transaction(async (tx) => {
    const saved = await tx.listing.upsert({
      where: { userId },
      create: {
        userId,
        kind: user.accountType,
        ...data,
        primaryCountryCode: place.primaryCountryCode,
        primaryDivisionCode: place.primaryDivisionCode,
        primaryDistrictCode: data.primaryDistrictCode ?? null,
        primaryEmirate: place.primaryEmirate,
      },
      update: {
        ...data,
        primaryCountryCode: place.primaryCountryCode,
        primaryDivisionCode: place.primaryDivisionCode,
        primaryDistrictCode: data.primaryDistrictCode ?? null,
        primaryEmirate: place.primaryEmirate,
      },
      select: { id: true },
    });

    // Replaced wholesale rather than diffed: the set is small, and a diff would
    // have to guess which row the professional meant when they renamed a place.
    await tx.listingCoverage.deleteMany({ where: { listingId: saved.id } });
    for (const row of coverage) {
      await tx.listingCoverage.create({ data: { listingId: saved.id, ...row } });
    }
  });

  await recordAudit({
    actorUserId: userId,
    action: data.published ? 'listing.published' : 'listing.saved_draft',
    entityType: 'listing',
    entityId: userId,
    metadata: { areas: data.areas.length, emirates: data.emirates.length },
    ip: meta.ip ?? null,
  });

  // Published data is cached, so a change clears it rather than waiting out the TTL.
  invalidate('directory:');
  invalidate('reviews:');
  invalidate('community:');

  return success({ published: data.published });
}

export async function getListingForEdit(userId: string) {
  return prisma.listing.findUnique({ where: { userId } });
}

/** Takes a listing out of the public directory without discarding it. */
export async function unpublishListing(
  userId: string,
  meta: { ip?: string | null } = {},
): Promise<ServiceResult> {
  const existing = await prisma.listing.findUnique({ where: { userId }, select: { id: true } });
  if (!existing) return failure('You do not have a directory listing yet.', { status: 404 });

  await prisma.listing.update({ where: { userId }, data: { published: false } });
  await recordAudit({
    actorUserId: userId,
    action: 'listing.unpublished',
    entityType: 'listing',
    entityId: existing.id,
    ip: meta.ip ?? null,
  });
  // Published data is cached, so a change clears it rather than waiting out the TTL.
  invalidate('directory:');
  invalidate('reviews:');
  invalidate('community:');

  return success();
}

/**
 * Note on lapsed verification: the directory reads verification status live
 * from the user record rather than caching it on the listing, so a professional
 * whose approval is withdrawn immediately stops showing a verified badge. There
 * is deliberately no code path here that edits verification state — listings
 * and verification are separate concerns.
 */
