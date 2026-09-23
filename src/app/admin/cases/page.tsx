import type { Metadata } from 'next';
import Link from 'next/link';
import { requireReviewer } from '@/lib/auth';
import { caseStatusCounts, listCasesForAdmin } from '@/server/services/admin-service';
import { getI18n } from '@/lib/i18n';
import { caseStatusLabel, legalAreaLabel } from '@/lib/i18n/labels';
import { formatDateTime } from '@/lib/format';
import { Alert, buttonClasses, Card } from '@/components/ui/primitives';
import { CaseStatusChip } from '@/components/cases/CaseStatusChip';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.labels.domain.case };
}

/**
 * Case oversight.
 *
 * Read-only by design. An administrator runs the platform and does not act as a
 * lawyer on it, so there is no accept, decline or progress control anywhere on
 * this screen.
 */
export default async function AdminCasesPage() {
  await requireReviewer();
  const [{ t }, cases, counts] = await Promise.all([
    getI18n(),
    listCasesForAdmin(),
    caseStatusCounts(),
  ]);

  const order = ['SUBMITTED', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'DECLINED'];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">{t.labels.domain.case}</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">{t.admin.cases.intro}</p>
      </header>

      <Alert tone="info" title={t.admin.cases.alertTitle}>
        {t.admin.cases.alertBody}
      </Alert>

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {order.map((status) => (
          <Card key={status}>
            <p className="text-xs text-slate-600">{caseStatusLabel(t, status)}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{counts.get(status) ?? 0}</p>
          </Card>
        ))}
      </div>

      <section>
        <h2 className="mb-3 font-semibold text-slate-900">
          {t.admin.cases.allCases} ({cases.length}
          {cases.length === 100 ? `+ (${t.admin.cases.showingRecent})` : ''})
        </h2>

        {cases.length === 0 ? (
          <p className="text-sm text-slate-600">{t.admin.cases.empty}</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-4xl text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">{t.admin.cases.reference}</th>
                  <th className="px-3 py-2 font-medium">{t.admin.cases.title}</th>
                  <th className="px-3 py-2 font-medium">{t.admin.cases.type}</th>
                  <th className="px-3 py-2 font-medium">{t.admin.cases.client}</th>
                  <th className="px-3 py-2 font-medium">{t.admin.cases.professional}</th>
                  <th className="px-3 py-2 font-medium">{t.admin.cases.state}</th>
                  <th className="px-3 py-2 font-medium">{t.admin.cases.submitted}</th>
                  <th className="px-3 py-2 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cases.map((item) => (
                  <tr key={item.id}>
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-slate-600">
                      {item.reference}
                    </td>
                    <td className="max-w-56 truncate px-3 py-2 text-slate-800">{item.title}</td>
                    <td className="px-3 py-2 text-xs text-slate-600">
                      {legalAreaLabel(t, item.caseType)}
                    </td>
                    <td className="max-w-48 truncate px-3 py-2 text-xs text-slate-600">
                      {item.client.profile?.fullName?.trim() || item.client.email}
                    </td>
                    <td className="max-w-48 truncate px-3 py-2 text-xs text-slate-600">
                      {item.firm?.legalName ??
                        item.lawyer?.user.profile?.fullName?.trim() ??
                        item.lawyer?.user.email ?? (
                          <span className="text-amber-700">{t.admin.cases.notAssigned}</span>
                        )}
                    </td>
                    <td className="px-3 py-2">
                      <CaseStatusChip status={item.status} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-500">
                      {formatDateTime(item.submittedAt)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Link
                        href={`/admin/cases/${item.id}`}
                        className="text-xs font-medium text-brand-700 hover:underline"
                      >
                        {t.admin.cases.oversight}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="flex flex-wrap gap-3">
        <Link href="/admin/verifications" className={buttonClasses('secondary', 'md')}>
          {t.items.verificationQueue}
        </Link>
        <Link href="/admin/users" className={buttonClasses('secondary', 'md')}>
          {t.items.accounts}
        </Link>
      </div>
    </div>
  );
}
