import Link from 'next/link';
import type { DirectoryListing } from '@/server/services/directory-service';
import type { ReviewSummary } from '@/server/services/review-service';
import { Avatar } from '@/components/Avatar';
import { VerificationStatusPill } from '@/components/VerificationBadge';
import { StarRating } from '@/components/StarRating';
import { Icon, type IconName } from '@/components/icons';
import { buttonClasses, cx } from '@/components/ui/primitives';

const MAX_AREAS_SHOWN = 3;

/** How many emirates or languages to list before summarising the rest. */
const MAX_LISTED = 3;

function listWithOverflow(values: string[], max = MAX_LISTED): string {
  if (values.length === 0) return '—';
  if (values.length <= max) return values.join(', ');
  return `${values.slice(0, max).join(', ')} +${values.length - max}`;
}

/**
 * A single fact row.
 *
 * The label column is a fixed width across every row and every card, so values
 * line up down the page instead of drifting with the length of each label.
 */
function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-slate-500">{label}</dt>
      <dd className="min-w-0 text-slate-900">{children}</dd>
    </>
  );
}

/** A contact channel, filled when published and muted when not. */
function ContactChannel({
  icon,
  label,
  present,
  published,
  notPublished,
}: {
  icon: IconName;
  label: string;
  present: boolean;
  published: string;
  notPublished: string;
}) {
  return (
    <span
      className={cx('inline-flex items-center gap-1.5', present ? 'text-slate-700' : 'text-slate-300')}
      title={`${label} ${present ? published : notPublished}`}
    >
      <Icon name={icon} size={15} />
      <span className="sr-only">
        {label} {present ? published : notPublished}
      </span>
    </span>
  );
}

/**
 * One directory result.
 *
 * Built as a single column so every element shares one left edge, with a fixed
 * label column in the facts list so values align down the page. The sections are
 * separated by hairlines rather than floating panels, which is what made the
 * previous version look uneven.
 */
