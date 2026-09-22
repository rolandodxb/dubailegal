import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requireMember } from '@/lib/auth';
import { getListingById } from '@/server/services/directory-service';
import { getAvailability, isEnabled } from '@/lib/availability';
import { ACCOUNT_TYPE_LABEL, EMIRATE_LABEL, LEGAL_AREA_LABEL } from '@/lib/constants';
import { CaseSubmissionForm } from '@/components/forms/CaseSubmissionForm';
import { VerificationStatusPill } from '@/components/VerificationBadge';
import { Alert, Card, Chip } from '@/components/ui/primitives';

export const metadata: Metadata = { title: 'Send a case' };

export default async function NewCasePage({
  searchParams,
}: {
  searchParams: Promise<{ listing?: string }>;
}) {
  const user = await requireMember();
  const { listing: listingId } = await searchParams;

  const availability = await getAvailability();
  if (!isEnabled(availability.settings, 'feature.case_submission')) {
    return (
      <Alert tone="warning" title="Sending new cases is switched off">
        An administrator has temporarily disabled case submission. Existing cases continue as
        normal.
      </Alert>
    );
  }

  if (!listingId) redirect('/directory');

  const listing = await getListingById(listingId);
  if (!listing) notFound();
  if (listing.userId === user.id) redirect(`/directory/${listing.id}`);

  const professionalName = listing.displayName;

  return (
    <div className="space-y-6">
      <nav className="text-sm" aria-label="Breadcrumb">
        <Link href={`/directory/${listing.id}`} className="text-brand-700 hover:underline">
          ← Back to {professionalName}
        </Link>
      </nav>

      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Get in touch about a case</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Describe the matter and attach anything relevant. It is sent to {professionalName} as a
          request to review, and you can follow its progress and message them directly once they
          open it.
        </p>
      </header>

      {/* Who the case is going to, so there is no doubt about the recipient. */}
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-semibold text-slate-900">{professionalName}</h2>
              <VerificationStatusPill
                accountType={listing.user.accountType}
                status={listing.user.verificationStatus}
              />
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {ACCOUNT_TYPE_LABEL[listing.user.accountType]} ·{' '}
              {EMIRATE_LABEL[listing.primaryEmirate]}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {listing.areas.slice(0, 5).map((area) => (
                <Chip key={area} tone="brand">
                  {LEGAL_AREA_LABEL[area]}
                </Chip>
              ))}
            </div>
          </div>
        </div>

        {listing.user.verificationStatus !== 'APPROVED' ? (
          <Alert tone="warning" className="mt-4">
            This member&rsquo;s documents have not been reviewed yet. You can still send a case, but
            confirm their licence with the relevant authority before instructing them.
          </Alert>
        ) : null}
      </Card>

      <Card>
        <CaseSubmissionForm
          listingId={listing.id}
          professionalName={professionalName}
          suggestedType={listing.areas[0]}
        />
      </Card>
    </div>
  );
}
