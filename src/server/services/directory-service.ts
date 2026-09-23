import { AccountType, Emirate, LegalArea, Prisma, VerificationStatus } from '@prisma/client';
import { prisma } from '@/lib/db';
import { cached } from '@/lib/ttl-cache';
import { DIRECTORY_PAGE_SIZE } from '@/lib/constants';

export type DirectoryQuery = {
  q?: string;
  kind?: AccountType | 'ALL';
  areas?: LegalArea[];
  emirates?: Emirate[];
  /** ISO alpha-2 codes. A listing matches if it offers to work in any of them. */
  countries?: string[];
  /** Admin1 codes such as AR.14 — the province or state within a country. */
  divisions?: string[];
  verifiedOnly?: boolean;
  acceptsNewClients?: boolean;
  page?: number;
};

const LISTING_INCLUDE = {
  user: {
    select: {
      id: true,
      accountType: true,
      verificationStatus: true,
      verifiedAt: true,
      // NOTE: the owner's account email is deliberately NOT selected. A member's
      // login address is not public; the directory exposes only a contact email
      // the member chose to publish on their listing.
      profile: {
        select: {
          fullName: true,
          avatarDocumentId: true,
          countryOfResidence: true,
          workDescription: true,
          educationBackground: true,
          // Used only to render an age, never the date itself. Place of birth is
          // shown to the member and to reviewers, not to the public.
          dateOfBirth: true,
        },
      },
      firmProfile: {
        select: {
          legalName: true,
          tradeLicenseNumber: true,
          tradeLicenseAuthority: true,
          tradeLicenseIssuedOn: true,
          tradeLicenseExpiresOn: true,
          registeredEmirate: true,
          legalStructure: true,
          authorisedSignatory: true,
          registeredAddress: true,
          website: true,
          // The firm's registered lawyers, shown on the firm's own profile
          // instead of as separate entries in the directory.
          lawyers: {
            orderBy: { createdAt: 'asc' as const },
            select: {
              id: true,
              licenseNumber: true,
              licensingAuthority: true,
              licenseExpiresOn: true,
              yearsOfExperience: true,
              user: {
                select: {
                  id: true,
                  email: true,
                  verificationStatus: true,
                  verifiedAt: true,
                  profile: {
                    select: { fullName: true, avatarDocumentId: true, countryOfResidence: true },
                  },
                },
              },
            },
          },
        },
      },
      lawyerProfile: {
        select: {
          licenseNumber: true,
          licensingAuthority: true,
          licenseIssuedOn: true,
          licenseExpiresOn: true,
          yearsOfExperience: true,
          affiliatedFirmId: true,
          createdByFirmId: true,
          /// Set when this lawyer's own practice sits inside a firm.
          affiliatedFirm: { select: { id: true, legalName: true } },
        },
      },
      // Which of this member's documents a reviewer accepted. Only the kind and
      // the decision date are exposed — never a document id, a file name or an
      // Emirates ID number.
      documents: {
        where: { status: 'APPROVED' },
        select: { kind: true, reviewedAt: true },
        orderBy: { reviewedAt: 'desc' },
      },
    },
  },
  // Where the professional offers to work, so a card can say so when it is more
  // than one place. Primary first, then the rest alphabetically.
  coverage: { orderBy: [{ isPrimary: 'desc' }, { countryCode: 'asc' }] },
} satisfies Prisma.ListingInclude;

export type DirectoryListing = Prisma.ListingGetPayload<{ include: typeof LISTING_INCLUDE }>;

/**
 * Who is not an independent directory entry.
 *
 * A lawyer whose account was created inside a firm, and who is still registered
 * with that firm, is shown on the firm's profile instead of standing alone in the
 * directory. Two conditions are required, and both matter:
 *
 *  · `createdByFirmId` — they never signed up themselves, so they are not an
 *    independent practitioner. A lawyer who registered through the public form
 *    and later joined a firm keeps their own listing.
 *  · `affiliatedFirmId` — the firm is still answerable for them. If they leave,
 *    they become independent again and their listing returns automatically.
 */
const NOT_AN_INDEPENDENT_LAWYER = {
  user: {
    is: {
      lawyerProfile: {
        is: { createdByFirmId: { not: null }, affiliatedFirmId: { not: null } },
      },
    },
  },
} satisfies Prisma.ListingWhereInput;

/** The one definition of "a listing the public directory may show". */
export function publicDirectoryWhere(): Prisma.ListingWhereInput {
  return { published: true, NOT: NOT_AN_INDEPENDENT_LAWYER };
}

/**
 * Directory search.
 *
 * Only listings the owner has published are returned. Verification status is
 * read live from the account, never cached on the listing, so a lapsed approval
 * cannot leave a stale badge on display.
 *
 * Ordering is verified-first, then oldest listing first. There is deliberately
 * no rating, review score, "recommended" or paid placement: nothing here ranks
 * one professional above another on anything but verifiable facts.
 */
export async function searchDirectory(query: DirectoryQuery) {
  // Public and identical for everybody: cached for a few seconds so a popular
  // directory page costs one query rather than one per visit.
  return cached(`directory:search:${JSON.stringify(query)}`, 30_000, () =>
    runSearchDirectory(query),
  );
}

