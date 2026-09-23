import type { Metadata } from 'next';
import Link from 'next/link';
import { requireActiveUser } from '@/lib/auth';
import { getI18n } from '@/lib/i18n';
import { listNotifications, unreadNotificationCount } from '@/server/services/notification-service';
import { formatUaeDateTime } from '@/lib/time';
import { notificationText } from '@/lib/i18n/notifications';
import { Card, EmptyState, cx } from '@/components/ui/primitives';
import { MarkAllReadButton, MarkReadButton } from '@/components/forms/NotificationButtons';

/** The tab title, in the reader's language — the same words as the nav entry. */
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.items.alerts };
}

/**
 * In-app alerts. With no mail provider configured, this is how a client learns
 * that a case moved or a meeting was booked.
 */
export default async function NotificationsPage() {
  const [{ t, effectiveLocale }, user] = await Promise.all([getI18n(), requireActiveUser()]);
  const [notifications, unread] = await Promise.all([
    listNotifications(user.id),
    unreadNotificationCount(user.id),
  ]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{t.items.alerts}</h1>
          <p className="mt-1 text-sm text-slate-600">
            {(unread === 0
              ? t.memberCore.notifications.noUnread
              : (unread === 1
                  ? t.memberCore.notifications.unreadOne
                  : t.memberCore.notifications.unreadMany
                ).replace('{count}', String(unread)))}{' '}
            {t.memberCore.notifications.deliveryNote}
          </p>
        </div>
        {unread > 0 ? (
          <MarkAllReadButton
            labels={{
              markAllRead: t.memberCore.notificationButtons.markAllRead,
              marking: t.memberCore.notificationButtons.marking,
            }}
          />
        ) : null}
      </header>

      {notifications.length === 0 ? (
        <EmptyState
          title={t.memberCore.notifications.emptyTitle}
          description={t.memberCore.notifications.emptyBody}
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
                  <h2 className="font-medium text-slate-900">
                    {notificationText(effectiveLocale, notification.title)}
                  </h2>
                  {notification.body ? (
                    <p className="mt-1 text-sm text-slate-700">
                      {notificationText(effectiveLocale, notification.body)}
                    </p>
                  ) : null}
                  <p className="mt-1 text-xs text-slate-500">
                    {formatUaeDateTime(notification.createdAt, effectiveLocale)}
                    {notification.readAt ? '' : t.memberCore.notifications.unreadSuffix}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {notification.link ? (
                    <Link
                      href={notification.link}
                      className="text-xs font-medium text-brand-700 hover:underline"
                    >
                      {t.common.open}
                    </Link>
                  ) : null}
                  {notification.readAt ? null : (
                    <MarkReadButton
                      notificationId={notification.id}
                      labels={{ markRead: t.memberCore.notificationButtons.markRead }}
                    />
                  )}
                </div>
              </div>
            </Card>
          ))}
        </ul>
      )}
    </div>
  );
}