export function ListingCard({
  listing,
  reviewSummary,
  labels,
}: {
  listing: DirectoryListing;
  reviewSummary?: ReviewSummary;
  /** The words this card shows, in the reader's language. */
  labels: {
    emirates: string;
    languages: string;
    contact: string;
    experience: string;
    years: string;
    noReviewsYet: string;
    phone: string;
    email: string;
    address: string;
    published: string;
    notPublished: string;
    areasOfLaw: string;
    moreCount: string;
    notAcceptingNewClients: string;
    viewProfile: string;
    getInTouch: string;
    notReviewed: string;
    badges: { USER: string; LAWYER: string; FIRM: string };
    verificationStatus: {
      UNVERIFIED: string;
      PENDING: string;
      UNDER_REVIEW: string;
      APPROVED: string;
      REJECTED: string;
    };
    /** The stored code, resolved to the word this reader uses for it. */
    accountType: (code: string) => string;
    emirate: (code: string) => string;
    legalArea: (code: string) => string;
  };
}) {
  const owner = listing.user;
  const profile = owner.profile;
  const isVerified = owner.verificationStatus === 'APPROVED' && owner.verifiedAt !== null;
  const extraAreas = Math.max(0, listing.areas.length - MAX_AREAS_SHOWN);
  const isFirm = owner.accountType === 'FIRM';

  return (
    <li className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg">
      {/* ── Identity ───────────────────────────────────────────────────── */}
      <div className="flex items-start gap-4 p-5">
        <Avatar
          userId={owner.id}
          name={listing.displayName}
          hasPhoto={Boolean(profile?.avatarDocumentId)}
          size={56}
          shape={isFirm ? 'rounded' : 'circle'}
        />

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-semibold leading-6 text-slate-900">
            {listing.displayName}
          </h3>
          <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {labels.accountType(owner.accountType)}
            <span className="mx-1.5 font-normal text-slate-300">|</span>
            {labels.emirate(listing.primaryEmirate)}
          </p>
          {listing.headline ? (
            <p className="mt-2 line-clamp-2 text-sm leading-5 text-slate-600">{listing.headline}</p>
          ) : null}
        </div>
      </div>

      {/* ── Verification and rating ────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-slate-100 px-5 py-3">
        <VerificationStatusPill
          accountType={owner.accountType}
          status={owner.verificationStatus}
          label={labels.badges[owner.accountType]}
          statusLabel={labels.verificationStatus[owner.verificationStatus]}
        />

        {reviewSummary && reviewSummary.count > 0 && reviewSummary.average !== null ? (
          <span className="inline-flex items-center gap-2">
            <StarRating value={reviewSummary.average} size={13} />
            <span className="text-xs font-semibold tabular-nums text-slate-900">
              {reviewSummary.average.toFixed(1)}
            </span>
            <span className="text-xs text-slate-500">({reviewSummary.count})</span>
          </span>
        ) : (
          <span className="text-xs text-slate-400">{labels.noReviewsYet}</span>
        )}
      </div>

      {/* ── Facts ──────────────────────────────────────────────────────── */}
      <dl className="grid grid-cols-[6.5rem_1fr] items-baseline gap-x-3 gap-y-2 border-t border-slate-100 px-5 py-4 text-sm">
        {listing.yearsOfExperience ? (
          <Fact label={labels.experience}>
            <span className="tabular-nums">{labels.years.replace('{count}', String(listing.yearsOfExperience))}</span>
          </Fact>
        ) : null}
        <Fact label={labels.emirates}>
          {listWithOverflow(listing.emirates.map((e) => labels.emirate(e)))}
        </Fact>
        <Fact label={labels.languages}>{listWithOverflow(listing.languages)}</Fact>
        <Fact label={labels.contact}>
          <span className="inline-flex items-center gap-3">
            <ContactChannel
              icon="phone"
              label={labels.phone}
              present={Boolean(listing.contactPhone)}
              published={labels.published}
              notPublished={labels.notPublished}
            />
            <ContactChannel
              icon="mail"
              label={labels.email}
              present={Boolean(listing.contactEmail)}
              published={labels.published}
              notPublished={labels.notPublished}
            />
            <ContactChannel
              icon={isFirm ? 'building' : 'mapPin'}
              label={labels.address}
              present={Boolean(listing.addressLine)}
              published={labels.published}
              notPublished={labels.notPublished}
            />
          </span>
        </Fact>
      </dl>

      {/* ── Practice areas ─────────────────────────────────────────────── */}
      {listing.areas.length > 0 ? (
        <div className="border-t border-slate-100 px-5 py-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {labels.areasOfLaw}
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {listing.areas.slice(0, MAX_AREAS_SHOWN).map((area) => (
              <li
                key={area}
                className="rounded-md bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-200"
              >
                {labels.legalArea(area)}
              </li>
            ))}
            {extraAreas > 0 ? (
              <li className="rounded-md px-2 py-1 text-xs font-medium text-slate-500">
                {labels.moreCount.replace('{count}', String(extraAreas))}
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}

      {!listing.acceptsNewClients ? (
        <p className="border-t border-slate-100 px-5 py-2.5 text-xs font-medium text-amber-700">
          {labels.notAcceptingNewClients}
        </p>
      ) : null}

      {/* ── Actions ────────────────────────────────────────────────────── */}
      <div className="mt-auto flex items-center gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3.5">
        <Link
          href={`/directory/${listing.id}`}
          className={buttonClasses('primary', 'sm', 'flex-1 justify-center')}
        >
          {labels.viewProfile}
        </Link>
        <Link
          href={`/directory/${listing.id}#contact`}
          className={buttonClasses('secondary', 'sm', 'flex-1 justify-center')}
        >
          {labels.getInTouch}
          <Icon name="arrowRight" size={15} />
        </Link>
      </div>

      {!isVerified ? <span className="sr-only">{labels.notReviewed}</span> : null}
    </li>
  );
}
