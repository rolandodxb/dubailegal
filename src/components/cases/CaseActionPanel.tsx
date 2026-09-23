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
import type { MemberCasesDict } from '@/lib/i18n/dict/memberCases';
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
  labels,
}: {
  caseId: string;
  status: string;
  canReview: boolean;
  canAccept: boolean;
  canProgress: boolean;
  canDecline: boolean;
  /** A firm holding the case may release it to its registered lawyers. */
  canDistribute?: boolean;
  labels: MemberCasesDict['caseActions'];
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
            pendingLabel={labels.releasing}
            confirm={labels.releaseConfirm}
          >
            {labels.acceptAndSend}
          </SubmitButton>
          <p className="text-xs text-slate-500">{labels.releaseBody}</p>
        </form>
      ) : null}

      {canReview ? (
        <form action={reviewAction} className="space-y-2">
          <input type="hidden" name="caseId" value={caseId} />
          <SubmitButton size="lg" pendingLabel={labels.opening}>
            {labels.reviewCase}
          </SubmitButton>
          <p className="text-xs text-slate-500">{labels.reviewBody}</p>
        </form>
      ) : null}

      {canAccept ? (
        <form action={acceptAction} className="space-y-2">
          <input type="hidden" name="caseId" value={caseId} />
          <SubmitButton size="lg" pendingLabel={offered ? labels.taking : labels.accepting}>
            {offered ? labels.takeCase : labels.acceptCase}
          </SubmitButton>
          <p className="text-xs text-slate-500">
            {offered ? labels.takeBody : labels.acceptBody}
          </p>
        </form>
      ) : null}

      {offered && canAccept ? (
        <details className="rounded-lg border border-slate-200 p-4">
          <summary className="cursor-pointer text-sm font-medium text-slate-700">
            {labels.passSummary}
          </summary>
          <form action={passAction} className="mt-3 space-y-3">
            <input type="hidden" name="caseId" value={caseId} />
            <Field label={labels.noteForFirm} htmlFor="pass-note" hint={labels.passHint}>
              <Input id="pass-note" name="note" maxLength={400} />
            </Field>
            <SubmitButton variant="secondary" pendingLabel={labels.passing}>
              {labels.passOnCase}
            </SubmitButton>
          </form>
        </details>
      ) : null}

      {canProgress && status === 'ASSIGNED' ? (
        <form action={advanceAction} className="space-y-2">
          <input type="hidden" name="caseId" value={caseId} />
          <input type="hidden" name="toStatus" value="IN_PROGRESS" />
          <SubmitButton variant="secondary" size="lg" pendingLabel={labels.updating}>
            {labels.markStarted}
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
            confirm={labels.markCompletedConfirm}
            pendingLabel={labels.updating}
          >
            {labels.markCompleted}
          </SubmitButton>
        </form>
      ) : null}

      {canDecline ? (
        <details className="rounded-lg border border-slate-200 p-4">
          <summary className="cursor-pointer text-sm font-medium text-red-700">
            {labels.declineSummary}
          </summary>
          <form action={declineAction} className="mt-3 space-y-3">
            <input type="hidden" name="caseId" value={caseId} />
            <Field
              label={labels.reason}
              htmlFor="decline-reason"
              required
              error={declineState?.fieldErrors?.reason}
              hint={labels.declineHint}
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
            <SubmitButton variant="danger" pendingLabel={labels.declining}>
              {labels.declineAndTell}
            </SubmitButton>
          </form>
        </details>
      ) : null}
    </div>
  );
}
