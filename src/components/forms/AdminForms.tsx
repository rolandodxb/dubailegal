'use client';

import { useActionState } from 'react';
import {
  claimCaseAction,
  decideCaseAction,
  reinstateUserAction,
  reviewDocumentAction,
  setReviewerRoleAction,
  suspendUserAction,
} from '@/app/actions/admin-actions';
import { deleteAccountAction } from '@/app/actions/admin-ops-actions';
import { initialFormState } from '@/lib/form-state';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { Alert, Field, Input, Textarea } from '@/components/ui/primitives';

export function ClaimCaseForm({
  caseId,
  labels,
}: {
  caseId: string;
  labels: { button: string; pending: string; hint: string };
}) {
  const [state, formAction] = useActionState(claimCaseAction, initialFormState);
  return (
    <form action={formAction} className="space-y-3">
      {state && !state.ok && state.message ? <Alert tone="error">{state.message}</Alert> : null}
      <input type="hidden" name="caseId" value={caseId} />
      <SubmitButton pendingLabel={labels.pending}>{labels.button}</SubmitButton>
      <p className="text-xs text-slate-500">{labels.hint}</p>
    </form>
  );
}

export function ReviewDocumentForm({
  documentId,
  caseId,
  labels,
}: {
  documentId: string;
  caseId: string;
  labels: { notesLabel: string; notesHint: string; accept: string; reject: string };
}) {
  const [state, formAction] = useActionState(reviewDocumentAction, initialFormState);

  return (
    <form action={formAction} className="mt-3 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
      {state?.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      {state && !state.ok && state.message ? <Alert tone="error">{state.message}</Alert> : null}

      <input type="hidden" name="documentId" value={documentId} />
      <input type="hidden" name="caseId" value={caseId} />

      <Field
        label={labels.notesLabel}
        htmlFor={`notes-${documentId}`}
        error={state?.fieldErrors?.notes}
        hint={labels.notesHint}
      >
        <Input id={`notes-${documentId}`} name="notes" maxLength={2000} />
      </Field>

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          name="decision"
          value="APPROVED"
          className="inline-flex items-center justify-center rounded-lg bg-green-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-800"
        >
          {labels.accept}
        </button>
        <button
          type="submit"
          name="decision"
          value="REJECTED"
          className="inline-flex items-center justify-center rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-red-700 ring-1 ring-inset ring-red-200 hover:bg-red-50"
        >
          {labels.reject}
        </button>
      </div>
    </form>
  );
}

export function DecisionForm({
  caseId,
  labels,
}: {
  caseId: string;
  labels: {
    errorTitle: string;
    reasonLabel: string;
    reasonHint: string;
    approve: string;
    refuse: string;
    footnote: string;
  };
}) {
  const [state, formAction] = useActionState(decideCaseAction, initialFormState);

  return (
    <form action={formAction} className="space-y-4">
      {state && !state.ok && state.message ? (
        <Alert tone="error" title={labels.errorTitle}>
          {state.message}
        </Alert>
      ) : null}

      <input type="hidden" name="caseId" value={caseId} />

      <Field
        label={labels.reasonLabel}
        htmlFor="decision-notes"
        error={state?.fieldErrors?.notes}
        hint={labels.reasonHint}
      >
        <Textarea id="decision-notes" name="notes" rows={4} maxLength={2000} />
      </Field>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          name="decision"
          value="APPROVED"
          className="inline-flex items-center justify-center rounded-lg bg-green-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-800"
        >
          {labels.approve}
        </button>
        <button
          type="submit"
          name="decision"
          value="REJECTED"
          className="inline-flex items-center justify-center rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-red-700 ring-1 ring-inset ring-red-200 hover:bg-red-50"
        >
          {labels.refuse}
        </button>
      </div>

      <p className="text-xs text-slate-500">{labels.footnote}</p>
    </form>
  );
}

export function SuspendUserForm({
  userId,
  labels,
}: {
  userId: string;
  labels: { reasonLabel: string; confirm: string; pending: string; button: string };
}) {
  const [state, formAction] = useActionState(suspendUserAction, initialFormState);
  return (
    <form action={formAction} className="mt-2 space-y-2">
      {state?.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      {state && !state.ok && state.message ? <Alert tone="error">{state.message}</Alert> : null}
      <input type="hidden" name="userId" value={userId} />
      <Field label={labels.reasonLabel} htmlFor={`reason-${userId}`} error={state?.fieldErrors?.reason}>
        <Input id={`reason-${userId}`} name="reason" maxLength={300} />
      </Field>
      <SubmitButton
        variant="danger"
        size="sm"
        confirm={labels.confirm}
        pendingLabel={labels.pending}
      >
        {labels.button}
      </SubmitButton>
    </form>
  );
}

export function ReinstateUserForm({
  userId,
  labels,
}: {
  userId: string;
  labels: { pending: string; button: string };
}) {
  const [state, formAction] = useActionState(reinstateUserAction, initialFormState);
  return (
    <form action={formAction} className="mt-2 space-y-2">
      {state?.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      {state && !state.ok && state.message ? <Alert tone="error">{state.message}</Alert> : null}
      <input type="hidden" name="userId" value={userId} />
      <SubmitButton variant="secondary" size="sm" pendingLabel={labels.pending}>
        {labels.button}
      </SubmitButton>
    </form>
  );
}

/**
 * Deletes an account for good.
 *
 * Held behind a disclosure and guarded by typing the account's email address, so
 * it cannot be reached by a stray click. Suspension is the reversible option and
 * sits above it.
 */
export function DeleteAccountForm({
  userId,
  email,
  labels,
}: {
  userId: string;
  email: string;
  labels: {
    summary: string;
    confirmLabel: string;
    hint: string;
    pending: string;
    button: string;
  };
}) {
  const [state, formAction] = useActionState(deleteAccountAction, initialFormState);

  return (
    <details className="rounded-lg border border-red-200 bg-red-50/50 p-3">
      <summary className="cursor-pointer text-xs font-semibold text-red-800">
        {labels.summary}
      </summary>

      <form action={formAction} className="mt-3 space-y-3">
        {state?.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
        {state && !state.ok && state.message ? <Alert tone="error">{state.message}</Alert> : null}

        <input type="hidden" name="userId" value={userId} />

        <Field
          label={labels.confirmLabel.replace('{email}', email)}
          htmlFor={`confirm-delete-${userId}`}
          error={state?.fieldErrors?.confirm}
          hint={labels.hint}
        >
          <Input
            id={`confirm-delete-${userId}`}
            name="confirm"
            autoComplete="off"
            placeholder={email}
            error={state?.fieldErrors?.confirm}
          />
        </Field>

        <SubmitButton variant="danger" size="sm" pendingLabel={labels.pending}>
          {labels.button}
        </SubmitButton>
      </form>
    </details>
  );
}

export function ReviewerRoleForm({
  userId,
  grant,
  labels,
}: {
  userId: string;
  grant: boolean;
  labels: {
    grantConfirm: string;
    revokeConfirm: string;
    pending: string;
    makeReviewer: string;
    removeReviewer: string;
  };
}) {
  const [state, formAction] = useActionState(setReviewerRoleAction, initialFormState);
  return (
    <form action={formAction} className="inline">
      {state && !state.ok && state.message ? (
        <span className="mr-2 text-xs text-red-700">{state.message}</span>
      ) : null}
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="grant" value={grant ? 'true' : 'false'} />
      <SubmitButton
        variant={grant ? 'secondary' : 'ghost'}
        size="sm"
        confirm={grant ? labels.grantConfirm : labels.revokeConfirm}
        pendingLabel={labels.pending}
      >
        {grant ? labels.makeReviewer : labels.removeReviewer}
      </SubmitButton>
    </form>
  );
}