async function runSearchDirectory(query: DirectoryQuery) {
  const page = Math.max(1, query.page ?? 1);

  const where: Prisma.ListingWhereInput = publicDirectoryWhere();

  if (query.kind && query.kind !== 'ALL') {
    where.kind = query.kind;
  }
  if (query.areas && query.areas.length > 0) {
    where.areas = { hasSome: query.areas };
  }
  if (query.emirates && query.emirates.length > 0) {
    where.emirates = { hasSome: query.emirates };
  }
  if (query.divisions && query.divisions.length > 0) {
    // A region is narrower than a country and asked the same way: a listing matches
    // if it works there, wherever that region happens to sit within the coverage.
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : []),
      {
        OR: [
          { primaryDivisionCode: { in: query.divisions } },
          { coverage: { some: { divisionCode: { in: query.divisions } } } },
        ],
      },
    ];
  }
  if (query.countries && query.countries.length > 0) {
    // Kept in AND rather than OR so it composes with the text search below, which
    // owns OR. A listing matches a country if it offers to work there — not merely
    // if that is where its head office is, because a professional may cover several.
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : []),
      {
        OR: [
          { primaryCountryCode: { in: query.countries } },
          { coverage: { some: { countryCode: { in: query.countries } } } },
        ],
      },
    ];
  }
  if (query.acceptsNewClients) {
    where.acceptsNewClients = true;
  }
  if (query.verifiedOnly) {
    where.user = { verificationStatus: VerificationStatus.APPROVED, verifiedAt: { not: null } };
  }
  if (query.q && query.q.trim().length > 0) {
    const term = query.q.trim();
    where.OR = [
      { displayName: { contains: term, mode: 'insensitive' } },
      { headline: { contains: term, mode: 'insensitive' } },
      { bio: { contains: term, mode: 'insensitive' } },
      { user: { profile: { fullName: { contains: term, mode: 'insensitive' } } } },
      { user: { firmProfile: { legalName: { contains: term, mode: 'insensitive' } } } },
    ];
  }

  const [total, rows] = await Promise.all([
    prisma.listing.count({ where }),
    prisma.listing.findMany({
      where,
      relationLoadStrategy: 'join',
      include: LISTING_INCLUDE,
      orderBy: [
        // Verified profiles first; verifiedAt is null for everyone else, and
        // Postgres sorts NULLS LAST on a descending order.
        { user: { verifiedAt: { sort: 'desc', nulls: 'last' } } },
        { createdAt: 'asc' },
      ],
      skip: (page - 1) * DIRECTORY_PAGE_SIZE,
      take: DIRECTORY_PAGE_SIZE,
    }),
  ]);

  return {
    rows,
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / DIRECTORY_PAGE_SIZE)),
    pageSize: DIRECTORY_PAGE_SIZE,
  };
}

/**
 * A listing for viewing, published or not.
 *
 * Visibility is decided by the page rather than here, because an unpublished
 * draft still belongs to its owner and to the firm that created it — they must
 * be able to open it. Everyone else is turned away by the page.
 */
export async function getListingById(listingId: string) {
  return prisma.listing.findFirst({
    where: { id: listingId },
    relationLoadStrategy: 'join',
    include: LISTING_INCLUDE,
  });
}

/**
 * Counts published listings by emirate and by area so the filter controls can
 * show real totals instead of invented ones. Empty categories are omitted.
 */
export async function directoryFacetCounts() {
  return cached('directory:facets', 60_000, loadFacetCounts);
}

async function loadFacetCounts() {
  const rows = await prisma.listing.findMany({
    where: publicDirectoryWhere(),
    select: {
      areas: true,
      emirates: true,
      kind: true,
      primaryCountryCode: true,
      primaryDivisionCode: true,
    },
  });

  const areaCounts = new Map<LegalArea, number>();
  /**
   * How many published listings are in each country. Built from the listing's own
   * country rather than its coverage rows, because this drives the checkbox list:
   * a professional who covers three countries should not make all three appear as
   * separate categories with the same name in them.
   */
  const countryCounts = new Map<string, number>();
  /** Published listings by admin1 code, so the region filter offers real ones. */
  const divisionCounts = new Map<string, number>();
  const emirateCounts = new Map<Emirate, number>();
  const kindCounts = new Map<AccountType, number>();

  for (const row of rows) {
    kindCounts.set(row.kind, (kindCounts.get(row.kind) ?? 0) + 1);
    for (const area of row.areas) areaCounts.set(area, (areaCounts.get(area) ?? 0) + 1);
    for (const emirate of row.emirates) emirateCounts.set(emirate, (emirateCounts.get(emirate) ?? 0) + 1);
    const country = row.primaryCountryCode;
    if (country) countryCounts.set(country, (countryCounts.get(country) ?? 0) + 1);
    const region = row.primaryDivisionCode;
    if (region) divisionCounts.set(region, (divisionCounts.get(region) ?? 0) + 1);
  }

  return {
    areaCounts,
    countryCounts,
    divisionCounts,
    emirateCounts,
    kindCounts,
    totalPublished: rows.length,
  };
}

/**
 * Whether the signed-in professional has a published listing, used to show the
 * right call to action on their dashboard.
 */
export async function getOwnListing(userId: string) {
  return prisma.listing.findUnique({ where: { userId } });
}
