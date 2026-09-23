import type { Metadata } from 'next';
import Link from 'next/link';
import { getI18n } from '@/lib/i18n';
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
  const [, { t }] = await Promise.all([requireReviewer(), getI18n()]);
  const reviews = await listAllReviewsForAdmin();

  const published = reviews.filter((review) => review.status === 'PUBLISHED');
  const hidden = reviews.filter((review) => review.status === 'HIDDEN');
  const average =
    published.length === 0
      ? null
      : Math.round((published.reduce((total, review) => total + review.rating, 0) / published.length) * 10) / 10;

  /** The stored status stays the stored status; only the word changes. */
  const statusLabel: Record<string, string> = t.admin.reviews.status;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">{t.items.reviews}</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">{t.admin.reviews.intro}</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: statusLabel.PUBLISHED, value: String(published.length) },
          { label: statusLabel.HIDDEN, value: String(hidden.length) },
          {
            label: t.admin.reviews.averageOfPublished,
            value: average === null ? '—' : average.toFixed(1),
          },
        ].map((stat) => (
          <Card key={stat.label}>
            <p className="text-sm text-slate-600">{stat.label}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{stat.value}</p>
          </Card>
        ))}
      </div>

      {reviews.length === 0 ? (
        <EmptyState
          title={t.admin.reviews.empty.title}
          description={t.admin.reviews.empty.body}
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
                      {statusLabel[review.status] ?? review.status}
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
                    {t.admin.reviews.reviewed}{' '}
                    <Link
                      href={`/admin/users?q=${encodeURIComponent(review.target.email)}`}
                      className="text-brand-700 hover:underline"
                    >
                      {review.target.profile?.fullName?.trim() || review.target.email}
                    </Link>{' '}
                    · {formatDateTime(review.createdAt)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {t.admin.reviews.aboutCase
                      .replace('{reference}', review.case.reference)
                      .replace('{title}', review.case.title)}
                  </p>
                  {review.hiddenReason ? (
                    <p className="mt-1 text-xs text-red-700">
                      {t.admin.reviews.hiddenBecause.replace('{reason}', review.hiddenReason)}
                    </p>
                  ) : null}
                </div>

                <div className="shrink-0">
                  <ModerateReviewForm
                    reviewId={review.id}
                    hidden={review.status === 'HIDDEN'}
                    labels={{
                      placeholder: t.admin.reviews.moderate.reasonPlaceholder,
                      saving: t.admin.reviews.moderate.saving,
                      confirmRestore: t.admin.reviews.moderate.confirmRestore,
                      confirmHide: t.admin.reviews.moderate.confirmHide,
                      restore: t.admin.reviews.moderate.restore,
                      hide: t.admin.reviews.moderate.hide,
                    }}
                  />
                </div>
              </div>
            </Card>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-3">
        <Link href="/admin/settings" className={buttonClasses('secondary', 'md')}>
          {t.items.settings}
        </Link>
        <Link href="/admin/traffic" className={buttonClasses('secondary', 'md')}>
          {t.items.activityRegister}
        </Link>
      </div>
    </div>
  );
}
