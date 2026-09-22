import webpush from 'web-push';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { env } from '@/lib/env';

/**
 * Browser push notifications.
 *
 * A member turns notifications on from their account page. The browser hands
 * back a subscription, which is stored here; every in-app alert then also goes
 * out as a push, so a case update or a new message reaches a phone with the tab
 * closed.
 *
 * Push is only claimed to work when a VAPID key pair is configured and the
 * browser reports support. When it is not configured, `pushConfigured()` is false
 * and the interface says so rather than showing a button that cannot work.
 *
 * Delivery is best effort by design: a push service that rejects a subscription
 * causes that subscription to be dropped, never the action that raised the alert.
 */

let configured = false;
if (env.vapidPublicKey.length > 0 && env.vapidPrivateKey.length > 0) {
  try {
    webpush.setVapidDetails(env.vapidSubject, env.vapidPublicKey, env.vapidPrivateKey);
    configured = true;
  } catch (error) {
    console.error('[push] VAPID keys are present but unusable', error);
    configured = false;
  }
}

export function pushConfigured(): boolean {
  return configured;
}

export function vapidPublicKey(): string {
  return env.vapidPublicKey;
}

export const subscriptionSchema = z.object({
  endpoint: z.string().url('The push endpoint is not a valid URL.').max(1000),
  keys: z.object({
    p256dh: z.string().min(10).max(300),
    auth: z.string().min(5).max(300),
  }),
});

export type PushPayload = {
  title: string;
  body?: string | null;
  /** In-app path opened when the notification is clicked. */
  link?: string | null;
  kind?: string;
  tag?: string;
};

/** Stores or refreshes one browser's subscription for a member. */
export async function saveSubscription(
  userId: string,
  rawSubscription: unknown,
  userAgent: string | null,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const parsed = subscriptionSchema.safeParse(rawSubscription);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'That subscription is not valid.' };
  }

  const { endpoint, keys } = parsed.data;

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: {
      userId,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      userAgent: userAgent?.slice(0, 300) ?? null,
      lastUsedAt: new Date(),
    },
    // Re-subscribing on the same browser moves it to whoever is signed in now.
    update: {
      userId,
      p256dh: keys.p256dh,
      auth: keys.auth,
      userAgent: userAgent?.slice(0, 300) ?? null,
      failureCount: 0,
      lastError: null,
      lastUsedAt: new Date(),
    },
  });

  return { ok: true };
}

export async function removeSubscription(userId: string, endpoint: string): Promise<void> {
  await prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });
}

export async function removeAllSubscriptions(userId: string): Promise<number> {
  const result = await prisma.pushSubscription.deleteMany({ where: { userId } });
  return result.count;
}

export async function subscriptionCount(userId: string): Promise<number> {
  return prisma.pushSubscription.count({ where: { userId } });
}

/**
 * Sends one alert to every browser the member has enabled.
 *
 * A 404 or 410 from the push service means the subscription is gone for good, so
 * the row is deleted. Anything else increments a failure counter, and a
 * subscription that keeps failing is dropped rather than retried forever.
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<number> {
  if (!configured) return 0;

  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });
  if (subscriptions.length === 0) return 0;

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body ?? '',
    link: payload.link ?? '/notifications',
    kind: payload.kind ?? 'alert',
    tag: payload.tag ?? payload.kind ?? 'alert',
  });

  let delivered = 0;

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          body,
          { TTL: 60 * 60 * 24 },
        );
        delivered += 1;
        await prisma.pushSubscription.update({
          where: { id: subscription.id },
          data: { lastUsedAt: new Date(), failureCount: 0, lastError: null },
        });
      } catch (error) {
        const status =
          typeof error === 'object' && error !== null && 'statusCode' in error
            ? Number((error as { statusCode?: number }).statusCode)
            : 0;
        const message = error instanceof Error ? error.message : String(error);

        if (status === 404 || status === 410) {
          // The browser has thrown the subscription away.
          await prisma.pushSubscription.delete({ where: { id: subscription.id } }).catch(() => undefined);
          return;
        }

        const failures = subscription.failureCount + 1;
        await prisma.pushSubscription
          .update({
            where: { id: subscription.id },
            data: {
              failureCount: failures,
              lastError: message.slice(0, 300),
              ...(failures >= 5 ? {} : {}),
            },
          })
          .catch(() => undefined);

        // Five consecutive failures is a dead subscription.
        if (failures >= 5) {
          await prisma.pushSubscription.delete({ where: { id: subscription.id } }).catch(() => undefined);
        }

        console.error('[push] delivery failed', status, message);
      }
    }),
  );

  return delivered;
}

/** What the admin console shows about push. */
export async function pushOverview() {
  const [total, byUser, recent] = await Promise.all([
    prisma.pushSubscription.count(),
    prisma.pushSubscription
      .groupBy({ by: ['userId'], _count: { _all: true } })
      .then((rows) => rows.length),
    prisma.pushSubscription.findMany({
      orderBy: { createdAt: 'desc' },
      take: 25,
      select: {
        id: true,
        userAgent: true,
        createdAt: true,
        lastUsedAt: true,
        failureCount: true,
        lastError: true,
        user: { select: { id: true, email: true, accountType: true } },
      },
    }),
  ]);

  return { total, members: byUser, recent, configured };
}
