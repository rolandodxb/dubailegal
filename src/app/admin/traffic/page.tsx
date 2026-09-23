import type { Metadata } from 'next';
import Link from 'next/link';
import { requireReviewer } from '@/lib/auth';
import { listTraffic, trafficSummary, TRAFFIC_RETENTION_DAYS } from '@/server/services/traffic-service';
import { formatDateTime } from '@/lib/format';
import { getI18n } from '@/lib/i18n';
import { accountTypeLabel } from '@/lib/i18n/labels';
import { buttonClasses, Card, Input } from '@/components/ui/primitives';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.items.activityRegister };
}

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
  const [{ t }] = await Promise.all([getI18n(), requireReviewer()]);
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
        <h1 className="text-2xl font-semibold text-slate-900">{t.items.activityRegister}</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          {t.admin.traffic.intro.replace('{days}', String(TRAFFIC_RETENTION_DAYS))}
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: t.admin.traffic.stats.requests24h, value: summary.last24h },
          { label: t.admin.traffic.stats.errors24h, value: summary.errors24h },
          { label: t.admin.traffic.stats.signedInMembers24h, value: summary.distinctUsers },
          {
            label: t.admin.traffic.stats.registerStarts,
            value: summary.oldest ? formatDateTime(summary.oldest) : '—',
          },
        ].map((stat) => (
          <Card key={stat.label}>
            <p className="text-sm text-slate-600">{stat.label}</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">{stat.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="font-semibold text-slate-900">{t.admin.traffic.busiestAreas}</h2>
          <ul className="mt-3 divide-y divide-slate-100">
            {summary.topPaths.length === 0 ? (
              <li className="py-2 text-sm text-slate-600">{t.admin.traffic.noActivity}</li>
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
          <h2 className="font-semibold text-slate-900">{t.admin.traffic.mostActiveAccounts}</h2>
          <ul className="mt-3 divide-y divide-slate-100">
            {summary.topUsers.length === 0 ? (
              <li className="py-2 text-sm text-slate-600">{t.admin.traffic.noSignedInActivity}</li>
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
                        {accountTypeLabel(t, entry.accountType)}
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
              {t.admin.traffic.filterByPath}
            </label>
            <Input id="path" name="path" defaultValue={params.path ?? ''} placeholder="/cases" />
          </div>
          <div className="w-40">
            <label htmlFor="status" className="mb-1.5 block text-sm font-medium text-slate-800">
              {t.admin.traffic.statusCode}
            </label>
            <Input
              id="status"
              name="status"
              type="number"
              min={100}
              max={599}
              defaultValue={params.status ?? ''}
              placeholder={t.admin.traffic.anyStatus}
            />
          </div>
          <button type="submit" className={buttonClasses('primary', 'md')}>
            {t.common.filter}
          </button>
          {params.path || params.status ? (
            <Link href="/admin/traffic" className={buttonClasses('secondary', 'md')}>
              {t.common.clear}
            </Link>
          ) : null}
        </form>
      </Card>

      <section>
        <h2 className="mb-3 font-semibold text-slate-900">
          {t.admin.traffic.recordsHeading} ({entries.total.toLocaleString('en-GB')})
        </h2>

        {entries.rows.length === 0 ? (
          <p className="text-sm text-slate-600">{t.admin.traffic.noMatches}</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-3xl text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">{t.common.time}</th>
                  <th className="px-3 py-2 font-medium">{t.admin.traffic.method}</th>
                  <th className="px-3 py-2 font-medium">{t.admin.traffic.path}</th>
                  <th className="px-3 py-2 font-medium">{t.common.status}</th>
                  <th className="px-3 py-2 font-medium">{t.admin.traffic.duration}</th>
                  <th className="px-3 py-2 font-medium">{t.admin.traffic.account}</th>
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
                      {entry.user?.email ?? (
                        <span className="text-slate-400">{t.admin.traffic.signedOut}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {entries.pageCount > 1 ? (
          <nav
            className="mt-4 flex items-center justify-between gap-3"
            aria-label={t.directory.pagination}
          >
            {entries.page > 1 ? (
              <Link href={buildUrl(entries.page - 1)} className={buttonClasses('secondary', 'sm')}>
                ← {t.admin.traffic.newer}
              </Link>
            ) : (
              <span />
            )}
            <span className="text-sm text-slate-600">
              {t.admin.traffic.pageOf
                .replace('{page}', String(entries.page))
                .replace('{total}', String(entries.pageCount))}
            </span>
            {entries.page < entries.pageCount ? (
              <Link href={buildUrl(entries.page + 1)} className={buttonClasses('secondary', 'sm')}>
                {t.admin.traffic.older} →
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
