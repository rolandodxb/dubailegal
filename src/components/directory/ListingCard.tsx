import Link from 'next/link';
import type { DirectoryListing } from '@/server/services/directory-service';
import type { ReviewSummary } from '@/server/services/review-service';
import { ACCOUNT_TYPE_LABEL, EMIRATE_LABEL, LEGAL_AREA_LABEL } from '@/lib/constants';
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
}: {
  icon: IconName;
  label: string;
  present: boolean;
}) {
  return (
    <span
      className={cx('inline-flex items-center gap-1.5', present ? 'text-slate-700' : 'text-slate-300')}
      title={present ? `${label} published` : `${label} not published`}
    >
      <Icon name={icon} size={15} />
      <span className="sr-only">
        {label} {present ? 'published' : 'not published'}
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
}: {
  listing: DirectoryListing;
  reviewSummary?: ReviewSummary;
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
            {ACCOUNT_TYPE_LABEL[owner.accountType]}
            <span className="mx-1.5 font-normal text-slate-300">|</span>
            {EMIRATE_LABEL[listing.primaryEmirate]}
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
          <span className="text-xs text-slate-400">No reviews yet</span>
        )}
      </div>

      {/* ── Facts ──────────────────────────────────────────────────────── */}
      <dl className="grid grid-cols-[6.5rem_1fr] items-baseline gap-x-3 gap-y-2 border-t border-slate-100 px-5 py-4 text-sm">
        {listing.yearsOfExperience ? (
          <Fact label="Experience">
            <span className="tabular-nums">{listing.yearsOfExperience} years</span>
          </Fact>
        ) : null}
        <Fact label="Emirates">{listWithOverflow(listing.emirates.map((e) => EMIRATE_LABEL[e]))}</Fact>
        <Fact label="Languages">{listWithOverflow(listing.languages)}</Fact>
        <Fact label="Contact">
          <span className="inline-flex items-center gap-3">
            <ContactChannel icon="phone" label="Phone" present={Boolean(listing.contactPhone)} />
            <ContactChannel icon="mail" label="Email" present={Boolean(listing.contactEmail)} />
            <ContactChannel
              icon={isFirm ? 'building' : 'mapPin'}
              label="Address"
              present={Boolean(listing.addressLine)}
            />
          </span>
        </Fact>
      </dl>

      {/* ── Practice areas ─────────────────────────────────────────────── */}
      {listing.areas.length > 0 ? (
        <div className="border-t border-slate-100 px-5 py-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Areas of law
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {listing.areas.slice(0, MAX_AREAS_SHOWN).map((area) => (
              <li
                key={area}
                className="rounded-md bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-200"
              >
                {LEGAL_AREA_LABEL[area]}
              </li>
            ))}
            {extraAreas > 0 ? (
              <li className="rounded-md px-2 py-1 text-xs font-medium text-slate-500">
                +{extraAreas} more
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}

      {!listing.acceptsNewClients ? (
        <p className="border-t border-slate-100 px-5 py-2.5 text-xs font-medium text-amber-700">
          Not currently accepting new clients
        </p>
      ) : null}

      {/* ── Actions ────────────────────────────────────────────────────── */}
      <div className="mt-auto flex items-center gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3.5">
        <Link
          href={`/directory/${listing.id}`}
          className={buttonClasses('primary', 'sm', 'flex-1 justify-center')}
        >
          View profile
        </Link>
        <Link
          href={`/directory/${listing.id}#contact`}
          className={buttonClasses('secondary', 'sm', 'flex-1 justify-center')}
        >
          Get in touch
          <Icon name="arrowRight" size={15} />
        </Link>
      </div>

      {!isVerified ? (
        <span className="sr-only">
          This profile has not had its documents reviewed by a reviewer.
        </span>
      ) : null}
    </li>
  );
}
