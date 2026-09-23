import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireReviewer } from '@/lib/auth';
import { getCaseForAdmin } from '@/server/services/admin-service';
import { getI18n } from '@/lib/i18n';
import { caseStatusLabel, legalAreaLabel } from '@/lib/i18n/labels';
import { formatDateTime, formatFileSize } from '@/lib/format';
import { Alert, buttonClasses, Card, DescriptionList } from '@/components/ui/primitives';
import { CaseStatusChip } from '@/components/cases/CaseStatusChip';
import { messageTranslator } from '@/lib/i18n/messages';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.admin.cases.metaTitle };
}

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
  const [{ t, effectiveLocale }] = await Promise.all([getI18n(), requireReviewer()]);
  const { id } = await params;

  const legalCase = await getCaseForAdmin(id);
  if (!legalCase) notFound();

  const accountStatusLabel: Record<string, string> = t.admin.cases.accountStatusLabel;
  const reviewStatusLabel: Record<string, string> = t.admin.cases.reviewStatusLabel;

  return (
    <div className="space-y-6">
      <nav className="text-sm" aria-label={t.admin.cases.breadcrumb}>
        <Link href="/admin/cases" className="text-brand-700 hover:underline">
          {t.admin.cases.backToAllCases}
        </Link>
      </nav>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono text-xs text-slate-500">{legalCase.reference}</p>
            <h1 className="mt-1 text-xl font-semibold text-slate-900">{legalCase.title}</h1>
            <p className="mt-1 text-sm text-slate-600">
              {legalAreaLabel(t, legalCase.caseType)} · {t.admin.cases.submittedAt}{' '}
              {formatDateTime(legalCase.submittedAt)}
            </p>
          </div>
          <CaseStatusChip status={legalCase.status} />
        </div>
      </Card>

      <Alert tone="info" title={t.admin.cases.oversightAlert}>
        {t.admin.cases.oversightAlertBody}
      </Alert>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="font-semibold text-slate-900">{t.admin.cases.parties}</h2>
          <div className="mt-3">
            <DescriptionList
              items={[
                {
                  term: t.admin.cases.client,
                  detail: (
                    <>
                      {legalCase.client.profile?.fullName?.trim() || legalCase.client.email}
                      <span className="block text-xs text-slate-500">{legalCase.client.email}</span>
                      <span className="block text-xs text-slate-500">
                        {t.admin.cases.accountStatus}:{' '}
                        {accountStatusLabel[legalCase.client.status] ??
                          legalCase.client.status.toLowerCase()}
                      </span>
                    </>
                  ),
                },
                {
                  term: t.admin.cases.assignedLawyer,
                  detail: legalCase.lawyer
                    ? (
                        <>
                          {legalCase.lawyer.user.profile?.fullName?.trim() ||
                            legalCase.lawyer.user.email}
                          <span className="block text-xs text-slate-500">
                            {t.admin.cases.licence} {legalCase.lawyer.licenseNumber} ·{' '}
                            {legalCase.lawyer.licensingAuthority}
                          </span>
                        </>
                      )
                    : t.admin.cases.notAssigned,
                },
                {
                  term: t.admin.cases.firm,
                  detail: legalCase.firm
                    ? `${legalCase.firm.legalName} · ${t.admin.cases.tradeLicence} ${legalCase.firm.tradeLicenseNumber}`
                    : t.admin.cases.sentToNamedLawyer,
                },
                {
                  term: t.admin.cases.reviewed,
                  detail: legalCase.reviewedAt
                    ? formatDateTime(legalCase.reviewedAt)
                    : t.admin.cases.notYet,
                },
                {
                  term: t.admin.cases.assigned,
                  detail: legalCase.assignedAt
                    ? formatDateTime(legalCase.assignedAt)
                    : t.admin.cases.notYet,
                },
                {
                  term: t.admin.cases.completed,
                  detail: legalCase.completedAt
                    ? formatDateTime(legalCase.completedAt)
                    : t.admin.cases.notYet,
                },
              ]}
            />
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold text-slate-900">{t.admin.cases.volume}</h2>
          <div className="mt-3">
            <DescriptionList
              items={[
                { term: t.admin.cases.attachments, detail: String(legalCase._count.files) },
                { term: t.admin.cases.messages, detail: String(legalCase._count.messages) },
                {
                  term: t.admin.cases.clientReview,
                  detail: legalCase.review
                    ? `${legalCase.review.rating}.0 — ${
                        reviewStatusLabel[legalCase.review.status] ??
                        legalCase.review.status.toLowerCase()
                      }`
                    : t.admin.cases.noneWritten,
                },
                {
                  term: t.admin.cases.declineReasonRecorded,
                  detail: legalCase.declineReason ? t.common.yes : t.admin.cases.notApplicable,
                },
              ]}
            />
          </div>

          {legalCase.files.length > 0 ? (
            <div className="mt-4 border-t border-slate-100 pt-4">
              <h3 className="text-sm font-medium text-slate-800">{t.admin.cases.fileNames}</h3>
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
        <h2 className="font-semibold text-slate-900">{t.admin.cases.timeline}</h2>
        <ol className="mt-3 divide-y divide-slate-100">
          {legalCase.events.map((event) => (
            <li key={event.id} className="py-2.5">
              <p className="text-sm text-slate-800">
                {event.fromStatus ? `${caseStatusLabel(t, event.fromStatus)} → ` : ''}
                {caseStatusLabel(t, event.toStatus)}
              </p>
              <p className="text-xs text-slate-500">
                {event.actor?.email ?? t.admin.cases.system} · {formatDateTime(event.createdAt)}
                {event.note ? ` · ${messageTranslator(effectiveLocale)(event.note)}` : ''}
              </p>
            </li>
          ))}
        </ol>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Link href="/admin/cases" className={buttonClasses('secondary', 'md')}>
          {t.admin.cases.allCases}
        </Link>
        <Link href={`/admin/users?q=${encodeURIComponent(legalCase.client.email)}`} className={buttonClasses('secondary', 'md')}>
          {t.admin.cases.lookUpClient}
        </Link>
      </div>
    </div>
  );
}
