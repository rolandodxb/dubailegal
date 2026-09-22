import type { Metadata } from 'next';
import Link from 'next/link';
import { requireReviewer } from '@/lib/auth';
import { listTraffic, trafficSummary, TRAFFIC_RETENTION_DAYS } from '@/server/services/traffic-service';
import { ACCOUNT_TYPE_LABEL } from '@/lib/constants';
import { formatDateTime } from '@/lib/format';
import { buttonClasses, Card, Input } from '@/components/ui/primitives';

export const metadata: Metadata = { title: 'Activity register' };

/**
 * The traffic register: every page view and API call this installation served.
 *
 * IP addresses appear only as keyed digests — the register is for understanding
 * activity, not for identifying people by network address.
 */
export default async function AdminTrafficPage({
  searchParams,
}: {
  searchParams: Promise<{ path?: string; status?: string; page?: string }>;
}) {
  await requireReviewer();
  const params = await searchParams;

  const statusFilter = params.status ? Number.parseInt(params.status, 10) : undefined;
  const page = params.page ? Number.parseInt(params.page, 10) : 1;

  const [summary, entries] = await Promise.all([
    trafficSummary(),
    listTraffic({
      path: params.path?.trim() || undefined,
      status: Number.isFinite(statusFilter) ? statusFilter : undefined,
      page: Number.isFinite(page) && page > 0 ? page : 1,
    }),
  ]);

  const buildUrl = (nextPage: number) => {
    const search = new URLSearchParams();
    if (params.path) search.set('path', params.path);
    if (params.status) search.set('status', params.status);
    if (nextPage > 1) search.set('page', String(nextPage));
    const query = search.toString();
    return query.length > 0 ? `/admin/traffic?${query}` : '/admin/traffic';
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Activity register</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          Every page view and API call served by this installation. IP addresses are stored only as
          keyed digests, and records are pruned after {TRAFFIC_RETENTION_DAYS} days.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Requests, last 24h', value: summary.last24h },
          { label: 'Errors, last 24h', value: summary.errors24h },
          { label: 'Signed-in members, last 24h', value: summary.distinctUsers },
          { label: 'Register starts', value: summary.oldest ? formatDateTime(summary.oldest) : '—' },
        ].map((stat) => (
          <Card key={stat.label}>
            <p className="text-sm text-slate-600">{stat.label}</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">{stat.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="font-semibold text-slate-900">Busiest areas, last 24h</h2>
          <ul className="mt-3 divide-y divide-slate-100">
            {summary.topPaths.length === 0 ? (
              <li className="py-2 text-sm text-slate-600">No activity recorded yet.</li>
            ) : (
              summary.topPaths.map((entry) => (
                <li key={entry.path} className="flex items-center justify-between gap-3 py-2">
                  <span className="truncate font-mono text-xs text-slate-700">{entry.path}</span>
                  <span className="shrink-0 text-sm font-medium text-slate-900">{entry.count}</span>
                </li>
              ))
            )}
          </ul>
        </Card>

        <Card>
          <h2 className="font-semibold text-slate-900">Most active accounts, last 24h</h2>
          <ul className="mt-3 divide-y divide-slate-100">
            {summary.topUsers.length === 0 ? (
              <li className="py-2 text-sm text-slate-600">No signed-in activity recorded yet.</li>
            ) : (
              summary.topUsers.map((entry) => (
                <li
                  key={entry.userId ?? 'anonymous'}
                  className="flex items-center justify-between gap-3 py-2"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-slate-800">{entry.email}</span>
                    {entry.accountType ? (
                      <span className="block text-xs text-slate-500">
                        {ACCOUNT_TYPE_LABEL[entry.accountType]}
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-sm font-medium text-slate-900">{entry.count}</span>
                </li>
              ))
            )}
          </ul>
        </Card>
      </div>

      <Card>
        <form method="get" action="/admin/traffic" className="flex flex-wrap items-end gap-3">
          <div className="min-w-56 flex-1">
            <label htmlFor="path" className="mb-1.5 block text-sm font-medium text-slate-800">
              Filter by path
            </label>
            <Input id="path" name="path" defaultValue={params.path ?? ''} placeholder="/cases" />
          </div>
          <div className="w-40">
            <label htmlFor="status" className="mb-1.5 block text-sm font-medium text-slate-800">
              Status code
            </label>
            <Input
              id="status"
              name="status"
              type="number"
              min={100}
              max={599}
              defaultValue={params.status ?? ''}
              placeholder="any"
            />
          </div>
          <button type="submit" className={buttonClasses('primary', 'md')}>
            Filter
          </button>
          {params.path || params.status ? (
            <Link href="/admin/traffic" className={buttonClasses('secondary', 'md')}>
              Clear
            </Link>
          ) : null}
        </form>
      </Card>

      <section>
        <h2 className="mb-3 font-semibold text-slate-900">
          Records ({entries.total.toLocaleString('en-GB')})
        </h2>

        {entries.rows.length === 0 ? (
          <p className="text-sm text-slate-600">No activity matches that filter.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-3xl text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Time</th>
                  <th className="px-3 py-2 font-medium">Method</th>
                  <th className="px-3 py-2 font-medium">Path</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Duration</th>
                  <th className="px-3 py-2 font-medium">Account</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.rows.map((entry) => (
                  <tr key={entry.id}>
                    <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-500">
                      {formatDateTime(entry.createdAt)}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-slate-700">{entry.method}</td>
                    <td className="px-3 py-2 font-mono text-xs text-slate-800">{entry.path}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                          entry.status >= 500
                            ? 'bg-red-50 text-red-800 ring-red-200'
                            : entry.status >= 400
                              ? 'bg-amber-50 text-amber-900 ring-amber-200'
                              : 'bg-green-50 text-green-800 ring-green-200'
                        }`}
                      >
                        {entry.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-600">
                      {entry.durationMs > 0 ? `${entry.durationMs} ms` : '—'}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-600">
                      {entry.user?.email ?? <span className="text-slate-400">signed out</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {entries.pageCount > 1 ? (
          <nav className="mt-4 flex items-center justify-between gap-3" aria-label="Pagination">
            {entries.page > 1 ? (
              <Link href={buildUrl(entries.page - 1)} className={buttonClasses('secondary', 'sm')}>
                ← Newer
              </Link>
            ) : (
              <span />
            )}
            <span className="text-sm text-slate-600">
              Page {entries.page} of {entries.pageCount}
            </span>
            {entries.page < entries.pageCount ? (
              <Link href={buildUrl(entries.page + 1)} className={buttonClasses('secondary', 'sm')}>
                Older →
              </Link>
            ) : (
              <span />
            )}
          </nav>
        ) : null}
      </section>
    </div>
  );
}
