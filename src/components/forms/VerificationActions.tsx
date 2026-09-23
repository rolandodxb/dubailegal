'use client';

import { useActionState } from 'react';
import {
  submitVerificationAction,
  withdrawVerificationAction,
} from '@/app/actions/profile-actions';
import { initialFormState } from '@/lib/form-state';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { Alert } from '@/components/ui/primitives';

/** The words the submit form shows, in the reader's language. */
export type SubmitVerificationFormLabels = {
  beforeSubmitTitle: string;
  submit: string;
  submitting: string;
  buttonActive: string;
};

/** The words the withdraw form shows, in the reader's language. */
export type WithdrawVerificationFormLabels = {
  confirm: string;
  withdrawing: string;
  withdrawRequest: string;
  withdrawNote: string;
};

/** Submits the account's evidence to the review queue. */
export function SubmitVerificationForm({
  blockers,
  labels,
}: {
  blockers: string[];
  labels: SubmitVerificationFormLabels;
}) {
  const [state, formAction] = useActionState(submitVerificationAction, initialFormState);
  const blocked = blockers.length > 0;

  return (
    <form action={formAction} className="space-y-4">
      {state?.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      {state && !state.ok && state.message ? <Alert tone="error">{state.message}</Alert> : null}

      {blocked ? (
        <Alert tone="warning" title={labels.beforeSubmitTitle}>
          <ul className="list-disc space-y-1 pl-4">
            {blockers.map((blocker) => (
              <li key={blocker}>{blocker}</li>
            ))}
          </ul>
        </Alert>
      ) : null}

      <SubmitButton size="lg" disabled={blocked} pendingLabel={labels.submitting}>
        {labels.submit}
      </SubmitButton>

      {blocked ? <p className="text-xs text-slate-500">{labels.buttonActive}</p> : null}
    </form>
  );
}

/** Withdraws a request that is still with a reviewer. */
export function WithdrawVerificationForm({ labels }: { labels: WithdrawVerificationFormLabels }) {
  const [state, formAction] = useActionState(withdrawVerificationAction, initialFormState);

  return (
    <form action={formAction} className="space-y-4">
      {state?.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      {state && !state.ok && state.message ? <Alert tone="error">{state.message}</Alert> : null}

      <SubmitButton
        variant="secondary"
        confirm={labels.confirm}
        pendingLabel={labels.withdrawing}
      >
        {labels.withdrawRequest}
      </SubmitButton>
      <p className="text-xs text-slate-500">{labels.withdrawNote}</p>
    </form>
  );
}
