import type { Metadata } from 'next';
import Link from 'next/link';
import { requireMember } from '@/lib/auth';
import { getI18n } from '@/lib/i18n';
import { legalAreaLabel } from '@/lib/i18n/labels';
import { getAvailability, isEnabled } from '@/lib/availability';
import {
  listReviewableCases,
  listReviewsByAuthor,
  listReviewsForProfessional,
  summariseReviews,
} from '@/server/services/review-service';
import { formatDate } from '@/lib/format';
import { Avatar } from '@/components/Avatar';
import { RatingBreakdown, StarRating } from '@/components/StarRating';
import { ReviewForm } from '@/components/forms/ReviewForm';
import { Alert, buttonClasses, Card, EmptyState } from '@/components/ui/primitives';

export const metadata: Metadata = { title: 'Reviews' };

/**
 * Reviews, from both sides.
 *
 * A client writes here against a case a professional accepted; a professional
 * reads what their clients said. Reviews are tied to a real engagement, so
 * neither side can manufacture one.
 */
export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ listing?: string; notice?: string }>;
}) {
  const [{ t }, user] = await Promise.all([getI18n(), requireMember()]);
  const labels = t.memberCases.reviews;
  const notices: Record<string, string> = { published: labels.published };
  const [{ listing: listingFilter, notice }, availability] = await Promise.all([
    searchParams,
    getAvailability(),
  ]);

  const reviewsEnabled = isEnabled(availability.settings, 'feature.reviews');
  const isProfessional = user.accountType === 'LAWYER' || user.accountType === 'FIRM';

  const [reviewable, written, received] = await Promise.all([
    reviewsEnabled ? listReviewableCases(user.id) : Promise.resolve([]),
    listReviewsByAuthor(user.id),
    isProfessional ? listReviewsForProfessional(user.id) : Promise.resolve([]),
  ]);

  const candidates = listingFilter
    ? reviewable.filter((item) => item.listingId === listingFilter)
    : reviewable;

  const receivedSummary = summariseReviews(received.map((review) => review.rating));
  const publishedReceived = received.filter((review) => review.status === 'PUBLISHED');

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">{labels.title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">{labels.intro}</p>
      </header>

      {notice && notices[notice] ? <Alert tone="success">{notices[notice]}</Alert> : null}

      {!reviewsEnabled ? (
        <Alert tone="warning" title={labels.switchedOff}>
          {labels.switchedOffBody}
        </Alert>
      ) : null}

      {/* ── What others said about me (professionals) ────────────────────── */}
      {isProfessional ? (
        <section>
          <h2 className="mb-3 font-semibold text-slate-900">
            {labels.whatClientsSay.replace('{count}', String(publishedReceived.length))}
          </h2>
          {received.length === 0 ? (
            <EmptyState title={t.directory.noReviewsYet} description={labels.noReceived} />
          ) : (
            <Card>
              <RatingBreakdown summary={receivedSummary} />
              <ul className="mt-5 divide-y divide-slate-100">
                {received.map((review) => (
                  <li key={review.id} className="py-4">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <StarRating value={review.rating} size={14} />
                      <span className="text-sm font-semibold text-slate-900">{review.rating}.0</span>
                      <span className="text-xs text-slate-500">
                        {review.author.profile?.fullName?.trim() || labels.aClient} ·{' '}
                        {formatDate(review.createdAt)}
                      </span>
                      {review.status === 'HIDDEN' ? (
                        <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-800 ring-1 ring-inset ring-red-200">
                          {labels.hiddenByAdmin}
                        </span>
                      ) : null}
                    </div>
                    {review.title ? (
                      <p className="mt-2 font-medium text-slate-900">{review.title}</p>
                    ) : null}
                    <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{review.body}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      {labels.caseRef
                        .replace('{reference}', review.case.reference)
                        .replace('{title}', review.case.title)}
                      {review.hiddenReason
                        ? labels.reason.replace('{reason}', review.hiddenReason)
                        : ''}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </section>
      ) : null}

      {/* ── Write a review ──────────────────────────────────────────────── */}
      {reviewsEnabled ? (
        <section>
          <h2 className="mb-3 font-semibold text-slate-900">{labels.leaveReview}</h2>
          <Card>
            {candidates.length === 0 && reviewable.length > 0 && listingFilter ? (
              <Alert tone="neutral" className="mb-5">
                {labels.noUnreviewedBefore}
                <Link href="/reviews" className="font-medium underline">
                  {labels.seeAllReviewable}
                </Link>
                .
              </Alert>
            ) : null}
            <ReviewForm
              cases={candidates.map((item) => ({
                id: item.id,
                reference: item.reference,
                title: item.title,
                professional:
                  item.firm?.legalName ??
                  item.lawyer?.user.profile?.fullName?.trim() ??
                  labels.professional,
              }))}
              labels={t.memberCases.reviewForm}
            />
          </Card>
        </section>
      ) : null}

      {/* ── Reviews I wrote ─────────────────────────────────────────────── */}
      {written.length > 0 ? (
        <section>
          <h2 className="mb-3 font-semibold text-slate-900">
            {labels.reviewsIWrote.replace('{count}', String(written.length))}
          </h2>
          <ul className="space-y-3">
            {written.map((review) => (
              <Card as="li" key={review.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <Avatar
                      userId={review.target.id}
                      name={review.target.profile?.fullName?.trim() || review.target.email}
                      hasPhoto={false}
                      size={40}
                    />
                    <div>
                      <p className="font-medium text-slate-900">
                        {review.target.profile?.fullName?.trim() || review.target.email}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <StarRating value={review.rating} size={13} />
                        <span className="text-xs font-semibold text-slate-800">
                          {review.rating}.0
                        </span>
                      </div>
                    </div>
                  </div>
                  {review.status === 'HIDDEN' ? (
                    <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-800 ring-1 ring-inset ring-red-200">
                      {labels.hidden}
                      {review.hiddenReason
                        ? labels.hiddenReason.replace('{reason}', review.hiddenReason)
                        : ''}
                    </span>
                  ) : (
                    <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-800 ring-1 ring-inset ring-green-200">
                      {labels.publishedBadge}
                    </span>
                  )}
                </div>
                {review.title ? (
                  <p className="mt-3 font-medium text-slate-900">{review.title}</p>
                ) : null}
                <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{review.body}</p>
                <p className="mt-2 text-xs text-slate-500">
                  {labels.caseArea
                    .replace('{reference}', review.case.reference)
                    .replace('{title}', review.case.title)
                    .replace(
                      '{area}',
                      legalAreaLabel(t, review.case.caseType as keyof typeof t.labels.legalArea) ?? '',
                    )
                    .replace('{date}', formatDate(review.createdAt))}
                </p>
              </Card>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Link href="/cases" className={buttonClasses('secondary', 'md')}>
          {t.items.myCases}
        </Link>
        {isProfessional ? (
          <Link href="/portfolio" className={buttonClasses('secondary', 'md')}>
            {t.items.portfolio}
          </Link>
        ) : (
          <Link href="/directory" className={buttonClasses('secondary', 'md')}>
            {t.dashboard.browseDirectory}
          </Link>
        )}
      </div>
    </div>
  );
}
