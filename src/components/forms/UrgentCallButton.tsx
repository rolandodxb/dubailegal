'use client';

import { useActionState } from 'react';
import { requestUrgentCallAction } from '@/app/actions/appointment-actions';
import { initialFormState } from '@/lib/form-state';
import type { MemberCasesDict } from '@/lib/i18n/dict/memberCases';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { Icon } from '@/components/icons';

/**
 * Asks the professional on a case for an urgent call.
 *
 * The action sends the browser straight into the conference room, so the client
 * is in the call rather than reading a confirmation that somebody has been told.
 * The professional is alerted at the same moment.
 */
export function RequestUrgentCallButton({
  caseId,
  professionalName,
  className,
  labels,
}: {
  caseId: string;
  professionalName: string;
  className?: string;
  labels: MemberCasesDict['urgentCall'];
}) {
  const [state, formAction] = useActionState(requestUrgentCallAction, initialFormState);

  return (
    <form action={formAction} className={className}>
      <input type="hidden" name="caseId" value={caseId} />
      {state && !state.ok && state.message ? (
        <p className="mb-2 text-xs font-medium text-red-700">{state.message}</p>
      ) : null}
      <SubmitButton pendingLabel={labels.opening}>
        <Icon name="phoneCall" size={17} />
        {labels.ask.replace('{name}', professionalName)}
      </SubmitButton>
      <p className="mt-2 text-[11px] text-slate-500">{labels.body}</p>
    </form>
  );
}
