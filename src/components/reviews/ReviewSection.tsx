import Link from 'next/link';
import {
  listReviewsForTarget,
  summariseReviews,
  type ReviewSummary,
} from '@/server/services/review-service';
import { LEGAL_AREA_LABEL } from '@/lib/constants';
import { formatDate } from '@/lib/format';
import { Avatar } from '@/components/Avatar';
import { VerificationBadge } from '@/components/VerificationBadge';
import { RatingBreakdown, StarRating } from '@/components/StarRating';
import { ReviewForm } from '@/components/forms/ReviewForm';
import { buttonClasses, Card } from '@/components/ui/primitives';
import { Icon } from '@/components/icons';

export async function getReviewData(targetUserId: string) {
  const reviews = await listReviewsForTarget(targetUserId);
  const summary: ReviewSummary = summariseReviews(reviews.map((review) => review.rating));
  return { reviews, summary };
}

export type ReviewableCaseOption = {
  id: string;
  reference: string;
  title: string;
  professional: string;
};

/**
 * The review section on a professional's profile.
 *
 * Writing a review happens here rather than on a separate page, so the act is
 * available the moment somebody opens the profile. It is deliberately not a free
 * comment box: the form only accepts a case this professional actually accepted,
 * and each case carries one review, which is what makes the rating mean
 * something. When the reader is not eligible, the section says exactly why.
 */
export async function ReviewSection({
  targetUserId,
  targetName,
  isSignedIn,
  isSelf,
  reviewsEnabled,
  reviewableCases,
}: {
  targetUserId: string;
  targetName: string;
  isSignedIn: boolean;
  isSelf: boolean;
  reviewsEnabled: boolean;
  reviewableCases: ReviewableCaseOption[];
}) {
  const { reviews, summary } = await getReviewData(targetUserId);
  const canWrite = reviewsEnabled && isSignedIn && !isSelf && reviewableCases.length > 0;

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold text-slate-900">Reviews</h2>
        {summary.count > 0 && summary.average !== null ? (
          <span className="inline-flex items-center gap-2">
            <StarRating value={summary.average} size={15} />
            <span className="text-sm font-semibold tabular-nums text-slate-900">
              {summary.average.toFixed(1)}
            </span>
            <span className="text-xs text-slate-500">
              ({summary.count} review{summary.count === 1 ? '' : 's'})
            </span>
          </span>
        ) : null}
      </div>

      {summary.count > 0 ? (
        <div className="mt-4 border-b border-slate-100 pb-5">
          <RatingBreakdown summary={summary} />
        </div>
      ) : null}

      {/* ── Write a review, right here ─────────────────────────────────── */}
      <div className={summary.count > 0 ? 'mt-5' : 'mt-4'}>
        {!reviewsEnabled ? (
          <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Reviews are currently switched off by the administrators of this installation.
          </p>
        ) : isSelf ? (
          <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
            This is your own profile, so you cannot review yourself.
          </p>
        ) : !isSignedIn ? (
          <div className="rounded-lg border border-brand-200 bg-brand-50 p-4">
            <p className="text-sm text-brand-900">
              Sign in to leave a review of {targetName}. Reviews can only be written by a client
              whose case this professional accepted.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/login" className={buttonClasses('primary', 'sm')}>
                Sign in
              </Link>
              <Link href="/register" className={buttonClasses('secondary', 'sm')}>
                Create an account
              </Link>
            </div>
          </div>
        ) : canWrite ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 sm:p-5">
            <div className="mb-4 flex items-start gap-2.5">
              <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                <Icon name="star" size={14} />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Write a review of {targetName}
                </h3>
                <p className="mt-0.5 text-xs text-slate-600">
                  Choose a case you had with them and give it a rating from one to five stars.
                </p>
              </div>
            </div>
            <ReviewForm cases={reviewableCases} />
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-900">You cannot review yet</h3>
            <p className="mt-1 text-sm text-slate-600">
              A review can only be written against a case this professional accepted, and each case
              can be reviewed once. You have no unreviewed accepted case with {targetName} yet.
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Once they accept a case of yours, the review form appears here.
            </p>
          </div>
        )}
      </div>

      {/* ── What others said ───────────────────────────────────────────── */}
      {reviews.length === 0 ? (
        <p className="mt-5 border-t border-slate-100 pt-5 text-sm text-slate-600">
          No reviews yet for {targetName}.
        </p>
      ) : (
        <ul className="mt-5 divide-y divide-slate-100 border-t border-slate-100">
          {reviews.map((review) => {
            const authorName = review.author.profile?.fullName?.trim() || 'A Dubai Legal member';
            return (
              <li key={review.id} className="py-5">
                <div className="flex items-start gap-3">
                  <Avatar
                    userId={review.author.id}
                    name={authorName}
                    hasPhoto={Boolean(review.author.profile?.avatarDocumentId)}
                    size={40}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-medium text-slate-900">{authorName}</span>
                      {review.author.verificationStatus === 'APPROVED' ? (
                        <VerificationBadge accountType={review.author.accountType} size="sm" />
                      ) : null}
                      <span className="text-xs text-slate-500">{formatDate(review.createdAt)}</span>
                    </div>

                    <div className="mt-1 flex items-center gap-2">
                      <StarRating value={review.rating} size={14} />
                      <span className="text-xs font-semibold tabular-nums text-slate-800">
                        {review.rating}.0
                      </span>
                    </div>

                    {review.title ? (
                      <p className="mt-2 font-medium text-slate-900">{review.title}</p>
                    ) : null}
                    <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{review.body}</p>

                    <p className="mt-2 text-xs text-slate-500">
                      About case {review.case.reference} ·{' '}
                      {LEGAL_AREA_LABEL[review.case.caseType] ?? review.case.caseType}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
