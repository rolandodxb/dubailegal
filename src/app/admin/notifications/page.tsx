import type { Metadata } from 'next';
import { requireReviewer } from '@/lib/auth';
import { pushOverview } from '@/server/services/push-service';
import { env } from '@/lib/env';
import { formatDateTime } from '@/lib/format';
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
  await requireReviewer();
  const overview = await pushOverview();

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Notifications</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          Browser push delivery. Every in-app alert is also pushed to any browser a member has
          enabled it in, so a case update or an urgent request reaches them with the tab closed.
        </p>
      </header>

      <Alert tone={overview.configured ? 'success' : 'warning'} title={overview.configured ? 'Push is configured' : 'Push is not configured'}>
        {overview.configured ? (
          <>
            A VAPID key pair is loaded and signed messages are being sent. VAPID subject:{' '}
            <code>{env.vapidSubject}</code>.
          </>
        ) : (
          <>
            No usable VAPID key pair is loaded, so no push can be sent. Members are told this on
            their account page rather than being offered a button that cannot work. In-app alerts
            continue regardless.
          </>
        )}
      </Alert>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Subscribed browsers', value: overview.total },
          { label: 'Members with push on', value: overview.members },
          {
            label: 'Failing subscriptions',
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
          Subscriptions ({overview.recent.length})
        </h2>
        {overview.recent.length === 0 ? (
          <p className="text-sm text-slate-600">
            No browser has subscribed yet. Members turn notifications on from Account and security.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {overview.recent.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm text-slate-900">{row.user.email}</p>
                  <p className="truncate text-xs text-slate-500">
                    {row.userAgent ?? 'Unknown browser'} · subscribed {formatDateTime(row.createdAt)}
                    {row.lastUsedAt ? ` · last delivered ${formatDateTime(row.lastUsedAt)}` : ''}
                  </p>
                  {row.lastError ? (
                    <p className="mt-1 text-xs text-red-700">
                      {row.failureCount} failure(s): {row.lastError}
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
                  {row.failureCount === 0 ? 'Healthy' : `${row.failureCount} failure(s)`}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs text-slate-500">
          Subscriptions are removed automatically when a push service reports them gone, or after
          five consecutive failures.
        </p>
      </section>
    </div>
  );
}
