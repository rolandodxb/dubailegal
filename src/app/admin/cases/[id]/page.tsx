import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireReviewer } from '@/lib/auth';
import { getCaseForAdmin } from '@/server/services/admin-service';
import { LEGAL_AREA_LABEL, LEGAL_CASE_STATUS_LABEL } from '@/lib/constants';
import { formatDateTime, formatFileSize } from '@/lib/format';
import { Alert, buttonClasses, Card, DescriptionList } from '@/components/ui/primitives';
import { CaseStatusChip } from '@/components/cases/CaseStatusChip';

export const metadata: Metadata = { title: 'Case oversight' };

/**
 * Oversight of one case.
 *
 * Shows the shape of the engagement — parties, state, timeline, how many files
 * and messages — and deliberately not the contents of any of them. There are no
 * action controls: an administrator oversees but does not practise.
 */
export default async function AdminCaseOversightPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireReviewer();
  const { id } = await params;

  const legalCase = await getCaseForAdmin(id);
  if (!legalCase) notFound();

  return (
    <div className="space-y-6">
      <nav className="text-sm" aria-label="Breadcrumb">
        <Link href="/admin/cases" className="text-brand-700 hover:underline">
          ← Back to all cases
        </Link>
      </nav>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono text-xs text-slate-500">{legalCase.reference}</p>
            <h1 className="mt-1 text-xl font-semibold text-slate-900">{legalCase.title}</h1>
            <p className="mt-1 text-sm text-slate-600">
              {LEGAL_AREA_LABEL[legalCase.caseType] ?? legalCase.caseType} · submitted{' '}
              {formatDateTime(legalCase.submittedAt)}
            </p>
          </div>
          <CaseStatusChip status={legalCase.status} />
        </div>
      </Card>

      <Alert tone="info" title="Oversight view — read only">
        The client&rsquo;s description and the messages in this case may be legally privileged, so
        they are not shown to administrators. Case files are listed by name only and cannot be
        opened from here. Nothing on this screen can accept, decline or progress a case.
      </Alert>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="font-semibold text-slate-900">Parties</h2>
          <div className="mt-3">
            <DescriptionList
              items={[
                {
                  term: 'Client',
                  detail: (
                    <>
                      {legalCase.client.profile?.fullName?.trim() || legalCase.client.email}
                      <span className="block text-xs text-slate-500">{legalCase.client.email}</span>
                      <span className="block text-xs text-slate-500">
                        Account status: {legalCase.client.status.toLowerCase()}
                      </span>
                    </>
                  ),
                },
                {
                  term: 'Assigned lawyer',
                  detail: legalCase.lawyer
                    ? (
                        <>
                          {legalCase.lawyer.user.profile?.fullName?.trim() ||
                            legalCase.lawyer.user.email}
                          <span className="block text-xs text-slate-500">
                            Licence {legalCase.lawyer.licenseNumber} ·{' '}
                            {legalCase.lawyer.licensingAuthority}
                          </span>
                        </>
                      )
                    : 'Not assigned',
                },
                {
                  term: 'Firm',
                  detail: legalCase.firm
                    ? `${legalCase.firm.legalName} · trade licence ${legalCase.firm.tradeLicenseNumber}`
                    : 'Sent to a named lawyer',
                },
                {
                  term: 'Reviewed',
                  detail: legalCase.reviewedAt ? formatDateTime(legalCase.reviewedAt) : 'Not yet',
                },
                {
                  term: 'Assigned',
                  detail: legalCase.assignedAt ? formatDateTime(legalCase.assignedAt) : 'Not yet',
                },
                {
                  term: 'Completed',
                  detail: legalCase.completedAt ? formatDateTime(legalCase.completedAt) : 'Not yet',
                },
              ]}
            />
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold text-slate-900">Volume</h2>
          <div className="mt-3">
            <DescriptionList
              items={[
                { term: 'Attachments', detail: String(legalCase._count.files) },
                { term: 'Messages', detail: String(legalCase._count.messages) },
                {
                  term: 'Client review',
                  detail: legalCase.review
                    ? `${legalCase.review.rating}.0 — ${legalCase.review.status.toLowerCase()}`
                    : 'None written',
                },
                {
                  term: 'Decline reason recorded',
                  detail: legalCase.declineReason ? 'Yes' : 'Not applicable',
                },
              ]}
            />
          </div>

          {legalCase.files.length > 0 ? (
            <div className="mt-4 border-t border-slate-100 pt-4">
              <h3 className="text-sm font-medium text-slate-800">File names</h3>
              <ul className="mt-2 space-y-1">
                {legalCase.files.map((file) => (
                  <li key={file.id} className="flex items-center justify-between gap-3 text-xs">
                    <span className="truncate text-slate-700">{file.fileName}</span>
                    <span className="shrink-0 text-slate-500">{formatFileSize(file.sizeBytes)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Card>
      </div>

      <Card>
        <h2 className="font-semibold text-slate-900">Timeline</h2>
        <ol className="mt-3 divide-y divide-slate-100">
          {legalCase.events.map((event) => (
            <li key={event.id} className="py-2.5">
              <p className="text-sm text-slate-800">
                {event.fromStatus ? `${LEGAL_CASE_STATUS_LABEL[event.fromStatus] ?? event.fromStatus} → ` : ''}
                {LEGAL_CASE_STATUS_LABEL[event.toStatus] ?? event.toStatus}
              </p>
              <p className="text-xs text-slate-500">
                {event.actor?.email ?? 'System'} · {formatDateTime(event.createdAt)}
                {event.note ? ` · ${event.note}` : ''}
              </p>
            </li>
          ))}
        </ol>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Link href="/admin/cases" className={buttonClasses('secondary', 'md')}>
          All cases
        </Link>
        <Link href={`/admin/users?q=${encodeURIComponent(legalCase.client.email)}`} className={buttonClasses('secondary', 'md')}>
          Look up the client account
        </Link>
      </div>
    </div>
  );
}
