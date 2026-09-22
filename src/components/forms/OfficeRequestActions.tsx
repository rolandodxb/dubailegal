'use client';

import { useActionState } from 'react';
import { respondToOfficeRequestAction } from '@/app/actions/appointment-actions';
import { initialFormState } from '@/lib/form-state';
import { Alert } from '@/components/ui/primitives';
import { SubmitButton } from '@/components/ui/SubmitButton';

/**
 * The client's answer to being asked to come to the office.
 *
 * Declining does not cancel the meeting: it tells the professional the client
 * will not travel, so they can offer a video call instead.
 */
export function OfficeRequestActions({ appointmentId }: { appointmentId: string }) {
  const [state, formAction] = useActionState(respondToOfficeRequestAction, initialFormState);

  return (
    <div className="mt-3">
      {state?.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      {state && !state.ok && state.message ? <Alert tone="error">{state.message}</Alert> : null}

      <div className="flex flex-wrap gap-2">
        <form action={formAction}>
          <input type="hidden" name="appointmentId" value={appointmentId} />
          <input type="hidden" name="accept" value="true" />
          <SubmitButton size="sm" pendingLabel="Confirming…">
            I will attend
          </SubmitButton>
        </form>
        <form action={formAction}>
          <input type="hidden" name="appointmentId" value={appointmentId} />
          <input type="hidden" name="accept" value="false" />
          <SubmitButton variant="secondary" size="sm" pendingLabel="Sending…">
            I cannot come
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}
