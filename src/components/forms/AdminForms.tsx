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

export function ClaimCaseForm({ caseId }: { caseId: string }) {
  const [state, formAction] = useActionState(claimCaseAction, initialFormState);
  return (
    <form action={formAction} className="space-y-3">
      {state && !state.ok && state.message ? <Alert tone="error">{state.message}</Alert> : null}
      <input type="hidden" name="caseId" value={caseId} />
      <SubmitButton pendingLabel="Taking…">Take this request</SubmitButton>
      <p className="text-xs text-slate-500">
        Taking the request assigns it to you. Other reviewers can still see it, but decisions record
        your name.
      </p>
    </form>
  );
}

export function ReviewDocumentForm({
  documentId,
  caseId,
}: {
  documentId: string;
  caseId: string;
}) {
  const [state, formAction] = useActionState(reviewDocumentAction, initialFormState);

  return (
    <form action={formAction} className="mt-3 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
      {state?.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      {state && !state.ok && state.message ? <Alert tone="error">{state.message}</Alert> : null}

      <input type="hidden" name="documentId" value={documentId} />
      <input type="hidden" name="caseId" value={caseId} />

      <Field
        label="Notes"
        htmlFor={`notes-${documentId}`}
        error={state?.fieldErrors?.notes}
        hint="Required when rejecting, so the applicant knows what to fix."
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
          Accept document
        </button>
        <button
          type="submit"
          name="decision"
          value="REJECTED"
          className="inline-flex items-center justify-center rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-red-700 ring-1 ring-inset ring-red-200 hover:bg-red-50"
        >
          Reject document
        </button>
      </div>
    </form>
  );
}

export function DecisionForm({ caseId }: { caseId: string }) {
  const [state, formAction] = useActionState(decideCaseAction, initialFormState);

  return (
    <form action={formAction} className="space-y-4">
      {state && !state.ok && state.message ? (
        <Alert tone="error" title="The decision was not recorded">
          {state.message}
        </Alert>
      ) : null}

      <input type="hidden" name="caseId" value={caseId} />

      <Field
        label="Reason"
        htmlFor="decision-notes"
        error={state?.fieldErrors?.notes}
        hint="Required when refusing, so the applicant can put it right. Recorded permanently against the case."
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
          Approve and issue badge
        </button>
        <button
          type="submit"
          name="decision"
          value="REJECTED"
          className="inline-flex items-center justify-center rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-red-700 ring-1 ring-inset ring-red-200 hover:bg-red-50"
        >
          Refuse with reasons
        </button>
      </div>

      <p className="text-xs text-slate-500">
        Approval requires every required document to be accepted individually. The decision is
        recorded with your account and cannot be undone — a later change to the evidence withdraws
        the badge and needs a new review.
      </p>
    </form>
  );
}

export function SuspendUserForm({ userId }: { userId: string }) {
  const [state, formAction] = useActionState(suspendUserAction, initialFormState);
  return (
    <form action={formAction} className="mt-2 space-y-2">
      {state?.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      {state && !state.ok && state.message ? <Alert tone="error">{state.message}</Alert> : null}
      <input type="hidden" name="userId" value={userId} />
      <Field label="Reason for suspension" htmlFor={`reason-${userId}`} error={state?.fieldErrors?.reason}>
        <Input id={`reason-${userId}`} name="reason" maxLength={300} />
      </Field>
      <SubmitButton
        variant="danger"
        size="sm"
        confirm="Suspend this account? All its sessions will be signed out."
        pendingLabel="Suspending…"
      >
        Suspend account
      </SubmitButton>
    </form>
  );
}

export function ReinstateUserForm({ userId }: { userId: string }) {
  const [state, formAction] = useActionState(reinstateUserAction, initialFormState);
  return (
    <form action={formAction} className="mt-2 space-y-2">
      {state?.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      {state && !state.ok && state.message ? <Alert tone="error">{state.message}</Alert> : null}
      <input type="hidden" name="userId" value={userId} />
      <SubmitButton variant="secondary" size="sm" pendingLabel="Reinstating…">
        Reinstate account
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
export function DeleteAccountForm({ userId, email }: { userId: string; email: string }) {
  const [state, formAction] = useActionState(deleteAccountAction, initialFormState);

  return (
    <details className="rounded-lg border border-red-200 bg-red-50/50 p-3">
      <summary className="cursor-pointer text-xs font-semibold text-red-800">
        Delete this account permanently
      </summary>

      <form action={formAction} className="mt-3 space-y-3">
        {state?.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
        {state && !state.ok && state.message ? <Alert tone="error">{state.message}</Alert> : null}

        <input type="hidden" name="userId" value={userId} />

        <Field
          label={`Type ${email} to confirm`}
          htmlFor={`confirm-delete-${userId}`}
          error={state?.fieldErrors?.confirm}
          hint="This removes the account, its cases, documents and sessions. It cannot be undone."
        >
          <Input
            id={`confirm-delete-${userId}`}
            name="confirm"
            autoComplete="off"
            placeholder={email}
            error={state?.fieldErrors?.confirm}
          />
        </Field>

        <SubmitButton variant="danger" size="sm" pendingLabel="Deleting…">
          Delete permanently
        </SubmitButton>
      </form>
    </details>
  );
}

export function ReviewerRoleForm({ userId, grant }: { userId: string; grant: boolean }) {
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
        confirm={
          grant
            ? 'Give this account access to review other members\u2019 identity documents?'
            : 'Remove this account\u2019s reviewer access?'
        }
        pendingLabel="…"
      >
        {grant ? 'Make reviewer' : 'Remove reviewer'}
      </SubmitButton>
    </form>
  );
}
