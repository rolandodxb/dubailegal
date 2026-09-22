'use client';

import { useActionState } from 'react';
import { requestPaymentAction } from '@/app/actions/payment-actions';
import { initialFormState } from '@/lib/form-state';
import { PAYMENT_PURPOSES } from '@/lib/payment-purposes';
import { Alert, Field, Input, Select, Textarea } from '@/components/ui/primitives';
import { SubmitButton } from '@/components/ui/SubmitButton';

/**
 * Raising a fee against a case.
 *
 * Only reachable once the case has been accepted, so a client is never asked for
 * money on a case nobody has taken. The request appears in the conversation
 * rather than in a separate place, because that is where both sides already are.
 */
export function PaymentRequestForm({
  caseId,
  bankLines,
  bankReady,
}: {
  caseId: string;
  /** The account the money will go to, as it will appear on the request. */
  bankLines: { label: string; value: string }[];
  /** False when the professional has not filled their bank details in yet. */
  bankReady: boolean;
}) {
  const [state, formAction] = useActionState(requestPaymentAction, initialFormState);

  return (
    <details className="rounded-lg border border-slate-200">
      <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-900">
        Request a fee
      </summary>

      <form action={formAction} className="space-y-4 border-t border-slate-100 p-4" noValidate>
        {state?.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
        {state && !state.ok && state.message ? (
          <Alert tone="error" title="The request was not sent">
            {state.message}
          </Alert>
        ) : null}

        <input type="hidden" name="caseId" value={caseId} />

        {/* A fee is paid by bank transfer, so the client needs somewhere to send
            it. These are attached to the request when it is raised. */}
        {bankReady ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Paid by bank transfer to
            </p>
            <dl className="mt-2 space-y-1 text-xs">
              {bankLines.map((line) => (
                <div key={line.label} className="flex flex-wrap items-baseline justify-between gap-2">
                  <dt className="text-slate-500">{line.label}</dt>
                  <dd className="font-medium break-all text-slate-800">{line.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : (
          <Alert tone="warning" title="Add your bank details first">
            A client cannot pay a fee with nowhere to send it. Add your account name, bank and IBAN on
            the{' '}
            <a href="/credentials" className="font-medium underline">
              Legal details
            </a>{' '}
            page, then raise the fee.
          </Alert>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Amount (AED)"
            htmlFor="pay-amount"
            required
            error={state?.fieldErrors?.amountAed}
            hint="Whole dirhams or fils, for example 750 or 750.50."
          >
            <Input
              id="pay-amount"
              name="amountAed"
              type="number"
              step="0.01"
              min="1"
              max="1000000"
              required
              defaultValue={state?.values?.amountAed ?? ''}
              error={state?.fieldErrors?.amountAed}
            />
          </Field>

          <Field label="What for" htmlFor="pay-purpose" required error={state?.fieldErrors?.purpose}>
            <Select
              id="pay-purpose"
              name="purpose"
              required
              defaultValue={state?.values?.purpose ?? 'CONSULTATION'}
              error={state?.fieldErrors?.purpose}
            >
              {PAYMENT_PURPOSES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field
          label="Details"
          htmlFor="pay-details"
          error={state?.fieldErrors?.details}
          hint="What the fee covers, so the client knows what they are paying for."
        >
          <Textarea
            id="pay-details"
            name="details"
            rows={3}
            maxLength={1000}
            defaultValue={state?.values?.details ?? ''}
            error={state?.fieldErrors?.details}
          />
        </Field>

        <Alert tone="neutral">
          This is a simulated payment. Dubai Legal has no payment provider connected, so no card is
          charged and no money moves — the request records what is owed and the client records that
          they paid.
        </Alert>

        <SubmitButton pendingLabel="Sending…" disabled={!bankReady}>Send fee request</SubmitButton>
      </form>
    </details>
  );
}
