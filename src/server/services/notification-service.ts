import { prisma } from '@/lib/db';
import { sendPushToUser } from './push-service';

/**
 * In-app alerts.
 *
 * This installation has no mail provider, so a notification row is the only way
 * a client is told that a case moved or a meeting was booked. Nothing here
 * claims an email was sent.
 */

export type NotificationInput = {
  userId: string;
  kind: string;
  title: string;
  body?: string | null;
  link?: string | null;
};

export async function notify(input: NotificationInput): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId: input.userId,
        kind: input.kind,
        title: input.title,
        body: input.body ?? null,
        link: input.link ?? null,
      },
    });
  } catch (error) {
    // An alert failing must never roll back the action that triggered it.
    console.error('[notify] failed to record notification', input.kind, error);
    return;
  }

  // …and out to any browser that has notifications turned on. Delivery is best
  // effort; a push service refusing a message never undoes the alert above.
  await sendPushToUser(input.userId, {
    title: input.title,
    body: input.body ?? null,
    link: input.link ?? null,
    kind: input.kind,
    tag: input.kind,
  }).catch((error) => console.error('[notify] push failed', input.kind, error));
}

export async function notifyMany(userIds: string[], input: Omit<NotificationInput, 'userId'>): Promise<void> {
  const unique = Array.from(new Set(userIds));
  await Promise.all(unique.map((userId) => notify({ ...input, userId })));
}

export async function listNotifications(userId: string, limit = 50) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export async function unreadNotificationCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, readAt: null } });
}

export async function markNotificationRead(userId: string, notificationId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { id: notificationId, userId, readAt: null },
    data: { readAt: new Date() },
  });
}

export async function markAllNotificationsRead(userId: string): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  return result.count;
}
