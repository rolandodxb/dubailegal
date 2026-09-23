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
  labels,
}: {
  vapidPublicKey: string;
  configured: boolean;
  subscriptionCount: number;
  labels: {
    heading: string;
    status: {
      checking: string;
      on: string;
      off: string;
      denied: string;
      unsupported: string;
      unconfigured: string;
    };
    bodyOn: string;
    bodyDenied: string;
    bodyUnsupported: string;
    bodyUnconfigured: string;
    bodyOff: string;
    subscriptionOne: string;
    subscriptionMany: string;
    turningOff: string;
    turnOff: string;
    turnOn: string;
  };
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
            <p className="text-sm font-medium text-slate-900">{labels.heading}</p>
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
                ? labels.status.checking
                : status === 'on'
                  ? labels.status.on
                  : status === 'off'
                    ? labels.status.off
                    : status === 'denied'
                      ? labels.status.denied
                      : status === 'unsupported'
                        ? labels.status.unsupported
                        : labels.status.unconfigured}
            </span>
          </div>

          <p className="mt-1 text-xs text-slate-600">
            {status === 'on'
              ? labels.bodyOn
              : status === 'denied'
                ? labels.bodyDenied
                : status === 'unsupported'
                  ? labels.bodyUnsupported
                  : status === 'unconfigured'
                    ? labels.bodyUnconfigured
                    : labels.bodyOff}
          </p>

          {subscriptionCount > 0 ? (
            <p className="mt-1 text-xs text-slate-500">
              {(subscriptionCount === 1
                ? labels.subscriptionOne
                : labels.subscriptionMany
              ).replace('{count}', String(subscriptionCount))}
            </p>
          ) : null}
        </div>

        <div className="shrink-0">
          {status === 'on' ? (
            <form action={unsubscribeAction}>
              <input type="hidden" name="endpoint" value={endpoint ?? ''} />
              <SubmitButton variant="secondary" pendingLabel={labels.turningOff}>
                {labels.turnOff}
              </SubmitButton>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => void enable()}
              disabled={status !== 'off'}
              className={buttonClasses('primary', 'md')}
            >
              {labels.turnOn}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
