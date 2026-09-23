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
import { localiseFormState } from '@/lib/i18n/form-messages';

/**
 * Stores a browser's push subscription.
 *
 * The browser produces this after the member grants permission; it is the only
 * thing that lets an alert reach them with the tab closed.
 */
async function subscribeToPushActionImpl(_prev: FormState, formData: FormData): Promise<FormState> {
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

async function unsubscribeFromPushActionImpl(_prev: FormState, formData: FormData): Promise<FormState> {
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

/**
 * The actions, localised.
 *
 * Each one is the same function with its result passed through the message
 * catalogue, so a failed form reads in the language the member is using. The
 * implementation keeps its own name with an `Impl` suffix because a `'use
 * server'` module may only export async function declarations — a wrapped
 * constant would be rejected at build time.
 */
export async function subscribeToPushAction(
  ...args: Parameters<typeof subscribeToPushActionImpl>
): Promise<Awaited<ReturnType<typeof subscribeToPushActionImpl>>> {
  return localiseFormState(await subscribeToPushActionImpl(...args));
}

export async function unsubscribeFromPushAction(
  ...args: Parameters<typeof unsubscribeFromPushActionImpl>
): Promise<Awaited<ReturnType<typeof unsubscribeFromPushActionImpl>>> {
  return localiseFormState(await unsubscribeFromPushActionImpl(...args));
}
