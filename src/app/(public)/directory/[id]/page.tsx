import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { getListingById } from '@/server/services/directory-service';
import { listReviewableCases, reviewSummariesFor } from '@/server/services/review-service';
import { listPostsForProfile } from '@/server/services/blog-service';
import { getAvailability, isEnabled } from '@/lib/availability';
import { ReviewSection } from '@/components/reviews/ReviewSection';
import { StarRating } from '@/components/StarRating';
import { ACCOUNT_TYPE_LABEL, DOCUMENT_KIND_LABEL, EMIRATE_LABEL, LEGAL_AREA_LABEL } from '@/lib/constants';
import { calculateAge, formatDate, safeExternalUrl } from '@/lib/format';
import { minutesLabel } from '@/lib/time';
import { Avatar } from '@/components/Avatar';
import { VerificationBadge, VerificationStatusPill } from '@/components/VerificationBadge';
import { InquiryForm } from '@/components/forms/InquiryForm';
import { Alert, buttonClasses, Card, Chip, DescriptionList, cx } from '@/components/ui/primitives';
import { Icon } from '@/components/icons';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const listing = await getListingById(id);
  if (!listing || !listing.published) return { title: 'Profile not found' };
  return {
    title: listing.displayName,
    description: listing.headline ?? `Profile of ${listing.displayName} on Dubai Legal.`,
  };
}

/**
 * Describes whether a licence is still in date. A reviewer approved the
 * document; this says whether it is currently valid, which is not the same
 * claim and is not left to the reader to work out.
 */
