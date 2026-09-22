'use client';

import { useActionState } from 'react';
import {
  submitVerificationAction,
  withdrawVerificationAction,
} from '@/app/actions/profile-actions';
import { initialFormState } from '@/lib/form-state';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { Alert } from '@/components/ui/primitives';

/** Submits the account's evidence to the review queue. */
export function SubmitVerificationForm({ blockers }: { blockers: string[] }) {
  const [state, formAction] = useActionState(submitVerificationAction, initialFormState);
  const blocked = blockers.length > 0;

  return (
    <form action={formAction} className="space-y-4">
      {state?.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      {state && !state.ok && state.message ? <Alert tone="error">{state.message}</Alert> : null}

      {blocked ? (
        <Alert tone="warning" title="Before you can submit">
          <ul className="list-disc space-y-1 pl-4">
            {blockers.map((blocker) => (
              <li key={blocker}>{blocker}</li>
            ))}
          </ul>
        </Alert>
      ) : null}

      <SubmitButton size="lg" disabled={blocked} pendingLabel="Submitting…">
        Submit for verification
      </SubmitButton>

      {blocked ? (
        <p className="text-xs text-slate-500">
          The button becomes active once every item above is complete.
        </p>
      ) : null}
    </form>
  );
}

/** Withdraws a request that is still with a reviewer. */
export function WithdrawVerificationForm() {
  const [state, formAction] = useActionState(withdrawVerificationAction, initialFormState);

  return (
    <form action={formAction} className="space-y-4">
      {state?.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      {state && !state.ok && state.message ? <Alert tone="error">{state.message}</Alert> : null}

      <SubmitButton
        variant="secondary"
        confirm="Withdraw your verification request? You will be able to change your documents, then submit again."
        pendingLabel="Withdrawing…"
      >
        Withdraw request
      </SubmitButton>
      <p className="text-xs text-slate-500">
        While a request is with a reviewer, your documents cannot be changed.
      </p>
    </form>
  );
}
