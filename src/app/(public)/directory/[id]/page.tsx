import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { getI18n, type Dictionary } from '@/lib/i18n';
import {
  accountTypeLabel,
  blogKindLabel,
  documentKindLabel,
  emirateLabel,
  legalAreaLabel,
} from '@/lib/i18n/labels';
import { getListingById } from '@/server/services/directory-service';
import { listReviewableCases, reviewSummariesFor } from '@/server/services/review-service';
import { listPostsForProfile } from '@/server/services/blog-service';
import { getAvailability, isEnabled } from '@/lib/availability';
import { ReviewSection } from '@/components/reviews/ReviewSection';
import { StarRating } from '@/components/StarRating';
import { calculateAge, formatDate, safeExternalUrl } from '@/lib/format';
import { Avatar } from '@/components/Avatar';
import { VerificationBadge, VerificationStatusPill } from '@/components/VerificationBadge';
import { InquiryForm } from '@/components/forms/InquiryForm';
import { Alert, buttonClasses, Card, Chip, DescriptionList, cx } from '@/components/ui/primitives';
import { Icon } from '@/components/icons';
import { relativeTime } from '@/lib/i18n/format';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const [{ id }, { t }] = await Promise.all([params, getI18n()]);
  const listing = await getListingById(id);
  if (!listing || !listing.published) return { title: t.publicPages.listing.metaNotFound };
  return {
    title: listing.displayName,
    description:
      listing.headline ??
      t.publicPages.listing.metaDescription.replace('{name}', listing.displayName),
  };
}

/**
 * Describes whether a licence is still in date. A reviewer approved the
 * document; this says whether it is currently valid, which is not the same
 * claim and is not left to the reader to work out.
 */
