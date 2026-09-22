import type { Metadata } from 'next';
import { requireReviewer } from '@/lib/auth';
import { paymentOverview } from '@/server/services/payment-service';
import { formatAed } from '@/lib/payment-format';
import { formatDateTime } from '@/lib/format';
import { Alert, Card } from '@/components/ui/primitives';

export const metadata: Metadata = { title: 'Payments' };

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
  const overview = await paymentOverview();

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Payments</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          Fees requested by professionals and recorded as paid by clients, with the proof they
          attached.
        </p>
      </header>

      <Alert tone="warning" title="These are simulated payments">
        Dubai Legal has no card processor and no bank integration. No card is charged and no money
        moves. A row marked paid means the client recorded that they paid and attached evidence —
        nothing more. Do not reconcile real accounts against this screen.
      </Alert>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Awaiting payment', value: String(overview.requested) },
          { label: 'Marked paid', value: String(overview.paid) },
          { label: 'Withdrawn', value: String(overview.cancelled) },
          { label: 'Simulated value paid', value: formatAed(overview.paidValueFils) },
        ].map((stat) => (
          <Card key={stat.label}>
            <p className="text-sm text-slate-600">{stat.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{stat.value}</p>
          </Card>
        ))}
      </div>

      <Card>
        <p className="text-sm text-slate-600">Requested but not yet paid</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
          {formatAed(overview.requestedValueFils)}
        </p>
      </Card>

      <section>
        <h2 className="mb-3 font-semibold text-slate-900">Fee requests ({overview.rows.length})</h2>
        {overview.rows.length === 0 ? (
          <p className="text-sm text-slate-600">No fees have been requested.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-4xl text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Requested</th>
                  <th className="px-3 py-2 font-medium">Case</th>
                  <th className="px-3 py-2 font-medium">By</th>
                  <th className="px-3 py-2 font-medium">Amount</th>
                  <th className="px-3 py-2 font-medium">State</th>
                  <th className="px-3 py-2 font-medium">Proof</th>
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
                      {formatAed(row.amountFils)}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                          STATUS_STYLE[row.status] ?? 'bg-slate-100 text-slate-700 ring-slate-200'
                        }`}
                      >
                        {row.status.toLowerCase()}
                      </span>
                      {row.method ? (
                        <span className="mt-1 block text-xs text-slate-500">
                          {row.method === 'CARD' ? 'card' : 'transfer'}
                          {row.reference ? ` · ${row.reference}` : ''}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-600">
                      {row.proofDocumentId ? 'Attached' : '—'}
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
