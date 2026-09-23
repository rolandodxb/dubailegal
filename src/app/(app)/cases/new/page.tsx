import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requireMember } from '@/lib/auth';
import { getI18n } from '@/lib/i18n';
import { accountTypeLabel, emirateLabel, legalAreaLabel } from '@/lib/i18n/labels';
import { getListingById } from '@/server/services/directory-service';
import { getAvailability, isEnabled } from '@/lib/availability';
import { LEGAL_AREAS } from '@/lib/constants';
import { CaseSubmissionForm } from '@/components/forms/CaseSubmissionForm';
import { VerificationStatusPill } from '@/components/VerificationBadge';
import { Alert, Card, Chip } from '@/components/ui/primitives';
import { listingPlaceText } from '@/lib/i18n/place';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.publicPages.listing.sendCase };
}

export default async function NewCasePage({
  searchParams,
}: {
  searchParams: Promise<{ listing?: string }>;
}) {
  const [{ t }, user] = await Promise.all([getI18n(), requireMember()]);
  const labels = t.memberCases.newCase;
  const { listing: listingId } = await searchParams;

  const availability = await getAvailability();
  if (!isEnabled(availability.settings, 'feature.case_submission')) {
    return (
      <Alert tone="warning" title={labels.switchedOff}>
        {labels.switchedOffBody}
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
      <nav className="text-sm" aria-label={t.memberCases.breadcrumb}>
        <Link href={`/directory/${listing.id}`} className="text-brand-700 hover:underline">
          {labels.backTo.replace('{name}', professionalName)}
        </Link>
      </nav>

      <header>
        <h1 className="text-2xl font-semibold text-slate-900">{labels.title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          {labels.intro.replace('{name}', professionalName)}
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
                label={t.badges[listing.user.accountType]}
                statusLabel={t.verificationStatus[listing.user.verificationStatus]}
              />
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {accountTypeLabel(t, listing.user.accountType)} ·{' '}
              {listingPlaceText(t, listing)}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {listing.areas.slice(0, 5).map((area) => (
                <Chip key={area} tone="brand">
                  {legalAreaLabel(t, area)}
                </Chip>
              ))}
            </div>
          </div>
        </div>

        {listing.user.verificationStatus !== 'APPROVED' ? (
          <Alert tone="warning" className="mt-4">
            {labels.unreviewedWarning}
          </Alert>
        ) : null}
      </Card>

      <Card>
        <CaseSubmissionForm
          listingId={listing.id}
          professionalName={professionalName}
          suggestedType={listing.areas[0]}
          labels={t.memberCases.caseForm}
          areaOptions={LEGAL_AREAS.map((area) => ({
            value: area.value,
            label: legalAreaLabel(t, area.value),
          }))}
          statusLabels={{
            submitted: t.labels.caseStatus.SUBMITTED,
            underReview: t.labels.caseStatus.UNDER_REVIEW,
            assigned: t.labels.caseStatus.ASSIGNED,
          }}
        />
      </Card>
    </div>
  );
}
