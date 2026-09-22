import type { Metadata } from 'next';
import Link from 'next/link';
import { getSessionUser } from '@/lib/auth';
import { getI18n } from '@/lib/i18n';
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

export const metadata: Metadata = {
  title: 'Directory of lawyers and legal firms',
  description:
    'Browse lawyers and legal firms in the UAE, filtered by area of law and emirate. Verification badges show which profiles have had their documents reviewed.',
};

export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const [{ t }, params] = await Promise.all([getI18n(), searchParams]);
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
        <EmptyState
          title={t.directory.switchedOff}
          description="An administrator has temporarily disabled the public directory. It will be back once they switch it on again."
        />
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
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Directory of lawyers and legal firms
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Every profile below belongs to a real registered member. Use the filters to narrow by area
          of law and emirate. A coloured check means a reviewer approved that member&rsquo;s
          documents; profiles without one are labelled clearly.{' '}
          <Link href="/how-verification-works" className="font-medium text-brand-700 hover:underline">
            What the badges mean
          </Link>
        </p>
      </header>

      {/* ── Filters, in a dropdown rather than a permanent panel ─────── */}
      <details open={filtered} className="mb-6">
        <summary className="flex w-full cursor-pointer list-none items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-sm transition-colors hover:border-slate-300">
          <span className="inline-flex items-center gap-2">
            <Icon name="sliders" size={18} className="text-slate-500" />
            Filter the directory
            {activeFilterCount > 0 ? (
              <span className="rounded-full bg-slate-900 px-2 py-0.5 text-xs font-semibold text-white">
                {activeFilterCount} active
              </span>
            ) : null}
          </span>
          <span className="inline-flex items-center gap-3">
            {filtered ? (
              <Link href="/directory" className="text-xs font-medium text-brand-700 hover:underline">
                Clear all
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
              'No published profiles yet'
            ) : (
              <>
                <strong className="text-slate-900">{results.total}</strong>{' '}
                {results.total === 1 ? 'profile' : 'profiles'}
                {filtered ? ' match your filters' : ' in the directory'}
              </>
            )}
          </p>
          {filtered ? (
            <Link href="/directory" className={buttonClasses('ghost', 'sm')}>
              Clear filters
            </Link>
          ) : null}
        </div>

          {showUnverified && unverifiedInResults > 0 ? (
            <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
              {unverifiedInResults === 1 ? 'One profile in these results has' : `${unverifiedInResults} profiles in these results have`}{' '}
              not had documents reviewed yet. Tick <em>{t.directory.verifiedOnly}</em> to hide them.
            </p>
          ) : null}

          {results.rows.length === 0 ? (
            facets.totalPublished === 0 ? (
              <EmptyState
                title="The directory is empty because nobody has published a profile yet"
                description={
                  <>
                    Dubai Legal does not invent placeholder lawyers or firms. Profiles appear here
                    once a lawyer or legal firm registers, completes their legal information and
                    publishes their listing.
                  </>
                }
                action={
                  <div className="flex flex-wrap justify-center gap-3">
                    <Link href="/register?type=LAWYER" className={buttonClasses('primary', 'md')}>
                      Register as a lawyer
                    </Link>
                    <Link href="/register?type=FIRM" className={buttonClasses('secondary', 'md')}>
                      Register a legal firm
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
                    Clear all filters
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
                      ← Previous
                    </Link>
                  ) : (
                    <span />
                  )}
                  <span className="text-sm text-slate-600">
                    Page {results.page} of {results.pageCount}
                  </span>
                  {results.page < results.pageCount ? (
                    <Link
                      href={buildDirectoryUrl(query, results.page + 1)}
                      className={buttonClasses('secondary', 'md')}
                    >
                      Next →
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
                You are signed in as a {viewer.accountType === 'FIRM' ? 'legal firm' : 'lawyer'}.
                Manage how your profile appears, or publish it if it is still a draft.
              </p>
              <Link href="/listing" className={buttonClasses('secondary', 'md', 'mt-3')}>
                Manage my listing
              </Link>
            </Card>
          ) : null}
      </section>
    </div>
  );
}
