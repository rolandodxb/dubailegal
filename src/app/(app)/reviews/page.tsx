import type { Metadata } from 'next';
import Link from 'next/link';
import { requireMember } from '@/lib/auth';
import { getAvailability, isEnabled } from '@/lib/availability';
import {
  listReviewableCases,
  listReviewsByAuthor,
  listReviewsForProfessional,
  summariseReviews,
} from '@/server/services/review-service';
import { LEGAL_AREA_LABEL } from '@/lib/constants';
import { formatDate } from '@/lib/format';
import { Avatar } from '@/components/Avatar';
import { RatingBreakdown, StarRating } from '@/components/StarRating';
import { ReviewForm } from '@/components/forms/ReviewForm';
import { Alert, buttonClasses, Card, EmptyState } from '@/components/ui/primitives';

export const metadata: Metadata = { title: 'Reviews' };

const NOTICES: Record<string, string> = {
  published: 'Your review has been published.',
};

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
  const user = await requireMember();
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
        <h1 className="text-2xl font-semibold text-slate-900">Reviews</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          A review can only be written by the client on a case that professional actually accepted,
          and each case carries one review. That is what makes the rating worth reading.
        </p>
      </header>

      {notice && NOTICES[notice] ? <Alert tone="success">{NOTICES[notice]}</Alert> : null}

      {!reviewsEnabled ? (
        <Alert tone="warning" title="Reviews are switched off">
          An administrator has disabled reviews. Existing reviews are hidden while it is off.
        </Alert>
      ) : null}

      {/* ── What others said about me (professionals) ────────────────────── */}
      {isProfessional ? (
        <section>
          <h2 className="mb-3 font-semibold text-slate-900">
            What clients say about you ({publishedReceived.length})
          </h2>
          {received.length === 0 ? (
            <EmptyState
              title="No reviews yet"
              description="When a client reviews a case you accepted, it appears here."
            />
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
                        {review.author.profile?.fullName?.trim() || 'A client'} ·{' '}
                        {formatDate(review.createdAt)}
                      </span>
                      {review.status === 'HIDDEN' ? (
                        <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-800 ring-1 ring-inset ring-red-200">
                          Hidden by an administrator
                        </span>
                      ) : null}
                    </div>
                    {review.title ? (
                      <p className="mt-2 font-medium text-slate-900">{review.title}</p>
                    ) : null}
                    <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{review.body}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      Case {review.case.reference} · {review.case.title}
                      {review.hiddenReason ? ` · reason: ${review.hiddenReason}` : ''}
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
          <h2 className="mb-3 font-semibold text-slate-900">Leave a review</h2>
          <Card>
            {candidates.length === 0 && reviewable.length > 0 && listingFilter ? (
              <Alert tone="neutral" className="mb-5">
                You have no unreviewed case with that professional.{' '}
                <Link href="/reviews" className="font-medium underline">
                  See all the cases you can review
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
                  'Professional',
              }))}
            />
          </Card>
        </section>
      ) : null}

      {/* ── Reviews I wrote ─────────────────────────────────────────────── */}
      {written.length > 0 ? (
        <section>
          <h2 className="mb-3 font-semibold text-slate-900">Reviews I wrote ({written.length})</h2>
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
                      Hidden{review.hiddenReason ? `: ${review.hiddenReason}` : ''}
                    </span>
                  ) : (
                    <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-800 ring-1 ring-inset ring-green-200">
                      Published
                    </span>
                  )}
                </div>
                {review.title ? (
                  <p className="mt-3 font-medium text-slate-900">{review.title}</p>
                ) : null}
                <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{review.body}</p>
                <p className="mt-2 text-xs text-slate-500">
                  Case {review.case.reference} · {review.case.title} ·{' '}
                  {LEGAL_AREA_LABEL[review.case.caseType as keyof typeof LEGAL_AREA_LABEL] ?? ''} ·{' '}
                  {formatDate(review.createdAt)}
                </p>
              </Card>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Link href="/cases" className={buttonClasses('secondary', 'md')}>
          My cases
        </Link>
        {isProfessional ? (
          <Link href="/portfolio" className={buttonClasses('secondary', 'md')}>
            My portfolio
          </Link>
        ) : (
          <Link href="/directory" className={buttonClasses('secondary', 'md')}>
            Browse the directory
          </Link>
        )}
      </div>
    </div>
  );
}
