import type { Metadata } from 'next';
import { requireReviewer } from '@/lib/auth';
import { paymentOverview } from '@/server/services/payment-service';
import { getI18n } from '@/lib/i18n';
import { formatAed } from '@/lib/payment-format';
import { formatDateTime } from '@/lib/format';
import { Alert, Card } from '@/components/ui/primitives';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.items.payments };
}

const STATUS_STYLE: Record<string, string> = {
  REQUESTED: 'bg-amber-50 text-amber-900 ring-amber-200',
  PAID: 'bg-green-50 text-green-800 ring-green-200',
  CANCELLED: 'bg-slate-100 text-slate-600 ring-slate-200',
};

/**
 * Fee activity, for oversight.
 *
 * These figures are **simulated**. No payment provider is connected, so a "paid"
 * row means the client said they paid and attached proof — not that money moved.
 * The screen says so, because an operator acting on these numbers as if they were
 * real would be the worst possible outcome.
 */
export default async function AdminPaymentsPage() {
  await requireReviewer();
  const [{ t, effectiveLocale }, overview] = await Promise.all([getI18n(), paymentOverview()]);

  const statusLabel: Record<string, string> = t.admin.payments.status;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">{t.items.payments}</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">{t.admin.payments.intro}</p>
      </header>

      <Alert tone="warning" title={t.admin.payments.alertTitle}>
        {t.admin.payments.alertBody}
      </Alert>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: t.admin.payments.stats.awaiting, value: String(overview.requested) },
          { label: t.admin.payments.stats.paid, value: String(overview.paid) },
          { label: t.admin.payments.stats.withdrawn, value: String(overview.cancelled) },
          {
            label: t.admin.payments.stats.simulatedValue,
            value: formatAed(overview.paidValueFils, effectiveLocale),
          },
        ].map((stat) => (
          <Card key={stat.label}>
            <p className="text-sm text-slate-600">{stat.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{stat.value}</p>
          </Card>
        ))}
      </div>

      <Card>
        <p className="text-sm text-slate-600">{t.admin.payments.requestedNotPaid}</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
          {formatAed(overview.requestedValueFils, effectiveLocale)}
        </p>
      </Card>

      <section>
        <h2 className="mb-3 font-semibold text-slate-900">
          {t.admin.payments.feeRequests.replace('{count}', String(overview.rows.length))}
        </h2>
        {overview.rows.length === 0 ? (
          <p className="text-sm text-slate-600">{t.admin.payments.empty}</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-4xl text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">{t.admin.payments.requested}</th>
                  <th className="px-3 py-2 font-medium">{t.admin.payments.case}</th>
                  <th className="px-3 py-2 font-medium">{t.admin.payments.by}</th>
                  <th className="px-3 py-2 font-medium">{t.common.amount}</th>
                  <th className="px-3 py-2 font-medium">{t.admin.payments.state}</th>
                  <th className="px-3 py-2 font-medium">{t.admin.payments.proof}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {overview.rows.map((row) => (
                  <tr key={row.id}>
                    <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-500">
                      {formatDateTime(row.createdAt)}
                    </td>
                    <td className="max-w-48 truncate px-3 py-2 text-xs text-slate-700">
                      {row.case.reference} — {row.case.title}
                    </td>
                    <td className="max-w-48 truncate px-3 py-2 text-xs text-slate-600">
                      {row.requestedBy.profile?.fullName?.trim() || row.requestedBy.email}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 font-medium tabular-nums text-slate-900">
                      {formatAed(row.amountFils, effectiveLocale)}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                          STATUS_STYLE[row.status] ?? 'bg-slate-100 text-slate-700 ring-slate-200'
                        }`}
                      >
                        {statusLabel[row.status] ?? row.status.toLowerCase()}
                      </span>
                      {row.method ? (
                        <span className="mt-1 block text-xs text-slate-500">
                          {row.method === 'CARD' ? t.admin.payments.card : t.admin.payments.transfer}
                          {row.reference ? ` · ${row.reference}` : ''}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-600">
                      {row.proofDocumentId ? t.admin.payments.attached : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
