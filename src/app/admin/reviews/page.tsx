import type { Metadata } from 'next';
import Link from 'next/link';
import { requireReviewer } from '@/lib/auth';
import { listAllReviewsForAdmin } from '@/server/services/review-service';
import { formatDateTime } from '@/lib/format';
import { buttonClasses, Card, EmptyState } from '@/components/ui/primitives';
import { ModerateReviewForm } from '@/components/forms/AdminOpsForms';
import { StarRating } from '@/components/StarRating';

export const metadata: Metadata = { title: 'Reviews' };

/**
 * Review moderation.
 *
 * Reviews are never deleted, only hidden, so the moderation history stays
 * intact and the author can be told why. Every decision is audited.
 */
export default async function AdminReviewsPage() {
  await requireReviewer();
  const reviews = await listAllReviewsForAdmin();

  const published = reviews.filter((review) => review.status === 'PUBLISHED');
  const hidden = reviews.filter((review) => review.status === 'HIDDEN');
  const average =
    published.length === 0
      ? null
      : Math.round((published.reduce((total, review) => total + review.rating, 0) / published.length) * 10) / 10;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Reviews</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          Every review is tied to a case the professional accepted, so a review cannot be written
          without a real engagement. Hide one if it breaks the rules: hiding keeps the record and
          tells the author, deleting would not.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Published', value: String(published.length) },
          { label: 'Hidden', value: String(hidden.length) },
          { label: 'Average of published', value: average === null ? '—' : average.toFixed(1) },
        ].map((stat) => (
          <Card key={stat.label}>
            <p className="text-sm text-slate-600">{stat.label}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{stat.value}</p>
          </Card>
        ))}
      </div>

      {reviews.length === 0 ? (
        <EmptyState
          title="No reviews have been written yet"
          description="Reviews appear here once a client reviews a case a professional accepted."
        />
      ) : (
        <ul className="space-y-4">
          {reviews.map((review) => (
            <Card as="li" key={review.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <StarRating value={review.rating} size={14} />
                    <span className="text-sm font-semibold text-slate-900">{review.rating}.0</span>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                        review.status === 'PUBLISHED'
                          ? 'bg-green-50 text-green-800 ring-green-200'
                          : 'bg-red-50 text-red-800 ring-red-200'
                      }`}
                    >
                      {review.status === 'PUBLISHED' ? 'Published' : 'Hidden'}
                    </span>
                  </div>
                  {review.title ? (
                    <p className="mt-2 font-medium text-slate-900">{review.title}</p>
                  ) : null}
                  <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{review.body}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    <Link
                      href={`/admin/users?q=${encodeURIComponent(review.author.email)}`}
                      className="text-brand-700 hover:underline"
                    >
                      {review.author.profile?.fullName?.trim() || review.author.email}
                    </Link>{' '}
                    reviewed{' '}
                    <Link
                      href={`/admin/users?q=${encodeURIComponent(review.target.email)}`}
                      className="text-brand-700 hover:underline"
                    >
                      {review.target.profile?.fullName?.trim() || review.target.email}
                    </Link>{' '}
                    · {formatDateTime(review.createdAt)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    About case {review.case.reference} — {review.case.title}
                  </p>
                  {review.hiddenReason ? (
                    <p className="mt-1 text-xs text-red-700">
                      Hidden because: {review.hiddenReason}
                    </p>
                  ) : null}
                </div>

                <div className="shrink-0">
                  <ModerateReviewForm reviewId={review.id} hidden={review.status === 'HIDDEN'} />
                </div>
              </div>
            </Card>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-3">
        <Link href="/admin/settings" className={buttonClasses('secondary', 'md')}>
          Settings
        </Link>
        <Link href="/admin/traffic" className={buttonClasses('secondary', 'md')}>
          Activity register
        </Link>
      </div>
    </div>
  );
}
