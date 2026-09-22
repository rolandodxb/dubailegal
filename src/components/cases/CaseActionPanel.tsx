'use client';

import { useActionState } from 'react';
import {
  acceptCaseAction,
  advanceCaseAction,
  declineCaseAction,
  distributeCaseAction,
  passCaseOfferAction,
  reviewCaseAction,
} from '@/app/actions/case-actions';
import { initialFormState } from '@/lib/form-state';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { Alert, Field, Input, Textarea } from '@/components/ui/primitives';

/**
 * The lawyer's controls on a case: open it for review, accept it, refuse it,
 * then move it forward. Each button is only rendered when the server has said
 * the viewer is allowed to take that step.
 */
export function CaseActionPanel({
  caseId,
  status,
  canReview,
  canAccept,
  canProgress,
  canDecline,
  canDistribute,
}: {
  caseId: string;
  status: string;
  canReview: boolean;
  canAccept: boolean;
  canProgress: boolean;
  canDecline: boolean;
  /** A firm holding the case may release it to its registered lawyers. */
  canDistribute?: boolean;
}) {
  const [reviewState, reviewAction] = useActionState(reviewCaseAction, initialFormState);
  const [acceptState, acceptAction] = useActionState(acceptCaseAction, initialFormState);
  const [declineState, declineAction] = useActionState(declineCaseAction, initialFormState);
  const [advanceState, advanceAction] = useActionState(advanceCaseAction, initialFormState);
  const [distributeState, distributeAction] = useActionState(distributeCaseAction, initialFormState);
  const [passState, passAction] = useActionState(passCaseOfferAction, initialFormState);

  const stateMessage = (state: typeof reviewState) =>
    state && !state.ok && state.message ? <Alert tone="error">{state.message}</Alert> : null;

  const offered = status === 'DISTRIBUTED';

  return (
    <div className="space-y-4">
      {stateMessage(reviewState)}
      {stateMessage(acceptState)}
      {stateMessage(declineState)}
      {stateMessage(advanceState)}

      {distributeState?.ok && distributeState.message ? (
        <Alert tone="success">{distributeState.message}</Alert>
      ) : null}
      {stateMessage(distributeState)}
      {passState?.ok && passState.message ? <Alert tone="success">{passState.message}</Alert> : null}
      {stateMessage(passState)}

      {canDistribute ? (
        <form action={distributeAction} className="space-y-2">
          <input type="hidden" name="caseId" value={caseId} />
          <SubmitButton
            size="lg"
            pendingLabel="Releasing…"
            confirm="Release this case to every lawyer registered with your firm?"
          >
            Accept and send to our lawyers
          </SubmitButton>
          <p className="text-xs text-slate-500">
            Every registered lawyer is offered it. The first to take it is assigned, and the rest are
            stood down automatically.
          </p>
        </form>
      ) : null}

      {canReview ? (
        <form action={reviewAction} className="space-y-2">
          <input type="hidden" name="caseId" value={caseId} />
          <SubmitButton size="lg" pendingLabel="Opening…">
            Review the case
          </SubmitButton>
          <p className="text-xs text-slate-500">
            Opening the case tells the client it is under review. It does not commit you to taking it.
          </p>
        </form>
      ) : null}

      {canAccept ? (
        <form action={acceptAction} className="space-y-2">
          <input type="hidden" name="caseId" value={caseId} />
          <SubmitButton size="lg" pendingLabel={offered ? 'Taking…' : 'Accepting…'}>
            {offered ? 'Take this case' : 'Accept the case'}
          </SubmitButton>
          <p className="text-xs text-slate-500">
            {offered
              ? 'Taking it assigns the case to you and stands the other offers down.'
              : 'Accepting assigns the case to you and tells the client it has been assigned.'}
          </p>
        </form>
      ) : null}

      {offered && canAccept ? (
        <details className="rounded-lg border border-slate-200 p-4">
          <summary className="cursor-pointer text-sm font-medium text-slate-700">
            Pass — let a colleague take it
          </summary>
          <form action={passAction} className="mt-3 space-y-3">
            <input type="hidden" name="caseId" value={caseId} />
            <Field
              label="Note for the firm"
              htmlFor="pass-note"
              hint="Optional. The client is not told you passed."
            >
              <Input id="pass-note" name="note" maxLength={400} />
            </Field>
            <SubmitButton variant="secondary" pendingLabel="Passing…">
              Pass on this case
            </SubmitButton>
          </form>
        </details>
      ) : null}

      {canProgress && status === 'ASSIGNED' ? (
        <form action={advanceAction} className="space-y-2">
          <input type="hidden" name="caseId" value={caseId} />
          <input type="hidden" name="toStatus" value="IN_PROGRESS" />
          <SubmitButton variant="secondary" size="lg" pendingLabel="Updating…">
            Mark work as started
          </SubmitButton>
        </form>
      ) : null}

      {canProgress && (status === 'ASSIGNED' || status === 'IN_PROGRESS') ? (
        <form action={advanceAction} className="space-y-2">
          <input type="hidden" name="caseId" value={caseId} />
          <input type="hidden" name="toStatus" value="COMPLETED" />
          <SubmitButton
            variant="secondary"
            size="lg"
            confirm="Mark this case as completed?"
            pendingLabel="Updating…"
          >
            Mark case completed
          </SubmitButton>
        </form>
      ) : null}

      {canDecline ? (
        <details className="rounded-lg border border-slate-200 p-4">
          <summary className="cursor-pointer text-sm font-medium text-red-700">
            Decline this case
          </summary>
          <form action={declineAction} className="mt-3 space-y-3">
            <input type="hidden" name="caseId" value={caseId} />
            <Field
              label="Reason"
              htmlFor="decline-reason"
              required
              error={declineState?.fieldErrors?.reason}
              hint="The client sees this. Be specific so they know what to do next."
            >
              <Textarea
                id="decline-reason"
                name="reason"
                required
                minLength={10}
                maxLength={2000}
                rows={3}
                defaultValue={declineState?.values?.reason ?? ''}
                error={declineState?.fieldErrors?.reason}
              />
            </Field>
            <SubmitButton variant="danger" pendingLabel="Declining…">
              Decline and tell the client why
            </SubmitButton>
          </form>
        </details>
      ) : null}
    </div>
  );
}
