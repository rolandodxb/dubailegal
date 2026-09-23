'use client';

import { useActionState } from 'react';
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from '@/app/actions/firm-actions';
import { initialFormState } from '@/lib/form-state';
import { SubmitButton } from '@/components/ui/SubmitButton';

export function MarkReadButton({
  notificationId,
  labels,
}: {
  notificationId: string;
  labels: { markRead: string };
}) {
  const [state, formAction] = useActionState(markNotificationReadAction, initialFormState);

  return (
    <form action={formAction} className="inline">
      {state && !state.ok && state.message ? (
        <span className="mr-2 text-xs text-red-700">{state.message}</span>
      ) : null}
      <input type="hidden" name="notificationId" value={notificationId} />
      <SubmitButton variant="ghost" size="sm" pendingLabel="…">
        {labels.markRead}
      </SubmitButton>
    </form>
  );
}

export function MarkAllReadButton({
  labels,
}: {
  labels: { markAllRead: string; marking: string };
}) {
  const [state, formAction] = useActionState(markAllNotificationsReadAction, initialFormState);

  return (
    <form action={formAction} className="inline">
      {state && !state.ok && state.message ? (
        <span className="mr-2 text-xs text-red-700">{state.message}</span>
      ) : null}
      <SubmitButton variant="secondary" size="sm" pendingLabel={labels.marking}>
        {labels.markAllRead}
      </SubmitButton>
    </form>
  );
}