function licenseValidity(t: Dictionary, expiresOn: Date | null | undefined): React.ReactNode {
  const labels = t.publicPages.listing;
  if (!expiresOn) return labels.noExpiry;
  const formatted = formatDate(expiresOn);
  const days = Math.ceil((expiresOn.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  if (days < 0) {
    return (
      <span className="font-medium text-red-700">
        {labels.expired.replace('{date}', formatted)}
      </span>
    );
  }
  if (days <= 90) {
    return (
      <span className="font-medium text-amber-700">
        {(days === 1 ? labels.expiresInOne : labels.expiresInOther)
          .replace('{date}', formatted)
          .replace('{count}', String(days))}
      </span>
    );
  }
  return (
    <span className="font-medium text-green-700">
      {labels.currentlyValid.replace('{date}', formatted)}
    </span>
  );
}

type Tab = 'posts' | 'about' | 'reviews' | 'contact';

const TABS: Tab[] = ['posts', 'about', 'reviews', 'contact'];

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
  const [{ id }, { tab: tabParam }, { t }] = await Promise.all([
    params,
    searchParams,
    getI18n(),
  ]);
  const labels = t.publicPages.listing;

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
  const tab: Tab = TABS.includes(tabParam as Tab) ? (tabParam as Tab) : 'posts';

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
  const category = `${accountTypeLabel(t, owner.accountType)} · ${emirateLabel(t, listing.primaryEmirate)}`;
  const tabHref = (key: Tab) => `/directory/${listing.id}?tab=${key}`;
  const recommendationCount = (summary.count === 1 ? labels.recommendationOne : labels.recommendationOther).replace(
    '{count}',
    String(summary.count),
  );

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
      <nav className="mb-4 text-sm" aria-label={t.publicPages.shell.breadcrumb}>
        <Link href="/directory" className="text-brand-700 hover:underline">
          {labels.backToDirectory}
        </Link>
      </nav>

      {hiddenFromPublic ? (
        <Alert tone="info" className="mb-4">
          {representedByFirm ? labels.representedByFirm : labels.privateDraft}
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
                        {summary.average} · {recommendationCount}
                      </span>
                    </>
                  ) : (
                    <span>{labels.noRecommendations}</span>
                  )}
                  {listing.yearsOfExperience ? (
                    <span>
                      {labels.yearsExperience.replace(
                        '{count}',
                        String(listing.yearsOfExperience),
                      )}
                    </span>
                  ) : null}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {isOwnListing ? (
                <Link href="/listing" className={buttonClasses('secondary', 'md')}>
                  {labels.editMyPage}
                </Link>
              ) : (
                <>
                  {canSendCase ? (
                    <Link
                      href={`/cases/new?listing=${listing.id}`}
                      className={buttonClasses('primary', 'md')}
                    >
                      <Icon name="folder" size={16} />
                      {labels.sendCase}
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
                    {viewer ? labels.recommend : labels.signInToRecommend}
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* ── Tabs ─────────────────────────────────────────────────────── */}
          <div className="mt-5 flex gap-1 overflow-x-auto border-t border-slate-200 pt-1">
            {TABS.map((key) => (
              <Link
                key={key}
                href={tabHref(key)}
                aria-current={tab === key ? 'page' : undefined}
                className={cx(
                  'shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium',
                  tab === key
                    ? 'border-brand-700 text-brand-800'
                    : 'border-transparent text-slate-600 hover:text-slate-900',
                )}
              >
                {labels.tabs[key]}
                {key === 'reviews' && summary.count > 0 ? ` (${summary.count})` : ''}
                {key === 'posts' && posts.length > 0 ? ` (${posts.length})` : ''}
              </Link>
            ))}
          </div>
        </div>
      </Card>

      {!isVerified ? (
        <Alert tone="warning" className="mt-4">
          {labels.notReviewedLead}
          <strong>{labels.notReviewedStrong}</strong>
          {labels.notReviewedTail}
        </Alert>
      ) : (
        <Alert tone="success" className="mt-4">
          {labels.verifiedLead}
          {owner.verifiedAt ? labels.verifiedOn.replace('{date}', formatDate(owner.verifiedAt)) : ''}
          {labels.verifiedTail}
        </Alert>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[20rem_1fr]">
        {/* ── Intro, the way a page introduces itself ───────────────────── */}
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card>
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold text-slate-900">{labels.intro}</h2>
              <VerificationStatusPill
                accountType={owner.accountType}
                status={owner.verificationStatus}
                size="sm"
                label={t.badges[owner.accountType]}
                statusLabel={t.verificationStatus[owner.verificationStatus]}
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
                  {legalAreaLabel(t, area)}
                </Chip>
              ))}
              {listing.areas.length > 6 ? <Chip>+{listing.areas.length - 6}</Chip> : null}
            </div>

            <div className="mt-4 border-t border-slate-100 pt-4">
              <DescriptionList
                items={[
                  {
                    term: t.directory.emirates,
                    detail:
                      listing.emirates.map((emirate) => emirateLabel(t, emirate)).join(', ') ||
                      labels.notStated,
                  },
                  {
                    term: t.directory.languages,
                    detail: listing.languages.join(', ') || labels.notStated,
                  },
                  {
                    term: labels.newClients,
                    detail: listing.acceptsNewClients
                      ? labels.acceptingNewClients
                      : labels.notAtTheMoment,
                  },
                  ...(age !== null ? [{ term: labels.age, detail: String(age) }] : []),
                ]}
              />
            </div>

            <Link href={tabHref('about')} className={buttonClasses('secondary', 'md', 'mt-4 w-full')}>
              {labels.seeFullProfile}
            </Link>
          </Card>

          {/* A page's "Page info" card: only what the member published. */}
          <Card>
            <h2 className="font-semibold text-slate-900">{labels.pageInfo}</h2>
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
                <li className="text-sm text-slate-500">{labels.noContactDetails}</li>
              ) : null}
            </ul>
            <Link href={tabHref('contact')} className={buttonClasses('ghost', 'sm', 'mt-3')}>
              {labels.contactDetails}
            </Link>
          </Card>

          {!isOwnListing ? (
            <Card>
              <h2 className="font-semibold text-slate-900">{labels.workWithThem}</h2>
              {viewer ? (
                canSendCase ? (
                  <>
                    <p className="mt-1 mb-3 text-sm text-slate-600">{labels.caseExplanation}</p>
                    <Link
                      href={`/cases/new?listing=${listing.id}`}
                      className={buttonClasses('primary', 'md', 'w-full')}
                    >
                      {labels.getInTouchAboutCase}
                    </Link>
                  </>
                ) : (
                  <p className="mt-1 text-sm text-slate-600">{labels.casesSwitchedOff}</p>
                )
              ) : (
                <>
                  <p className="mt-1 mb-3 text-sm text-slate-600">{labels.signInToSend}</p>
                  <Link href="/login" className={buttonClasses('primary', 'md', 'w-full')}>
                    {t.nav.signIn}
                  </Link>
                  <Link href="/register" className={buttonClasses('secondary', 'md', 'mt-2 w-full')}>
                    {t.nav.createAccount}
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
                      {isOwnListing
                        ? labels.postsOnPage
                        : labels.postsAbout.replace('{name}', listing.displayName)}
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      {isOwnListing ? labels.postsOwnSubtitle : labels.postsOtherSubtitle}
                    </p>
                  </div>
                  {isOwnListing ? (
                    <Link
                      href={`/blog?recommend=${listing.id}`}
                      className={buttonClasses('primary', 'md')}
                    >
                      {labels.postToMyPage}
                    </Link>
                  ) : viewer ? (
                    <Link
                      href={`/blog?recommend=${listing.id}`}
                      className={buttonClasses('secondary', 'md')}
                    >
                      {labels.writeRecommendation}
                    </Link>
                  ) : null}
                </div>

                {posts.length === 0 ? (
                  <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    {labels.noPosts.replace('{name}', listing.displayName)}
                  </p>
                ) : (
                  <ul className="mt-4 space-y-3">
                    {posts.map((post) => {
                      const byThePage = post.authorId === owner.id;
                      const poster =
                        post.author.profile?.fullName?.trim() ||
                        post.author.email ||
                        labels.aMember;
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
                            {byThePage ? labels.postedByPractice : blogKindLabel(t, post.kind)}
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
                                <VerificationBadge
                                  accountType={post.author.accountType}
                                  size="sm"
                                  label={t.badges[post.author.accountType]}
                                />
                              ) : null}
                            </span>
                          ) : null}
                          <span>
                            {(post.score === 1 ? labels.pointsOne : labels.pointsOther).replace(
                              '{count}',
                              String(post.score),
                            )}
                          </span>
                          <span>
                            ·{' '}
                            {(post._count.comments === 1
                              ? labels.commentsOne
                              : labels.commentsOther
                            ).replace('{count}', String(post._count.comments))}
                          </span>
                          <span>· {relativeTime(t, post.createdAt)}</span>
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
                    {labels.lawyersAtFirm.replace(
                      '{count}',
                      String(owner.firmProfile.lawyers.length),
                    )}
                  </h2>
                  {owner.firmProfile.lawyers.length === 0 ? (
                    <p className="mt-2 text-sm text-slate-600">{labels.noLawyers}</p>
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
                              {labels.licence
                                .replace('{number}', member.licenseNumber)
                                .replace('{authority}', member.licensingAuthority)}
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
                  <h2 className="font-semibold text-slate-900">{labels.tabs.about}</h2>
                  <p className="mt-2 whitespace-pre-line text-sm text-slate-700">{listing.bio}</p>
                </Card>
              ) : null}

              <Card>
                <h2 className="font-semibold text-slate-900">{labels.practice}</h2>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {listing.areas.map((area) => (
                    <Chip key={area} tone="brand">
                      {legalAreaLabel(t, area)}
                    </Chip>
                  ))}
                </div>
                <div className="mt-4">
                  <DescriptionList
                    items={[
                      {
                        term: labels.emiratesCovered,
                        detail: listing.emirates
                          .map((emirate) => emirateLabel(t, emirate))
                          .join(', '),
                      },
                      { term: t.directory.languages, detail: listing.languages.join(', ') },
                      {
                        term: labels.newClients,
                        detail: listing.acceptsNewClients
                          ? labels.acceptingNewClients
                          : labels.notAcceptingNewClients,
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
                    {owner.accountType === 'FIRM'
                      ? labels.legalConsultantRegistration
                      : labels.legalLicence}
                  </h2>
                  <div className="mt-3">
                    <DescriptionList
                      items={[
                        { term: labels.licenceNumber, detail: owner.lawyerProfile.licenseNumber },
                        { term: labels.authority, detail: owner.lawyerProfile.licensingAuthority },
                        {
                          term: labels.validUntil,
                          detail: licenseValidity(t, owner.lawyerProfile.licenseExpiresOn),
                        },
                      ]}
                    />
                  </div>
                </Card>
              ) : null}

              {isVerified && owner.firmProfile ? (
                <Card>
                  <h2 className="font-semibold text-slate-900">{labels.firmRegistration}</h2>
                  <div className="mt-3">
                    <DescriptionList
                      items={[
                        { term: labels.tradeLicence, detail: owner.firmProfile.tradeLicenseNumber },
                        {
                          term: labels.authority,
                          detail: owner.firmProfile.tradeLicenseAuthority,
                        },
                        {
                          term: labels.validUntil,
                          detail: licenseValidity(t, owner.firmProfile.tradeLicenseExpiresOn),
                        },
                        {
                          term: labels.registeredEmirate,
                          detail: owner.firmProfile.registeredEmirate
                            ? emirateLabel(t, owner.firmProfile.registeredEmirate)
                            : labels.notStated,
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
                    {labels.lawyersAtFirm.replace(
                      '{count}',
                      String(owner.firmProfile.lawyers.length),
                    )}
                  </h2>
                  {owner.firmProfile.lawyers.length === 0 ? (
                    <p className="mt-2 text-sm text-slate-600">{labels.noLawyers}</p>
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
                              {labels.licence
                                .replace('{number}', member.licenseNumber)
                                .replace('{authority}', member.licensingAuthority)}
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
                  <h2 className="font-semibold text-slate-900">{labels.verifiedDocuments}</h2>
                  <p className="mt-1 text-sm text-slate-600">{labels.verifiedDocumentsBody}</p>
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
                          {documentKindLabel(t, document.kind)}
                        </span>
                        <span className="text-xs text-slate-500">
                          {document.kind === 'EMIRATES_ID'
                            ? labels.emiratesIdVerified
                            : labels.documentVerified
                                .replace(
                                  '{date}',
                                  document.reviewedAt ? formatDate(document.reviewedAt) : '',
                                )
                                .trim()}
                        </span>
                      </li>
                    ))}
                    {owner.documents.length === 0 ? (
                      <li className="py-2 text-sm text-slate-500">{labels.noDocumentRecords}</li>
                    ) : null}
                  </ul>
                </Card>
              ) : null}

              {owner.accountType === 'FIRM' ? (
                /* A firm has a person accountable for it, not a work history. */
                <Card>
                  <h2 className="font-semibold text-slate-900">{labels.legalRepresentative}</h2>
                  <p className="mt-1 text-sm text-slate-600">{labels.legalRepresentativeBody}</p>

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
                          labels.notStated}
                      </p>
                      <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                        {labels.authorisedSignatory}
                      </p>
                      {profile?.countryOfResidence ? (
                        <p className="mt-2 text-sm text-slate-600">
                          {labels.basedIn.replace('{country}', profile.countryOfResidence)}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <DescriptionList
                      items={[
                        {
                          term: labels.registeredName,
                          detail: owner.firmProfile?.legalName ?? listing.displayName,
                        },
                        {
                          term: labels.legalStructure,
                          detail: owner.firmProfile?.legalStructure ?? labels.notStated,
                        },
                        {
                          term: labels.registeredAddress,
                          detail:
                            listing.addressLine ??
                            owner.firmProfile?.registeredAddress ??
                            labels.notStated,
                        },
                      ]}
                    />
                  </div>
                </Card>
              ) : (
                <Card>
                  <h2 className="font-semibold text-slate-900">{labels.workAndEducation}</h2>
                  <div className="mt-3">
                    <DescriptionList
                      items={[
                        { term: labels.work, detail: profile?.workDescription ?? labels.notProvided },
                        {
                          term: labels.education,
                          detail: profile?.educationBackground ?? labels.notProvided,
                        },
                        {
                          term: labels.countryOfResidence,
                          detail: profile?.countryOfResidence ?? labels.notProvided,
                        },
                      ]}
                    />
                  </div>
                  {age !== null ? (
                    <p className="mt-3 text-xs text-slate-500">
                      {labels.ageNote.replace('{age}', String(age))}
                    </p>
                  ) : null}
                </Card>
              )}
            </>
          ) : null}

          {tab === 'reviews' ? <ReviewSection {...reviewProps} /> : null}

          {tab === 'contact' ? (
            <>
              <Card>
                <h2 className="font-semibold text-slate-900">{labels.contactAndLocation}</h2>
                <div className="mt-3">
                  <DescriptionList
                    items={[
                      {
                        term: t.common.email,
                        detail: contactEmail ? (
                          <a href={`mailto:${contactEmail}`} className="text-brand-700 hover:underline">
                            {contactEmail}
                          </a>
                        ) : (
                          labels.notPublishedUseGetInTouch
                        ),
                      },
                      {
                        term: t.common.phone,
                        detail: listing.contactPhone ? (
                          <a href={`tel:${listing.contactPhone}`} className="text-brand-700 hover:underline">
                            {listing.contactPhone}
                          </a>
                        ) : (
                          labels.notPublished
                        ),
                      },
                      {
                        term: labels.addressInUae,
                        detail: listing.addressLine ?? labels.notPublished,
                      },
                      {
                        term: labels.website,
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
                          labels.notPublished
                        ),
                      },
                    ]}
                  />
                </div>
              </Card>

              {!isOwnListing && viewer && canInquire ? (
                <Card>
                  <h2 className="font-semibold text-slate-900">{labels.sendMessage}</h2>
                  <p className="mt-1 mb-4 text-sm text-slate-600">{labels.sendMessageBody}</p>
                  <InquiryForm
                    listingId={listing.id}
                    displayName={listing.displayName}
                    labels={t.memberCore.inquiryForm}
                  />
                </Card>
              ) : null}

              {!viewer ? (
                <Card>
                  <h2 className="font-semibold text-slate-900">{labels.getInTouch}</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {labels.getInTouchBody.replace('{name}', listing.displayName)}
                  </p>
                  <div className="mt-4 space-y-2">
                    <Link href="/login" className={buttonClasses('primary', 'md', 'w-full')}>
                      {t.nav.signIn}
                    </Link>
                    <Link href="/register" className={buttonClasses('secondary', 'md', 'w-full')}>
                      {t.nav.createAccount}
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
