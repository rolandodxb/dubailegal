import type { AccountType, VerificationStatus } from '@prisma/client';
import { BADGE, VERIFICATION_STATUS_LABEL } from '@/lib/constants';
import { cx } from './ui/primitives';

/**
 * The scalloped "verified" badge, in the colour reserved for the account type:
 *   blue  — verified individual account
 *   green — verified lawyer
 *   black — verified legal firm
 *
 * Rendered only when the account has an approval recorded by a named reviewer.
 * When it is not, callers should use <VerificationStatusPill> instead so an
 * unverified profile is never dressed up as verified.
 */

/** Scalloped circle, generated once at module load. */
function burstPath(lobes = 12, radius = 9.4, bulge = 1.7, centre = 12): string {
  const step = (Math.PI * 2) / lobes;
  let d = '';
  for (let index = 0; index < lobes; index += 1) {
    const start = index * step - Math.PI / 2;
    const end = start + step;
    const middle = start + step / 2;
    const x0 = centre + radius * Math.cos(start);
    const y0 = centre + radius * Math.sin(start);
    const x1 = centre + radius * Math.cos(end);
    const y1 = centre + radius * Math.sin(end);
    const controlX = centre + (radius + bulge) * Math.cos(middle);
    const controlY = centre + (radius + bulge) * Math.sin(middle);
    if (index === 0) d += `M${x0.toFixed(2)},${y0.toFixed(2)}`;
    d += `Q${controlX.toFixed(2)},${controlY.toFixed(2)} ${x1.toFixed(2)},${y1.toFixed(2)}`;
  }
  return `${d}Z`;
}

const BURST = burstPath();

const SIZES = { sm: 14, md: 18, lg: 26, xl: 40 } as const;

export function VerificationBadge({
  accountType,
  size = 'md',
  className,
  title,
  label,
}: {
  accountType: AccountType;
  size?: keyof typeof SIZES;
  className?: string;
  title?: string;
  /** The account-type label in the reader's language; English by default. */
  label?: string;
}) {
  const config = BADGE[accountType];
  const pixelSize = SIZES[size];
  const spoken = label ?? config.label;
  return (
    <svg
      viewBox="0 0 24 24"
      width={pixelSize}
      height={pixelSize}
      className={cx('inline-block shrink-0 align-[-0.15em]', className)}
      role="img"
      aria-label={spoken}
    >
      <title>{title ?? spoken}</title>
      <path d={BURST} fill={config.color} />
      <path
        d="M7.4 12.5 L10.6 15.6 L16.8 8.9"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const STATUS_TONES: Record<VerificationStatus, string> = {
  APPROVED: 'bg-green-50 text-green-800 ring-green-200',
  PENDING: 'bg-brand-50 text-brand-800 ring-brand-200',
  UNDER_REVIEW: 'bg-amber-50 text-amber-900 ring-amber-200',
  UNVERIFIED: 'bg-slate-100 text-slate-700 ring-slate-200',
  REJECTED: 'bg-red-50 text-red-800 ring-red-200',
};

/**
 * Combines the badge with its meaning. Verified accounts get the coloured
 * check plus the account-type label; everyone else gets an explicit,
 * non-decorative status so the absence of a badge is legible.
 */
export function VerificationStatusPill({
  accountType,
  status,
  size = 'sm',
  className,
  label,
  statusLabel,
}: {
  accountType: AccountType;
  status: VerificationStatus;
  size?: keyof typeof SIZES;
  className?: string;
  /** The account-type label in the reader's language; English by default. */
  label?: string;
  /** The status label in the reader's language; English by default. */
  statusLabel?: string;
}) {
  if (status === 'APPROVED') {
    return (
      <span
        className={cx(
          'inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-800 ring-1 ring-slate-200',
          className,
        )}
      >
        <VerificationBadge accountType={accountType} size={size} label={label} />
        {label ?? BADGE[accountType].label}
      </span>
    );
  }

  return (
    <span
      className={cx(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        STATUS_TONES[status],
        className,
      )}
    >
      {statusLabel ?? VERIFICATION_STATUS_LABEL[status]}
    </span>
  );
}
