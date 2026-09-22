'use client';

import { useActionState, useCallback, useEffect, useState } from 'react';
import {
  subscribeToPushAction,
  unsubscribeFromPushAction,
} from '@/app/actions/push-actions';
import { initialFormState } from '@/lib/form-state';
import { Alert, buttonClasses } from '@/components/ui/primitives';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { Icon } from '@/components/icons';

type Status = 'checking' | 'unsupported' | 'unconfigured' | 'denied' | 'off' | 'on';

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const normalised = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(normalised);
  const output = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index += 1) output[index] = raw.charCodeAt(index);
  return output;
}

/**
 * Turning browser notifications on or off.
 *
 * The browser is asked for permission only when the member presses the button —
 * never on page load, which is both rude and ineffective. Everything the member
 * needs to know about the state of push on this device is stated plainly,
 * including when it is not configured or has been blocked.
 */
export function PushNotificationSettings({
  vapidPublicKey,
  configured,
  subscriptionCount,
}: {
  vapidPublicKey: string;
  configured: boolean;
  subscriptionCount: number;
}) {
  const [status, setStatus] = useState<Status>('checking');
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [subscribeState, subscribeAction] = useActionState(subscribeToPushAction, initialFormState);
  const [unsubscribeState, unsubscribeAction] = useActionState(unsubscribeFromPushAction, initialFormState);

  const inspect = useCallback(async () => {
    if (!configured) {
      setStatus('unconfigured');
      return;
    }
    if (
      typeof window === 'undefined' ||
      !('serviceWorker' in navigator) ||
      !('PushManager' in window) ||
      !('Notification' in window)
    ) {
      setStatus('unsupported');
      return;
    }
    if (Notification.permission === 'denied') {
      setStatus('denied');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      const existing = await registration.pushManager.getSubscription();
      setEndpoint(existing?.endpoint ?? null);
      setStatus(existing ? 'on' : 'off');
    } catch {
      setStatus('off');
    }
  }, [configured]);

  useEffect(() => {
    void inspect();
  }, [inspect]);

  // Once the server has stored a subscription, reflect it immediately.
  useEffect(() => {
    if (subscribeState?.ok) void inspect();
  }, [subscribeState, inspect]);
  useEffect(() => {
    if (unsubscribeState?.ok) void inspect();
  }, [unsubscribeState, inspect]);

  const enable = async () => {
    if (!configured || status === 'unsupported') return;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      setStatus(permission === 'denied' ? 'denied' : 'off');
      return;
    }

    const registration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    const existing = await registration.pushManager.getSubscription();
    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
      }));

    const body = subscription.toJSON();
    const data = new FormData();
    data.set('subscription', JSON.stringify(body));
    subscribeAction(data);
  };

  const disable = async () => {
    const registration = await navigator.serviceWorker.getRegistration('/');
    const existing = registration ? await registration.pushManager.getSubscription() : null;

    if (existing) {
      await existing.unsubscribe().catch(() => undefined);
      const data = new FormData();
      data.set('endpoint', existing.endpoint);
      unsubscribeAction(data);
    } else {
      const data = new FormData();
      unsubscribeAction(data);
    }
    setEndpoint(null);
    setStatus('off');
  };

  return (
    <div className="space-y-4">
      {subscribeState?.ok && subscribeState.message ? (
        <Alert tone="success">{subscribeState.message}</Alert>
      ) : null}
      {subscribeState && !subscribeState.ok && subscribeState.message ? (
        <Alert tone="error">{subscribeState.message}</Alert>
      ) : null}
      {unsubscribeState?.ok && unsubscribeState.message ? (
        <Alert tone="success">{unsubscribeState.message}</Alert>
      ) : null}
      {unsubscribeState && !unsubscribeState.ok && unsubscribeState.message ? (
        <Alert tone="error">{unsubscribeState.message}</Alert>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-64 flex-1">
          <div className="flex items-center gap-2">
            <Icon name="bell" size={18} className="text-slate-500" />
            <p className="text-sm font-medium text-slate-900">Browser notifications</p>
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                status === 'on'
                  ? 'bg-green-50 text-green-800 ring-green-200'
                  : status === 'checking'
                    ? 'bg-slate-100 text-slate-600 ring-slate-200'
                    : status === 'off'
                      ? 'bg-slate-100 text-slate-700 ring-slate-200'
                      : 'bg-amber-50 text-amber-900 ring-amber-200'
              }`}
            >
              {status === 'checking'
                ? 'Checking…'
                : status === 'on'
                  ? 'On for this browser'
                  : status === 'off'
                    ? 'Off'
                    : status === 'denied'
                      ? 'Blocked by the browser'
                      : status === 'unsupported'
                        ? 'Not supported here'
                        : 'Not configured'}
            </span>
          </div>

          <p className="mt-1 text-xs text-slate-600">
            {status === 'on'
              ? 'Case updates, new messages, emergencies and meeting requests will reach this device even when Dubai Legal is closed.'
              : status === 'denied'
                ? 'This browser has blocked notifications for this site. Allow them in the browser’s site settings, then reload this page.'
                : status === 'unsupported'
                  ? 'This browser does not support push notifications. In-app alerts still appear under Alerts.'
                  : status === 'unconfigured'
                    ? 'This installation has no VAPID key pair, so browser push cannot be offered. In-app alerts still appear under Alerts.'
                    : 'Turn notifications on to be told about case updates, new messages, emergencies and meeting requests on this device.'}
          </p>

          {subscriptionCount > 0 ? (
            <p className="mt-1 text-xs text-slate-500">
              {subscriptionCount} browser{subscriptionCount === 1 ? '' : 's'} currently receive
              notifications for your account.
            </p>
          ) : null}
        </div>

        <div className="shrink-0">
          {status === 'on' ? (
            <form action={unsubscribeAction}>
              <input type="hidden" name="endpoint" value={endpoint ?? ''} />
              <SubmitButton variant="secondary" pendingLabel="Turning off…">
                Turn off
              </SubmitButton>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => void enable()}
              disabled={status !== 'off'}
              className={buttonClasses('primary', 'md')}
            >
              Turn on notifications
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
