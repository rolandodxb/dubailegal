'use client';

import { useActionState } from 'react';
import { claimEnquiryAction, closeEnquiryAction } from '@/app/actions/enquiry-actions';
import { initialFormState } from '@/lib/form-state';
import { Alert, buttonClasses } from '@/components/ui/primitives';
import { SubmitButton } from '@/components/ui/SubmitButton';

/** Claims an enquiry from the shared pool. */
export function ClaimEnquiryForm({ enquiryId }: { enquiryId: string }) {
  const [state, formAction] = useActionState(claimEnquiryAction, initialFormState);

  return (
    <form action={formAction} className="space-y-2">
      {state?.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      {state && !state.ok && state.message ? <Alert tone="error">{state.message}</Alert> : null}

      <input type="hidden" name="enquiryId" value={enquiryId} />
      <SubmitButton
        pendingLabel="Claiming…"
        confirm="Claim this enquiry? It leaves the pool and becomes yours to answer."
      >
        Claim this enquiry
      </SubmitButton>
    </form>
  );
}

export function CloseEnquiryForm({ enquiryId }: { enquiryId: string }) {
  const [state, formAction] = useActionState(closeEnquiryAction, initialFormState);

  return (
    <form action={formAction} className="inline">
      {state?.ok && state.message ? (
        <span className="mr-2 text-xs font-medium text-green-700">{state.message}</span>
      ) : null}
      {state && !state.ok && state.message ? (
        <span className="mr-2 text-xs font-medium text-red-700">{state.message}</span>
      ) : null}
      <input type="hidden" name="enquiryId" value={enquiryId} />
      <SubmitButton variant="ghost" size="sm" confirm="Close this enquiry?" pendingLabel="…">
        Mark as done
      </SubmitButton>
    </form>
  );
}

/** A convenience link so a claimer can call or write straight away. */
export function ContactLinks({
  email,
  phone,
}: {
  email: string;
  phone: string;
}) {
  return (
    <span className="inline-flex flex-wrap gap-3">
      <a href={`mailto:${email}`} className={buttonClasses('secondary', 'sm')}>
        Email them
      </a>
      <a href={`tel:${phone}`} className={buttonClasses('secondary', 'sm')}>
        Call {phone}
      </a>
    </span>
  );
}
