import type { Metadata } from 'next';
import Link from 'next/link';
import { requireReviewer } from '@/lib/auth';
import { caseStatusCounts, listCasesForAdmin } from '@/server/services/admin-service';
import { ACCOUNT_TYPE_LABEL, LEGAL_CASE_STATUS_LABEL, LEGAL_AREA_LABEL } from '@/lib/constants';
import { formatDateTime } from '@/lib/format';
import { Alert, buttonClasses, Card } from '@/components/ui/primitives';
import { CaseStatusChip } from '@/components/cases/CaseStatusChip';

export const metadata: Metadata = { title: 'Cases' };

/**
 * Case oversight.
 *
 * Read-only by design. An administrator runs the platform and does not act as a
 * lawyer on it, so there is no accept, decline or progress control anywhere on
 * this screen.
 */
export default async function AdminCasesPage() {
  await requireReviewer();
  const [cases, counts] = await Promise.all([listCasesForAdmin(), caseStatusCounts()]);

  const order = ['SUBMITTED', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'DECLINED'];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Cases</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          Every case on the platform, for oversight. This view is read-only: accepting, declining or
          progressing a case is the work of the lawyer it was sent to, never of an administrator.
        </p>
      </header>

      <Alert tone="info" title="What this view does and does not show">
        You can see that a case exists, who is on it, its state and its timeline. The client&rsquo;s
        description of their matter and the messages exchanged about it may be legally privileged and
        are not shown here — not to you, and not to any administrator.
      </Alert>

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {order.map((status) => (
          <Card key={status}>
            <p className="text-xs text-slate-600">{LEGAL_CASE_STATUS_LABEL[status] ?? status}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{counts.get(status) ?? 0}</p>
          </Card>
        ))}
      </div>

      <section>
        <h2 className="mb-3 font-semibold text-slate-900">
          All cases ({cases.length}
          {cases.length === 100 ? '+ (showing the 100 most recent)' : ''})
        </h2>

        {cases.length === 0 ? (
          <p className="text-sm text-slate-600">No cases have been submitted yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-4xl text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Reference</th>
                  <th className="px-3 py-2 font-medium">Title</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Client</th>
                  <th className="px-3 py-2 font-medium">Professional</th>
                  <th className="px-3 py-2 font-medium">State</th>
                  <th className="px-3 py-2 font-medium">Submitted</th>
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
                      {LEGAL_AREA_LABEL[item.caseType] ?? item.caseType}
                    </td>
                    <td className="max-w-48 truncate px-3 py-2 text-xs text-slate-600">
                      {item.client.profile?.fullName?.trim() || item.client.email}
                    </td>
                    <td className="max-w-48 truncate px-3 py-2 text-xs text-slate-600">
                      {item.firm?.legalName ??
                        item.lawyer?.user.profile?.fullName?.trim() ??
                        item.lawyer?.user.email ?? (
                          <span className="text-amber-700">Not assigned</span>
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
                        Oversight
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
          Verification queue
        </Link>
        <Link href="/admin/users" className={buttonClasses('secondary', 'md')}>
          Accounts
        </Link>
      </div>
    </div>
  );
}
