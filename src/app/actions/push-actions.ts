'use server';

import { revalidatePath } from 'next/cache';
import { requestMeta, requireActiveUser } from '@/lib/auth';
import { recordAudit } from '@/lib/audit';
import type { FormState } from '@/lib/form-state';
import {
  pushConfigured,
  removeAllSubscriptions,
  removeSubscription,
  saveSubscription,
} from '@/server/services/push-service';

/**
 * Stores a browser's push subscription.
 *
 * The browser produces this after the member grants permission; it is the only
 * thing that lets an alert reach them with the tab closed.
 */
export async function subscribeToPushAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireActiveUser();

  if (!pushConfigured()) {
    return {
      ok: false,
      message:
        'Push notifications are not configured on this installation, so nothing was saved. In-app alerts still work.',
    };
  }

  let subscription: unknown;
  try {
    subscription = JSON.parse(String(formData.get('subscription') ?? 'null'));
  } catch {
    return { ok: false, message: 'The browser sent a subscription that could not be read.' };
  }

  const meta = await requestMeta();
  const result = await saveSubscription(user.id, subscription, meta.userAgent);

  if (!result.ok) return { ok: false, message: result.message };

  await recordAudit({
    actorUserId: user.id,
    action: 'push.subscribed',
    entityType: 'push_subscription',
    entityId: user.id,
    ip: meta.ip,
  });

  revalidatePath('/account');
  return { ok: true, message: 'Notifications are on for this browser.' };
}

export async function unsubscribeFromPushAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireActiveUser();
  const endpoint = String(formData.get('endpoint') ?? '');

  if (endpoint.length > 0) {
    await removeSubscription(user.id, endpoint);
  } else {
    await removeAllSubscriptions(user.id);
  }

  await recordAudit({
    actorUserId: user.id,
    action: 'push.unsubscribed',
    entityType: 'push_subscription',
    entityId: user.id,
  });

  revalidatePath('/account');
  return { ok: true, message: 'Notifications are off. In-app alerts continue as normal.' };
}