function licenseValidity(expiresOn: Date | null | undefined): React.ReactNode {
  if (!expiresOn) return 'No expiry date recorded';
  const formatted = formatDate(expiresOn);
  const days = Math.ceil((expiresOn.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  if (days < 0) return <span className="font-medium text-red-700">{formatted} — expired</span>;
  if (days <= 90) {
    return (
      <span className="font-medium text-amber-700">
        {formatted} — expires in {days} day{days === 1 ? '' : 's'}
      </span>
    );
  }
  return <span className="font-medium text-green-700">{formatted} — currently valid</span>;
}

type Tab = 'posts' | 'about' | 'reviews' | 'contact';

const TABS: { key: Tab; label: string }[] = [
  { key: 'posts', label: 'Posts' },
  { key: 'about', label: 'About' },
  { key: 'reviews', label: 'Recommendations' },
  { key: 'contact', label: 'Contact' },
];

/**
 * A professional's page, laid out the way a page like this is read: a cover and a
 * face, the name and what they do, the actions you might take, then tabs over a
 * two-column body with an intro on the left and the feed on the right.
 *
 * Every fact on it is the same fact the rest of the product shows — the licence
 * is displayed only for a verified member, and the contact details are only what
 * the member chose to publish. The layout changed; the claims did not.
 */
export default async function ListingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ id }, { tab: tabParam }] = await Promise.all([params, searchParams]);

  const [listing, viewer, availability] = await Promise.all([
    getListingById(id),
    getSessionUser(),
    getAvailability(),
  ]);

  if (!listing) notFound();

  const owner = listing.user;

  // A lawyer whose account was created inside a firm has no standalone public
  // profile: they are shown under "Lawyers at this firm" on the firm's page. An
  // unpublished draft is likewise not public. Either way the owner, their firm
  // and a reviewer may still open it, so it can be edited and checked.
  const representedByFirm = Boolean(
    owner.lawyerProfile?.createdByFirmId && owner.lawyerProfile?.affiliatedFirmId,
  );
  const hiddenFromPublic = representedByFirm || !listing.published;

  const viewerIsOwner = viewer?.id === owner.id;
  const viewerIsReviewer = viewer?.roles.includes('REVIEWER') ?? false;
  let viewerIsFirm = false;
  if (viewer && !viewerIsOwner && !viewerIsReviewer && owner.lawyerProfile?.affiliatedFirmId) {
    const firm = await prisma.firmProfile.findUnique({
      where: { userId: viewer.id },
      select: { id: true },
    });
    viewerIsFirm = firm?.id === owner.lawyerProfile.affiliatedFirmId;
  }

  if (hiddenFromPublic && !viewerIsOwner && !viewerIsReviewer && !viewerIsFirm) notFound();

  const profile = owner.profile;
  const isVerified = owner.verificationStatus === 'APPROVED' && owner.verifiedAt !== null;
  const isOwnListing = viewer?.id === owner.id;
  const tab: Tab = TABS.some((entry) => entry.key === tabParam) ? (tabParam as Tab) : 'posts';

  // Could this viewer review this professional? Only if they have an accepted
  // case that has not been reviewed yet.
  const reviewableCases = viewer
    ? (await listReviewableCases(viewer.id)).filter((item) => item.listingId === listing.id)
    : [];
  const canSendCase = isEnabled(availability.settings, 'feature.case_submission');
  const canInquire = isEnabled(availability.settings, 'feature.inquiries');

  const [summaries, posts] = await Promise.all([
    reviewSummariesFor([owner.id]),
    // Both the recommendations other members wrote and anything the practice
    // posted to its own page.
    listPostsForProfile(listing.id, owner.id, 10),
  ]);
  const summary = summaries.get(owner.id) ?? {
    count: 0,
    average: null,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  };

  const age = calculateAge(profile?.dateOfBirth ?? null);
  const website = safeExternalUrl(listing.website);
  // Only a contact address the member deliberately published. Falling back to
  // the account's login email would leak a private address into a public page.
  const contactEmail = listing.contactEmail;
  const category = `${ACCOUNT_TYPE_LABEL[owner.accountType]} · ${EMIRATE_LABEL[listing.primaryEmirate]}`;
  const tabHref = (key: Tab) => `/directory/${listing.id}?tab=${key}`;

  const reviewProps = {
    targetUserId: owner.id,
    targetName: listing.displayName,
    isSignedIn: Boolean(viewer),
    isSelf: isOwnListing,
    reviewsEnabled: isEnabled(availability.settings, 'feature.reviews'),
    reviewableCases: reviewableCases.map((item) => ({
      id: item.id,
      reference: item.reference,
      title: item.title,
      professional:
        item.firm?.legalName ??
        item.lawyer?.user.profile?.fullName?.trim() ??
        listing.displayName,
    })),
  };

  return (
    <div className="dl-container py-6 sm:py-10">
      <nav className="mb-4 text-sm" aria-label="Breadcrumb">
        <Link href="/directory" className="text-brand-700 hover:underline">
          ← Back to the directory
        </Link>
      </nav>

      {hiddenFromPublic ? (
        <Alert tone="info" className="mb-4">
          {representedByFirm
            ? 'This lawyer is registered with a firm, so their public profile is on the firm’s page. You are seeing it because you may edit or check it.'
            : 'This profile is a private draft. Nobody else can see it yet.'}
        </Alert>
      ) : null}

      {/* ── Identity ─────────────────────────────────────────────────────── */}
      <Card>
        <div className="px-1 py-1">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <Avatar
                userId={owner.id}
                name={listing.displayName}
                hasPhoto={Boolean(profile?.avatarDocumentId)}
                size={88}
                shape={owner.accountType === 'FIRM' ? 'rounded' : 'circle'}
              />
              <div className="pb-1">
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                  {listing.displayName}
                </h1>
                <p className="mt-0.5 text-sm text-slate-600">{category}</p>
                <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                  {summary.count > 0 ? (
                    <>
                      <StarRating value={Math.round(summary.average ?? 0)} size={13} />
                      <span>
                        {summary.average} · {summary.count} recommendation
                        {summary.count === 1 ? '' : 's'}
                      </span>
                    </>
                  ) : (
                    <span>No recommendations yet</span>
                  )}
                  {listing.yearsOfExperience ? (
                    <span>· {listing.yearsOfExperience} years&rsquo; experience</span>
                  ) : null}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {isOwnListing ? (
                <Link href="/listing" className={buttonClasses('secondary', 'md')}>
                  Edit my page
                </Link>
              ) : (
                <>
                  {canSendCase ? (
                    <Link
                      href={`/cases/new?listing=${listing.id}`}
                      className={buttonClasses('primary', 'md')}
                    >
                      <Icon name="folder" size={16} />
                      Send a case
                    </Link>
                  ) : null}
                  <Link
                    href={
                      viewer
                        ? `/blog?recommend=${listing.id}`
                        : `/login?next=${encodeURIComponent(`/blog?recommend=${listing.id}`)}`
                    }
                    className={buttonClasses('secondary', 'md')}
                  >
                    <Icon name="star" size={16} />
                    {viewer ? 'Recommend' : 'Sign in to recommend'}
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* ── Tabs ─────────────────────────────────────────────────────── */}
          <div className="mt-5 flex gap-1 overflow-x-auto border-t border-slate-200 pt-1">
            {TABS.map((entry) => (
              <Link
                key={entry.key}
                href={tabHref(entry.key)}
                aria-current={tab === entry.key ? 'page' : undefined}
                className={cx(
                  'shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium',
                  tab === entry.key
                    ? 'border-brand-700 text-brand-800'
                    : 'border-transparent text-slate-600 hover:text-slate-900',
                )}
              >
                {entry.label}
                {entry.key === 'reviews' && summary.count > 0 ? ` (${summary.count})` : ''}
                {entry.key === 'posts' && posts.length > 0 ? ` (${posts.length})` : ''}
              </Link>
            ))}
          </div>
        </div>
      </Card>

      {!isVerified ? (
        <Alert tone="warning" className="mt-4">
          This profile has <strong>not</strong> had its documents reviewed. Dubai Legal has confirmed
          only that the account exists. Check the professional&rsquo;s licence with the relevant
          authority before instructing them.
        </Alert>
      ) : (
        <Alert tone="success" className="mt-4">
          A reviewer approved this member&rsquo;s documents
          {owner.verifiedAt ? ` on ${formatDate(owner.verifiedAt)}` : ''}. This confirms the documents
          supplied, not the outcome of any matter.
        </Alert>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[20rem_1fr]">
        {/* ── Intro, the way a page introduces itself ───────────────────── */}
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card>
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold text-slate-900">Intro</h2>
              <VerificationStatusPill
                accountType={owner.accountType}
                status={owner.verificationStatus}
                size="sm"
              />
            </div>

            {listing.headline ? <p className="mt-3 text-sm text-slate-700">{listing.headline}</p> : null}
            {listing.bio ? (
              <p className="mt-2 line-clamp-5 whitespace-pre-line text-sm text-slate-600">
                {listing.bio}
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-1.5">
              {listing.areas.slice(0, 6).map((area) => (
                <Chip key={area} tone="brand">
                  {LEGAL_AREA_LABEL[area]}
                </Chip>
              ))}
              {listing.areas.length > 6 ? <Chip>+{listing.areas.length - 6}</Chip> : null}
            </div>

            <div className="mt-4 border-t border-slate-100 pt-4">
              <DescriptionList
                items={[
                  {
                    term: 'Emirates',
                    detail:
                      listing.emirates.map((emirate) => EMIRATE_LABEL[emirate]).join(', ') ||
                      'Not stated',
                  },
                  { term: 'Languages', detail: listing.languages.join(', ') || 'Not stated' },
                  {
                    term: 'New clients',
                    detail: listing.acceptsNewClients ? 'Accepting new clients' : 'Not at the moment',
                  },
                  ...(age !== null ? [{ term: 'Age', detail: String(age) }] : []),
                ]}
              />
            </div>

            <Link href={tabHref('about')} className={buttonClasses('secondary', 'md', 'mt-4 w-full')}>
              See the full profile
            </Link>
          </Card>

          {/* A page's "Page info" card: only what the member published. */}
          <Card>
            <h2 className="font-semibold text-slate-900">Page info</h2>
            <ul className="mt-3 space-y-3 text-sm">
              {contactEmail ? (
                <li className="flex items-start gap-2">
                  <Icon name="mail" size={16} className="mt-0.5 shrink-0 text-slate-400" />
                  <a href={`mailto:${contactEmail}`} className="text-brand-700 hover:underline">
                    {contactEmail}
                  </a>
                </li>
              ) : null}
              {listing.contactPhone ? (
                <li className="flex items-start gap-2">
                  <Icon name="phone" size={16} className="mt-0.5 shrink-0 text-slate-400" />
                  <a href={`tel:${listing.contactPhone}`} className="text-brand-700 hover:underline">
                    {listing.contactPhone}
                  </a>
                </li>
              ) : null}
              {listing.addressLine ? (
                <li className="flex items-start gap-2">
                  <Icon name="mapPin" size={16} className="mt-0.5 shrink-0 text-slate-400" />
                  <span className="text-slate-700">{listing.addressLine}</span>
                </li>
              ) : null}
              {website ? (
                <li className="flex items-start gap-2">
                  <Icon name="globe" size={16} className="mt-0.5 shrink-0 text-slate-400" />
                  <a
                    href={website}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="text-brand-700 hover:underline"
                  >
                    {website.replace(/^https?:\/\//, '')}
                  </a>
                </li>
              ) : null}
              {!contactEmail && !listing.contactPhone && !listing.addressLine && !website ? (
                <li className="text-sm text-slate-500">
                  This member has not published contact details. Send a case and they will reply inside
                  it.
                </li>
              ) : null}
            </ul>
            <Link href={tabHref('contact')} className={buttonClasses('ghost', 'sm', 'mt-3')}>
              Contact details
            </Link>
          </Card>

          {!isOwnListing ? (
            <Card>
              <h2 className="font-semibold text-slate-900">Work with them</h2>
              {viewer ? (
                canSendCase ? (
                  <>
                    <p className="mt-1 mb-3 text-sm text-slate-600">
                      A case is a file with a reference, a status, the papers and a conversation.
                    </p>
                    <Link
                      href={`/cases/new?listing=${listing.id}`}
                      className={buttonClasses('primary', 'md', 'w-full')}
                    >
                      Get in touch about a case
                    </Link>
                  </>
                ) : (
                  <p className="mt-1 text-sm text-slate-600">
                    Sending new cases is switched off on this installation. Existing cases continue as
                    normal.
                  </p>
                )
              ) : (
                <>
                  <p className="mt-1 mb-3 text-sm text-slate-600">
                    Sign in to send a case or a message. An account is free.
                  </p>
                  <Link href="/login" className={buttonClasses('primary', 'md', 'w-full')}>
                    Sign in
                  </Link>
                  <Link href="/register" className={buttonClasses('secondary', 'md', 'mt-2 w-full')}>
                    Create an account
                  </Link>
                </>
              )}
            </Card>
          ) : null}
        </aside>

        {/* ── The tab body ─────────────────────────────────────────────────── */}
        <div className="min-w-0 space-y-6">
          {tab === 'posts' ? (
            <>
              <Card>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-slate-900">
                      Posts {isOwnListing ? 'on this page' : `about ${listing.displayName}`}
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      {isOwnListing
                        ? 'What you have posted, and what members have written about you.'
                        : 'What the practice has posted, and what members have written about them.'}
                    </p>
                  </div>
                  {isOwnListing ? (
                    <Link
                      href={`/blog?recommend=${listing.id}`}
                      className={buttonClasses('primary', 'md')}
                    >
                      Post to my page
                    </Link>
                  ) : viewer ? (
                    <Link
                      href={`/blog?recommend=${listing.id}`}
                      className={buttonClasses('secondary', 'md')}
                    >
                      Write a recommendation
                    </Link>
                  ) : null}
                </div>

                {posts.length === 0 ? (
                  <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    Nobody has posted about {listing.displayName} yet. A recommendation here comes from
                    somebody who actually instructed them, so this is empty rather than filled with
                    examples.
                  </p>
                ) : (
                  <ul className="mt-4 space-y-3">
                    {posts.map((post) => {
                      const byThePage = post.authorId === owner.id;
                      const poster =
                        post.author.profile?.fullName?.trim() || post.author.email || 'A member';
                      return (
                      <li key={post.id} className="rounded-lg border border-slate-200 p-4">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span
                            className={cx(
                              'inline-flex rounded-full px-2 py-0.5 font-medium ring-1 ring-inset',
                              byThePage
                                ? 'bg-brand-50 text-brand-800 ring-brand-200'
                                : 'bg-slate-100 text-slate-600 ring-slate-200',
                            )}
                          >
                            {byThePage
                              ? 'Posted by the practice'
                              : post.kind === 'RECOMMENDATION'
                                ? 'Recommendation'
                                : post.kind === 'QUESTION'
                                  ? 'Question'
                                  : 'Experience'}
                          </span>
                          {!byThePage ? (
                            <span className="flex items-center gap-1.5">
                              <Avatar
                                userId={post.author.id}
                                name={poster}
                                hasPhoto={Boolean(post.author.profile?.avatarDocumentId)}
                                size={18}
                              />
                              {poster}
                              {post.author.verificationStatus === 'APPROVED' ? (
                                <VerificationBadge accountType={post.author.accountType} size="sm" />
                              ) : null}
                            </span>
                          ) : null}
                          <span>
                            {post.score} point{post.score === 1 ? '' : 's'}
                          </span>
                          <span>
                            · {post._count.comments} comment{post._count.comments === 1 ? '' : 's'}
                          </span>
                          <span>· {minutesLabel(post.createdAt)}</span>
                        </div>
                        <h3 className="mt-2 font-medium text-slate-900">
                          <Link href={`/blog/${post.id}`} className="hover:underline">
                            {post.title}
                          </Link>
                        </h3>
                        <p className="mt-1 line-clamp-3 whitespace-pre-line text-sm text-slate-700">
                          {post.body}
                        </p>
                      </li>
                      );
                    })}
                  </ul>
                )}
              </Card>

              {/* A firm's lawyers are who a client would actually instruct, so they
                  are on the tab the page opens on rather than behind a click. */}
              {owner.accountType === 'FIRM' && owner.firmProfile ? (
                <Card>
                  <h2 className="font-semibold text-slate-900">
                    Lawyers at this firm ({owner.firmProfile.lawyers.length})
                  </h2>
                  {owner.firmProfile.lawyers.length === 0 ? (
                    <p className="mt-2 text-sm text-slate-600">
                      No lawyers are currently registered with this firm.
                    </p>
                  ) : (
                    <ul className="mt-3 divide-y divide-slate-100">
                      {owner.firmProfile.lawyers.map((member) => (
                        <li key={member.id} className="flex items-start gap-3 py-3">
                          <Avatar
                            userId={member.user.id}
                            name={member.user.profile?.fullName?.trim() || member.user.email}
                            hasPhoto={Boolean(member.user.profile?.avatarDocumentId)}
                            size={40}
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-900">
                              {member.user.profile?.fullName?.trim() || member.user.email}
                            </p>
                            <p className="text-xs text-slate-500">
                              Licence {member.licenseNumber} · {member.licensingAuthority}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              ) : null}

              <ReviewSection {...reviewProps} />
            </>
          ) : null}

          {tab === 'about' ? (
            <>
              {listing.bio ? (
                <Card>
                  <h2 className="font-semibold text-slate-900">About</h2>
                  <p className="mt-2 whitespace-pre-line text-sm text-slate-700">{listing.bio}</p>
                </Card>
              ) : null}

              <Card>
                <h2 className="font-semibold text-slate-900">Practice</h2>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {listing.areas.map((area) => (
                    <Chip key={area} tone="brand">
                      {LEGAL_AREA_LABEL[area]}
                    </Chip>
                  ))}
                </div>
                <div className="mt-4">
                  <DescriptionList
                    items={[
                      {
                        term: 'Emirates covered',
                        detail: listing.emirates.map((emirate) => EMIRATE_LABEL[emirate]).join(', '),
                      },
                      { term: 'Languages', detail: listing.languages.join(', ') },
                      {
                        term: 'New clients',
                        detail: listing.acceptsNewClients
                          ? 'Accepting new clients'
                          : 'Not currently accepting new clients',
                      },
                    ]}
                  />
                </div>
              </Card>

              {/* Credentials are shown only for a verified member: displaying an
                  unverified licence number would imply a check that never happened. */}
              {isVerified && owner.lawyerProfile ? (
                <Card>
                  <h2 className="font-semibold text-slate-900">
                    {owner.accountType === 'FIRM' ? 'Legal consultant registration' : 'Legal licence'}
                  </h2>
                  <div className="mt-3">
                    <DescriptionList
                      items={[
                        { term: 'Licence number', detail: owner.lawyerProfile.licenseNumber },
                        { term: 'Authority', detail: owner.lawyerProfile.licensingAuthority },
                        {
                          term: 'Valid until',
                          detail: licenseValidity(owner.lawyerProfile.licenseExpiresOn),
                        },
                      ]}
                    />
                  </div>
                </Card>
              ) : null}

              {isVerified && owner.firmProfile ? (
                <Card>
                  <h2 className="font-semibold text-slate-900">Firm registration</h2>
                  <div className="mt-3">
                    <DescriptionList
                      items={[
                        { term: 'Trade licence', detail: owner.firmProfile.tradeLicenseNumber },
                        { term: 'Authority', detail: owner.firmProfile.tradeLicenseAuthority },
                        {
                          term: 'Valid until',
                          detail: licenseValidity(owner.firmProfile.tradeLicenseExpiresOn),
                        },
                        {
                          term: 'Registered emirate',
                          detail: owner.firmProfile.registeredEmirate
                            ? EMIRATE_LABEL[owner.firmProfile.registeredEmirate]
                            : 'Not stated',
                        },
                      ]}
                    />
                  </div>
                </Card>
              ) : null}

              {/* A firm's lawyers live on the firm's profile rather than as
                  separate entries in the directory. */}
              {owner.accountType === 'FIRM' && owner.firmProfile ? (
                <Card>
                  <h2 className="font-semibold text-slate-900">
                    Lawyers at this firm ({owner.firmProfile.lawyers.length})
                  </h2>
                  {owner.firmProfile.lawyers.length === 0 ? (
                    <p className="mt-2 text-sm text-slate-600">
                      No lawyers are currently registered with this firm.
                    </p>
                  ) : (
                    <ul className="mt-3 divide-y divide-slate-100">
                      {owner.firmProfile.lawyers.map((member) => (
                        <li key={member.id} className="flex items-start gap-3 py-3">
                          <Avatar
                            userId={member.user.id}
                            name={member.user.profile?.fullName?.trim() || member.user.email}
                            hasPhoto={Boolean(member.user.profile?.avatarDocumentId)}
                            size={40}
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-900">
                              {member.user.profile?.fullName?.trim() || member.user.email}
                            </p>
                            <p className="text-xs text-slate-500">
                              Licence {member.licenseNumber} · {member.licensingAuthority}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              ) : null}

              {isVerified ? (
                <Card>
                  <h2 className="font-semibold text-slate-900">Verified documents</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    What a reviewer checked. The documents themselves and the Emirates ID number are
                    never published.
                  </p>
                  <ul className="mt-3 divide-y divide-slate-100">
                    {owner.documents.map((document) => (
                      <li
                        key={`${document.kind}-${document.reviewedAt?.toISOString() ?? 'none'}`}
                        className="flex items-center justify-between gap-3 py-2"
                      >
                        <span className="flex items-center gap-2 text-sm text-slate-800">
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-green-800">
                            <Icon name="check" size={12} strokeWidth={2.25} />
                          </span>
                          {DOCUMENT_KIND_LABEL[document.kind]}
                        </span>
                        <span className="text-xs text-slate-500">
                          {document.kind === 'EMIRATES_ID'
                            ? 'Emirates ID verified'
                            : `Verified ${document.reviewedAt ? formatDate(document.reviewedAt) : ''}`.trim()}
                        </span>
                      </li>
                    ))}
                    {owner.documents.length === 0 ? (
                      <li className="py-2 text-sm text-slate-500">
                        No document records are attached to this approval.
                      </li>
                    ) : null}
                  </ul>
                </Card>
              ) : null}

              {owner.accountType === 'FIRM' ? (
                /* A firm has a person accountable for it, not a work history. */
                <Card>
                  <h2 className="font-semibold text-slate-900">Legal representative</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    The person accountable for this firm on Dubai Legal and named as its authorised
                    signatory.
                  </p>

                  <div className="mt-4 flex items-start gap-4">
                    <Avatar
                      userId={owner.id}
                      name={profile?.fullName?.trim() || listing.displayName}
                      hasPhoto={Boolean(profile?.avatarDocumentId)}
                      size={64}
                      shape="rounded"
                    />
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900">
                        {owner.firmProfile?.authorisedSignatory?.trim() ||
                          profile?.fullName?.trim() ||
                          'Not stated'}
                      </p>
                      <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Authorised signatory
                      </p>
                      {profile?.countryOfResidence ? (
                        <p className="mt-2 text-sm text-slate-600">
                          Based in {profile.countryOfResidence}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <DescriptionList
                      items={[
                        {
                          term: 'Registered name',
                          detail: owner.firmProfile?.legalName ?? listing.displayName,
                        },
                        {
                          term: 'Legal structure',
                          detail: owner.firmProfile?.legalStructure ?? 'Not stated',
                        },
                        {
                          term: 'Registered address',
                          detail:
                            listing.addressLine ??
                            owner.firmProfile?.registeredAddress ??
                            'Not stated',
                        },
                      ]}
                    />
                  </div>
                </Card>
              ) : (
                <Card>
                  <h2 className="font-semibold text-slate-900">Work and education</h2>
                  <div className="mt-3">
                    <DescriptionList
                      items={[
                        { term: 'Work', detail: profile?.workDescription ?? 'Not provided' },
                        { term: 'Education', detail: profile?.educationBackground ?? 'Not provided' },
                        {
                          term: 'Country of residence',
                          detail: profile?.countryOfResidence ?? 'Not provided',
                        },
                      ]}
                    />
                  </div>
                  {age !== null ? <p className="mt-3 text-xs text-slate-500">Age {age}.</p> : null}
                </Card>
              )}
            </>
          ) : null}

          {tab === 'reviews' ? <ReviewSection {...reviewProps} /> : null}

          {tab === 'contact' ? (
            <>
              <Card>
                <h2 className="font-semibold text-slate-900">Contact and location</h2>
                <div className="mt-3">
                  <DescriptionList
                    items={[
                      {
                        term: 'Email',
                        detail: contactEmail ? (
                          <a href={`mailto:${contactEmail}`} className="text-brand-700 hover:underline">
                            {contactEmail}
                          </a>
                        ) : (
                          'Not published — use “Get in touch”'
                        ),
                      },
                      {
                        term: 'Phone',
                        detail: listing.contactPhone ? (
                          <a href={`tel:${listing.contactPhone}`} className="text-brand-700 hover:underline">
                            {listing.contactPhone}
                          </a>
                        ) : (
                          'Not published'
                        ),
                      },
                      { term: 'Address in the UAE', detail: listing.addressLine ?? 'Not published' },
                      {
                        term: 'Website',
                        detail: website ? (
                          <a
                            href={website}
                            target="_blank"
                            rel="noopener noreferrer nofollow"
                            className="text-brand-700 hover:underline"
                          >
                            {website.replace(/^https?:\/\//, '')}
                          </a>
                        ) : (
                          'Not published'
                        ),
                      },
                    ]}
                  />
                </div>
              </Card>

              {!isOwnListing && viewer && canInquire ? (
                <Card>
                  <h2 className="font-semibold text-slate-900">Send a message</h2>
                  <p className="mt-1 mb-4 text-sm text-slate-600">
                    For a question that is not yet a case. It goes to their inbox and does not create a
                    case file.
                  </p>
                  <InquiryForm listingId={listing.id} displayName={listing.displayName} />
                </Card>
              ) : null}

              {!viewer ? (
                <Card>
                  <h2 className="font-semibold text-slate-900">Get in touch</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Sign in to send {listing.displayName} a case or a message. An account is free, and
                    you keep a record of everything you send.
                  </p>
                  <div className="mt-4 space-y-2">
                    <Link href="/login" className={buttonClasses('primary', 'md', 'w-full')}>
                      Sign in
                    </Link>
                    <Link href="/register" className={buttonClasses('secondary', 'md', 'w-full')}>
                      Create an account
                    </Link>
                  </div>
                </Card>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
