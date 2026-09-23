import type { ReviewSummary } from '@/server/services/review-service';
import { getI18n } from '@/lib/i18n';
import { cx } from './ui/primitives';

/**
 * Star rating.
 *
 * The numeric value is always rendered alongside the stars, so the rating is
 * never conveyed by shape or colour alone.
 */
export async function StarRating({
  value,
  size = 14,
  className,
}: {
  value: number;
  size?: number;
  className?: string;
}) {
  const { t } = await getI18n();
  const rounded = Math.round(value * 2) / 2;

  return (
    <span
      className={cx('inline-flex items-center gap-0.5', className)}
      role="img"
      aria-label={t.memberCases.starRating.outOfFive.replace('{value}', String(value))}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const fill = rounded >= star ? 1 : rounded >= star - 0.5 ? 0.5 : 0;
        return (
          <svg key={star} viewBox="0 0 20 20" width={size} height={size} aria-hidden="true">
            <defs>
              <linearGradient id={`half-${star}-${size}`}>
                <stop offset="50%" stopColor="#f59e0b" />
                <stop offset="50%" stopColor="#e2e8f0" />
              </linearGradient>
            </defs>
            <path
              d="M10 1.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.6 7.7l5.8-.8L10 1.6z"
              fill={fill === 1 ? '#f59e0b' : fill === 0.5 ? `url(#half-${star}-${size})` : '#e2e8f0'}
            />
          </svg>
        );
      })}
    </span>
  );
}

/** Compact rating line for a card: stars, value and how many reviews. */
export async function RatingLine({ summary }: { summary: ReviewSummary | undefined }) {
  const { t } = await getI18n();
  const labels = t.memberCases.starRating;

  if (!summary || summary.count === 0 || summary.average === null) {
    return <span className="text-xs text-slate-500">{t.directory.noReviewsYet}</span>;
  }

  return (
    <span className="inline-flex items-center gap-2">
      <StarRating value={summary.average} size={13} />
      <span className="text-xs font-semibold text-slate-800">{summary.average.toFixed(1)}</span>
      <span className="text-xs text-slate-500">
        {(summary.count === 1 ? labels.count : labels.countPlural).replace(
          '{count}',
          String(summary.count),
        )}
      </span>
    </span>
  );
}

/** The full breakdown shown on a professional's profile. */
export async function RatingBreakdown({ summary }: { summary: ReviewSummary }) {
  const { t } = await getI18n();
  const labels = t.memberCases.starRating;

  if (summary.count === 0 || summary.average === null) {
    return <p className="text-sm text-slate-600">{labels.breakdownEmpty}</p>;
  }

  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="text-center">
        <p className="text-3xl font-semibold text-slate-900">{summary.average.toFixed(1)}</p>
        <StarRating value={summary.average} size={16} className="mt-1" />
        <p className="mt-1 text-xs text-slate-500">
          {(summary.count === 1 ? labels.reviewCount : labels.reviewCountPlural).replace(
            '{count}',
            String(summary.count),
          )}
        </p>
      </div>

      <ul className="min-w-48 flex-1 space-y-1">
        {([5, 4, 3, 2, 1] as const).map((star) => {
          const count = summary.distribution[star];
          const percent = summary.count === 0 ? 0 : Math.round((count / summary.count) * 100);
          return (
            <li key={star} className="flex items-center gap-2 text-xs text-slate-600">
              <span className="w-8 shrink-0">
                {labels.star.replace('{count}', String(star))}
              </span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                <span
                  className="block h-full rounded-full bg-amber-400"
                  style={{ width: `${percent}%` }}
                />
              </span>
              <span className="w-6 shrink-0 text-right">{count}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
