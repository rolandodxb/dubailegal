import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireMember } from '@/lib/auth';
import { ACCOUNT_TYPE_LABEL, BADGE } from '@/lib/constants';
import { getListingForEdit } from '@/server/services/listing-service';
import { ListingForm } from '@/components/forms/ListingForm';
import { unpublishListingAction } from '@/app/actions/profile-actions';
import { Alert, buttonClasses, Card } from '@/components/ui/primitives';

export const metadata: Metadata = { title: 'Directory listing' };

const NOTICES: Record<string, string> = {
  unpublished: 'Your listing has been removed from the public directory. It is still saved.',
};

export default async function ListingPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const user = await requireMember();
  if (user.accountType === 'USER') redirect('/dashboard');

  const [listing, params, lawyerProfile] = await Promise.all([
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
  const notice = params.notice ? NOTICES[params.notice] : undefined;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Directory listing</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          This is what people see when they search the directory. Your practice areas and emirates
          are what the filters match on, so keep them accurate.
        </p>
      </header>

      {notice ? <Alert tone="success">{notice}</Alert> : null}

      {representedByFirm ? (
        <Alert tone="info" title={`You are represented by ${lawyerProfile?.affiliatedFirm?.legalName}`}>
          Your account was created by that firm, so you are shown under{' '}
          <strong>Lawyers at this firm</strong> on the firm&rsquo;s profile rather than as a
          separate entry in the directory. This listing is kept as a draft; if you leave the firm it
          becomes your own and you can publish it.
        </Alert>
      ) : null}

      {listing && !listing.addressLine ? (
        <Alert tone="info" title="Add your practice address">
          Clients check where a professional actually is. Adding a UAE address — and a phone number
          and email — makes your profile far easier to trust.
        </Alert>
      ) : null}

      <Alert
        tone={listing?.published ? 'success' : 'neutral'}
        title={listing?.published ? 'Published' : 'Not published yet'}
      >
        {listing?.published ? (
          <>
            Your listing is live in the public directory.{' '}
            <Link href={`/directory/${listing.id}`} className="font-medium underline">
              View your public profile
            </Link>
            .
          </>
        ) : listing ? (
          'Your listing is saved as a private draft. Tick "Publish this listing" below when you are ready for it to appear in the directory.'
        ) : (
          'You have not created a listing yet. Fill in the form below and publish it when you are ready.'
        )}
      </Alert>

      {!listing?.published && user.verificationStatus !== 'APPROVED' ? (
        <Alert tone="warning" title="Your account is not verified yet">
          You can publish your listing now, but it will be shown in the directory marked as not
          verified, and it will appear below verified {ACCOUNT_TYPE_LABEL[user.accountType].toLowerCase()}{' '}
          profiles until a reviewer approves your documents. Verified members show the{' '}
          {BADGE[user.accountType].label.toLowerCase()} badge.
        </Alert>
      ) : null}

      <Card>
        <ListingForm
          accountType={user.accountType}
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
        />
      </Card>

      {listing?.published ? (
        <Card>
          <h2 className="font-semibold text-slate-900">Take my listing down</h2>
          <p className="mt-1 text-sm text-slate-600">
            Removes the listing from the public directory. Nothing is deleted — you can publish it
            again at any time.
          </p>
          <form action={unpublishListingAction} className="mt-4">
            <button type="submit" className={buttonClasses('danger', 'md')}>
              Unpublish my listing
            </button>
          </form>
        </Card>
      ) : null}
    </div>
  );
}
