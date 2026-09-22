'use client';

import { useActionState } from 'react';
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from '@/app/actions/firm-actions';
import { initialFormState } from '@/lib/form-state';
import { SubmitButton } from '@/components/ui/SubmitButton';

export function MarkReadButton({ notificationId }: { notificationId: string }) {
  const [state, formAction] = useActionState(markNotificationReadAction, initialFormState);

  return (
    <form action={formAction} className="inline">
      {state && !state.ok && state.message ? (
        <span className="mr-2 text-xs text-red-700">{state.message}</span>
      ) : null}
      <input type="hidden" name="notificationId" value={notificationId} />
      <SubmitButton variant="ghost" size="sm" pendingLabel="…">
        Mark read
      </SubmitButton>
    </form>
  );
}

export function MarkAllReadButton() {
  const [state, formAction] = useActionState(markAllNotificationsReadAction, initialFormState);

  return (
    <form action={formAction} className="inline">
      {state && !state.ok && state.message ? (
        <span className="mr-2 text-xs text-red-700">{state.message}</span>
      ) : null}
      <SubmitButton variant="secondary" size="sm" pendingLabel="Marking…">
        Mark all as read
      </SubmitButton>
    </form>
  );
}
