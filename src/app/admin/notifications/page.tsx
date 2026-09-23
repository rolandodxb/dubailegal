import type { Metadata } from 'next';
import { requireReviewer } from '@/lib/auth';
import { pushOverview } from '@/server/services/push-service';
import { env } from '@/lib/env';
import { formatDateTime } from '@/lib/format';
import { getI18n } from '@/lib/i18n';
import { Alert, Card } from '@/components/ui/primitives';

export const metadata: Metadata = { title: 'Notifications' };

/**
 * Push notification health.
 *
 * Shows whether push is configured, how many browsers are subscribed, and which
 * subscriptions are failing. A member who never enabled notifications simply does
 * not appear here; their in-app alerts still work.
 */
export default async function AdminNotificationsPage() {
  const [{ t }] = await Promise.all([getI18n(), requireReviewer()]);
  const overview = await pushOverview();

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">{t.admin.notifications.title}</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">{t.admin.notifications.intro}</p>
      </header>

      <Alert
        tone={overview.configured ? 'success' : 'warning'}
        title={
          overview.configured
            ? t.admin.notifications.configuredTitle
            : t.admin.notifications.notConfiguredTitle
        }
      >
        {overview.configured ? (
          <>
            {t.admin.notifications.configuredBody}{' '}
            <code>{env.vapidSubject}</code>.
          </>
        ) : (
          <>{t.admin.notifications.notConfiguredBody}</>
        )}
      </Alert>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: t.admin.notifications.stats.subscribedBrowsers, value: overview.total },
          { label: t.admin.notifications.stats.membersWithPush, value: overview.members },
          {
            label: t.admin.notifications.stats.failingSubscriptions,
            value: overview.recent.filter((row) => row.failureCount > 0).length,
          },
        ].map((stat) => (
          <Card key={stat.label}>
            <p className="text-sm text-slate-600">{stat.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{stat.value}</p>
          </Card>
        ))}
      </div>

      <section>
        <h2 className="mb-3 font-semibold text-slate-900">
          {t.admin.notifications.subscriptionsHeading} ({overview.recent.length})
        </h2>
        {overview.recent.length === 0 ? (
          <p className="text-sm text-slate-600">{t.admin.notifications.emptyBody}</p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {overview.recent.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm text-slate-900">{row.user.email}</p>
                  <p className="truncate text-xs text-slate-500">
                    {row.userAgent ?? t.admin.notifications.unknownBrowser} ·{' '}
                    {t.admin.notifications.subscribed} {formatDateTime(row.createdAt)}
                    {row.lastUsedAt
                      ? ` · ${t.admin.notifications.lastDelivered} ${formatDateTime(row.lastUsedAt)}`
                      : ''}
                  </p>
                  {row.lastError ? (
                    <p className="mt-1 text-xs text-red-700">
                      {row.failureCount} {t.admin.notifications.failures}: {row.lastError}
                    </p>
                  ) : null}
                </div>
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                    row.failureCount === 0
                      ? 'bg-green-50 text-green-800 ring-green-200'
                      : 'bg-amber-50 text-amber-900 ring-amber-200'
                  }`}
                >
                  {row.failureCount === 0
                    ? t.admin.notifications.healthy
                    : `${row.failureCount} ${t.admin.notifications.failures}`}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs text-slate-500">{t.admin.notifications.note}</p>
      </section>
    </div>
  );
}
