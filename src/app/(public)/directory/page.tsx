import type { Metadata } from 'next';
import Link from 'next/link';
import { getSessionUser } from '@/lib/auth';
import { getI18n } from '@/lib/i18n';
import { accountTypeLabel, emirateLabel, legalAreaLabel } from '@/lib/i18n/labels';
import {
  buildDirectoryUrl,
  hasActiveFilters,
  parseDirectoryParams,
  type RawSearchParams,
} from '@/lib/directory-params';
import { directoryFacetCounts, searchDirectory } from '@/server/services/directory-service';
import { reviewSummariesFor } from '@/server/services/review-service';
import { getAvailability, isEnabled } from '@/lib/availability';
import { Icon } from '@/components/icons';
import { DirectoryFilters } from '@/components/directory/DirectoryFilters';
import { ListingCard } from '@/components/directory/ListingCard';
import { buttonClasses, Card, EmptyState } from '@/components/ui/primitives';
import { listingPlaceText } from '@/lib/i18n/place';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: t.directory.title,
    description: t.publicPages.directoryPage.metaDescription,
  };
}

export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const [{ t }, params] = await Promise.all([getI18n(), searchParams]);
  const page = t.publicPages.directoryPage;
  const query = parseDirectoryParams(params);

  const [results, facets, viewer, availability] = await Promise.all([
    searchDirectory(query),
    directoryFacetCounts(),
    getSessionUser(),
    getAvailability(),
  ]);

  // Ratings for the professionals on this page, in one query.
  const ratings = await reviewSummariesFor(results.rows.map((row) => row.user.id));

  if (!isEnabled(availability.settings, 'feature.directory')) {
    return (
      <div className="dl-container py-16">
        <EmptyState title={t.directory.switchedOff} description={page.switchedOffBody} />
      </div>
    );
  }

  const filtered = hasActiveFilters(query);
  const activeFilterCount =
    (query.q ? 1 : 0) +
    (query.kind && query.kind !== 'ALL' ? 1 : 0) +
    (query.areas?.length ?? 0) +
    (query.emirates?.length ?? 0) +
    (query.verifiedOnly ? 1 : 0) +
    (query.acceptsNewClients ? 1 : 0);
  const showUnverified = !query.verifiedOnly;
  const unverifiedInResults = results.rows.filter(
    (row) => row.user.verificationStatus !== 'APPROVED',
  ).length;

  return (
    <div className="dl-container py-8 sm:py-12">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{t.directory.title}</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          {page.introLead}
          <Link href="/how-verification-works" className="font-medium text-brand-700 hover:underline">
            {page.badgesMean}
          </Link>
        </p>
      </header>

      {/* ── Filters, in a dropdown rather than a permanent panel ─────── */}
      <details open={filtered} className="mb-6">
        <summary className="flex w-full cursor-pointer list-none items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-sm transition-colors hover:border-slate-300">
          <span className="inline-flex items-center gap-2">
            <Icon name="sliders" size={18} className="text-slate-500" />
            {t.directory.filterHeading}
            {activeFilterCount > 0 ? (
              <span className="rounded-full bg-slate-900 px-2 py-0.5 text-xs font-semibold text-white">
                {page.activeCount.replace('{count}', String(activeFilterCount))}
              </span>
            ) : null}
          </span>
          <span className="inline-flex items-center gap-3">
            {filtered ? (
              <Link href="/directory" className="text-xs font-medium text-brand-700 hover:underline">
                {page.clearAll}
              </Link>
            ) : null}
            <Icon name="chevronDown" size={18} className="text-slate-400" />
          </span>
        </summary>

        <Card className="mt-3">
          <DirectoryFilters query={query} facets={facets} />
        </Card>
      </details>

      {/* ── Results ───────────────────────────────────────────────────── */}
      <section aria-label={t.directory.results}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">
            {facets.totalPublished === 0 ? (
              page.noPublishedProfiles
            ) : (
              <>
                <strong className="text-slate-900">{results.total}</strong>{' '}
                {results.total === 1 ? page.profileOne : page.profileOther}
                {filtered ? ` ${t.directory.matching}` : ` ${t.directory.inDirectory}`}
              </>
            )}
          </p>
          {filtered ? (
            <Link href="/directory" className={buttonClasses('ghost', 'sm')}>
              {page.clearFilters}
            </Link>
          ) : null}
        </div>

          {showUnverified && unverifiedInResults > 0 ? (
            <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
              {unverifiedInResults === 1
                ? page.unverifiedOne
                : page.unverifiedMany.replace('{count}', String(unverifiedInResults))}{' '}
              {page.unverifiedLead}
              <em>{t.directory.verifiedOnly}</em>
              {page.unverifiedTail}
            </p>
          ) : null}

          {results.rows.length === 0 ? (
            facets.totalPublished === 0 ? (
              <EmptyState
                title={page.emptyTitle}
                description={<>{page.emptyBody}</>}
                action={
                  <div className="flex flex-wrap justify-center gap-3">
                    <Link href="/register?type=LAWYER" className={buttonClasses('primary', 'md')}>
                      {page.registerAsLawyer}
                    </Link>
                    <Link href="/register?type=FIRM" className={buttonClasses('secondary', 'md')}>
                      {page.registerFirm}
                    </Link>
                  </div>
                }
              />
            ) : (
              <EmptyState
                title={t.directory.nothingMatches}
                description={t.directory.nothingMatchesBody}
                action={
                  <Link href="/directory" className={buttonClasses('secondary', 'md')}>
                    {page.clearAllFilters}
                  </Link>
                }
              />
            )
          ) : (
            <>
              <ul className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
                {results.rows.map((listing) => (
                  <ListingCard
                    labels={{
                      emirates: t.directory.emirates,
                      languages: t.directory.languages,
                      contact: t.directory.contact,
                      experience: t.directory.experience,
                      years: t.directory.years,
                      noReviewsYet: t.directory.noReviewsYet,
                      phone: t.common.phone,
                      email: t.common.email,
                      address: t.publicPages.listingCard.address,
                      published: t.publicPages.listingCard.published,
                      notPublished: t.publicPages.listingCard.notPublished,
                      areasOfLaw: t.directory.areasOfLaw,
                      moreCount: t.publicPages.listingCard.moreCount,
                      notAcceptingNewClients: t.publicPages.listing.notAcceptingNewClients,
                      viewProfile: t.directory.viewProfile,
                      getInTouch: t.directory.getInTouch,
                      notReviewed: t.publicPages.listingCard.notReviewed,
                      badges: t.badges,
                      verificationStatus: t.verificationStatus,
                      accountType: (code) => accountTypeLabel(t, code),
                      emirate: (code) => emirateLabel(t, code),
                      place: (placeListing) => listingPlaceText(t, placeListing),
                      legalArea: (code) => legalAreaLabel(t, code),
                    }}
                    key={listing.id}
                    listing={listing}
                    reviewSummary={ratings.get(listing.user.id)}
                  />
                ))}
              </ul>

              {results.pageCount > 1 ? (
                <nav
                  className="mt-8 flex items-center justify-between gap-3"
                  aria-label={t.directory.pagination}
                >
                  {results.page > 1 ? (
                    <Link
                      href={buildDirectoryUrl(query, results.page - 1)}
                      className={buttonClasses('secondary', 'md')}
                    >
                      {page.previous}
                    </Link>
                  ) : (
                    <span />
                  )}
                  <span className="text-sm text-slate-600">
                    {page.pageOf
                      .replace('{page}', String(results.page))
                      .replace('{pageCount}', String(results.pageCount))}
                  </span>
                  {results.page < results.pageCount ? (
                    <Link
                      href={buildDirectoryUrl(query, results.page + 1)}
                      className={buttonClasses('secondary', 'md')}
                    >
                      {page.next}
                    </Link>
                  ) : (
                    <span />
                  )}
                </nav>
              ) : null}
            </>
          )}

          {viewer && (viewer.accountType === 'LAWYER' || viewer.accountType === 'FIRM') ? (
            <Card className="mt-8">
              <h2 className="font-medium text-slate-900">{t.directory.areYouListed}</h2>
              <p className="mt-1 text-sm text-slate-600">
                {page.signedInAs.replace(
                  '{kind}',
                  viewer.accountType === 'FIRM' ? page.kindFirm : page.kindLawyer,
                )}
              </p>
              <Link href="/listing" className={buttonClasses('secondary', 'md', 'mt-3')}>
                {page.manageListing}
              </Link>
            </Card>
          ) : null}
      </section>
    </div>
  );
}
