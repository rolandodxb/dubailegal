import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireMember } from '@/lib/auth';
import { getI18n } from '@/lib/i18n';
import { accountTypeLabel, emirateLabel, legalAreaLabel } from '@/lib/i18n/labels';
import { EMIRATES, LEGAL_AREAS } from '@/lib/constants';
import { getListingForEdit } from '@/server/services/listing-service';
import { ListingForm } from '@/components/forms/ListingForm';
import { unpublishListingAction } from '@/app/actions/profile-actions';
import { Alert, buttonClasses, Card } from '@/components/ui/primitives';

export const metadata: Metadata = { title: 'Directory listing' };

export default async function ListingPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const user = await requireMember();
  if (user.accountType === 'USER') redirect('/dashboard');

  const [{ t }, listing, params, lawyerProfile] = await Promise.all([
    getI18n(),
    getListingForEdit(user.id),
    searchParams,
    prisma.lawyerProfile.findUnique({
      where: { userId: user.id },
      select: { createdByFirmId: true, affiliatedFirm: { select: { legalName: true } } },
    }),
  ]);

  // A lawyer created inside a firm is represented by that firm, so their own
  // listing stays out of the directory until they are no longer with it.
  const representedByFirm = Boolean(
    lawyerProfile?.createdByFirmId && lawyerProfile.affiliatedFirm,
  );
  const notice =
    params.notice === 'unpublished' ? t.memberPro.listing.noticeUnpublished : undefined;

  const accountTypeNoun = accountTypeLabel(t, user.accountType).toLowerCase();
  const emirateLabels = Object.fromEntries(
    EMIRATES.map((emirate) => [emirate.value, emirateLabel(t, emirate.value)]),
  );
  const areaLabels = Object.fromEntries(
    LEGAL_AREAS.map((area) => [area.value, legalAreaLabel(t, area.value)]),
  );

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">{t.items.listing}</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">{t.memberPro.listing.intro}</p>
      </header>

      {notice ? <Alert tone="success">{notice}</Alert> : null}

      {representedByFirm ? (
        <Alert
          tone="info"
          title={t.memberPro.listing.representedTitle.replace(
            '{firm}',
            lawyerProfile?.affiliatedFirm?.legalName ?? '',
          )}
        >
          {t.memberPro.listing.representedBefore}
          <strong>{t.memberPro.firm.lawyersAtThisFirm}</strong>
          {t.memberPro.listing.representedAfter}
        </Alert>
      ) : null}

      {listing && !listing.addressLine ? (
        <Alert tone="info" title={t.memberPro.listing.addAddressTitle}>
          {t.memberPro.listing.addAddressBody}
        </Alert>
      ) : null}

      <Alert
        tone={listing?.published ? 'success' : 'neutral'}
        title={
          listing?.published
            ? t.memberPro.listing.published
            : t.memberPro.listing.notPublishedYet
        }
      >
        {listing?.published ? (
          <>
            {t.memberPro.listing.live}{' '}
            <Link href={`/directory/${listing.id}`} className="font-medium underline">
              {t.memberPro.listing.viewPublicProfile}
            </Link>
            .
          </>
        ) : listing ? (
          t.memberPro.listing.draftBody
        ) : (
          t.memberPro.listing.emptyBody
        )}
      </Alert>

      {!listing?.published && user.verificationStatus !== 'APPROVED' ? (
        <Alert tone="warning" title={t.memberPro.listing.notVerifiedTitle}>
          {t.memberPro.listing.notVerifiedBody
            .replace('{type}', accountTypeNoun)
            .replace('{badge}', t.badges[user.accountType].toLowerCase())}
        </Alert>
      ) : null}

      <Card>
        <ListingForm
          defaultDisplayName={user.profile?.fullName ?? ''}
          listing={
            listing
              ? {
                  displayName: listing.displayName,
                  headline: listing.headline,
                  bio: listing.bio,
                  primaryEmirate: listing.primaryEmirate,
                  emirates: listing.emirates,
                  areas: listing.areas,
                  languages: listing.languages,
                  yearsOfExperience: listing.yearsOfExperience,
                  acceptsNewClients: listing.acceptsNewClients,
                  published: listing.published,
                  contactEmail: listing.contactEmail,
                  contactPhone: listing.contactPhone,
                  website: listing.website,
                  addressLine: listing.addressLine,
                }
              : null
          }
          labels={{
            notSavedTitle: t.memberPro.listing.formNotSavedTitle,
            displayName: t.memberPro.listing.displayName,
            displayNameHint:
              user.accountType === 'FIRM'
                ? t.memberPro.listing.displayNameHintFirm
                : t.memberPro.listing.displayNameHint,
            headline: t.memberPro.listing.headline,
            headlineHint: t.memberPro.listing.headlineHint,
            about: t.memberPro.listing.about,
            aboutHint: t.memberPro.listing.aboutHint.replace('{type}', accountTypeNoun),
            mainEmirate: t.memberPro.listing.mainEmirate,
            yearsOfExperience: t.memberPro.credentials.yearsOfExperience,
            emiratesCovered: t.memberPro.listing.emiratesCovered,
            emiratesHelp: t.memberPro.listing.emiratesHelp,
            areasOfLaw: t.memberPro.listing.areasOfLaw,
            areasHelp: t.memberPro.listing.areasHelp,
            languages: t.memberPro.listing.languages,
            languagesHint: t.memberPro.listing.languagesHint,
            languagesDefault: t.memberPro.listing.languagesDefault,
            contactEmail: t.memberPro.listing.contactEmail,
            contactEmailHint: t.memberPro.listing.contactEmailHint,
            contactPhone: t.memberPro.listing.contactPhone,
            practiceAddress: t.memberPro.listing.practiceAddress,
            practiceAddressHint: t.memberPro.listing.practiceAddressHint,
            website: t.memberPro.credentials.website,
            visibility: t.memberPro.listing.visibility,
            acceptingClients: t.memberPro.listing.acceptingClients,
            acceptingClientsHint: t.memberPro.listing.acceptingClientsHint,
            publishListing: t.memberPro.listing.publishListing,
            publishListingHint: t.memberPro.listing.publishListingHint,
            saveListing: t.memberPro.listing.saveListing,
            saving: t.memberPro.listing.saving,
            emirateLabels,
            areaLabels,
          }}
        />
      </Card>

      {listing?.published ? (
        <Card>
          <h2 className="font-semibold text-slate-900">{t.memberPro.listing.takeDownTitle}</h2>
          <p className="mt-1 text-sm text-slate-600">{t.memberPro.listing.takeDownBody}</p>
          <form action={unpublishListingAction} className="mt-4">
            <button type="submit" className={buttonClasses('danger', 'md')}>
              {t.memberPro.listing.takeDownButton}
            </button>
          </form>
        </Card>
      ) : null}
    </div>
  );
}
