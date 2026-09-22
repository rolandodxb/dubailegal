import type { Metadata } from 'next';
import Link from 'next/link';
import { requireActiveUser } from '@/lib/auth';
import { listNotifications, unreadNotificationCount } from '@/server/services/notification-service';
import { formatUaeDateTime } from '@/lib/time';
import { Card, EmptyState, cx } from '@/components/ui/primitives';
import { MarkAllReadButton, MarkReadButton } from '@/components/forms/NotificationButtons';

export const metadata: Metadata = { title: 'Alerts' };

/**
 * In-app alerts. With no mail provider configured, this is how a client learns
 * that a case moved or a meeting was booked.
 */
export default async function NotificationsPage() {
  const user = await requireActiveUser();
  const [notifications, unread] = await Promise.all([
    listNotifications(user.id),
    unreadNotificationCount(user.id),
  ]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Alerts</h1>
          <p className="mt-1 text-sm text-slate-600">
            {unread === 0
              ? 'You have no unread alerts.'
              : `${unread} unread alert${unread === 1 ? '' : 's'}.`}{' '}
            Alerts are delivered here because this installation has no email provider configured.
          </p>
        </div>
        {unread > 0 ? <MarkAllReadButton /> : null}
      </header>

      {notifications.length === 0 ? (
        <EmptyState
          title="No alerts yet"
          description="You will be told here when a case changes state, someone messages you, or a meeting is booked with you."
        />
      ) : (
        <ul className="space-y-3">
          {notifications.map((notification) => (
            <Card
              as="li"
              key={notification.id}
              className={cx(notification.readAt ? 'bg-white' : 'border-brand-200 bg-brand-50')}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-medium text-slate-900">{notification.title}</h2>
                  {notification.body ? (
                    <p className="mt-1 text-sm text-slate-700">{notification.body}</p>
                  ) : null}
                  <p className="mt-1 text-xs text-slate-500">
                    {formatUaeDateTime(notification.createdAt)}
                    {notification.readAt ? '' : ' · unread'}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {notification.link ? (
                    <Link
                      href={notification.link}
                      className="text-xs font-medium text-brand-700 hover:underline"
                    >
                      Open
                    </Link>
                  ) : null}
                  {notification.readAt ? null : <MarkReadButton notificationId={notification.id} />}
                </div>
              </div>
            </Card>
          ))}
        </ul>
      )}
    </div>
  );
}
