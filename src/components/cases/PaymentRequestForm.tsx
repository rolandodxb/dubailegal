'use client';

import { useActionState } from 'react';
import { requestPaymentAction } from '@/app/actions/payment-actions';
import { initialFormState } from '@/lib/form-state';
import type { MemberCasesDict } from '@/lib/i18n/dict/memberCases';
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
  labels,
  purposeOptions,
  legalDetailsLabel,
}: {
  caseId: string;
  /** The account the money will go to, as it will appear on the request. */
  bankLines: { label: string; value: string }[];
  /** False when the professional has not filled their bank details in yet. */
  bankReady: boolean;
  labels: MemberCasesDict['feeRequest'];
  /** The fee reasons, already in the reader's language. */
  purposeOptions: { value: string; label: string }[];
  /** The link text to the page where bank details are filled in. */
  legalDetailsLabel: string;
}) {
  const [state, formAction] = useActionState(requestPaymentAction, initialFormState);

  return (
    <details className="rounded-lg border border-slate-200">
      <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-900">
        {labels.summary}
      </summary>

      <form action={formAction} className="space-y-4 border-t border-slate-100 p-4" noValidate>
        {state?.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
        {state && !state.ok && state.message ? (
          <Alert tone="error" title={labels.notSent}>
            {state.message}
          </Alert>
        ) : null}

        <input type="hidden" name="caseId" value={caseId} />

        {/* A fee is paid by bank transfer, so the client needs somewhere to send
            it. These are attached to the request when it is raised. */}
        {bankReady ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {labels.paidByBankTransferTo}
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
          <Alert tone="warning" title={labels.addBankFirst}>
            {labels.addBankBodyBefore}
            <a href="/credentials" className="font-medium underline">
              {legalDetailsLabel}
            </a>
            {labels.addBankBodyAfter}
          </Alert>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={labels.amountLabel}
            htmlFor="pay-amount"
            required
            error={state?.fieldErrors?.amountAed}
            hint={labels.amountHint}
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

          <Field
            label={labels.whatFor}
            htmlFor="pay-purpose"
            required
            error={state?.fieldErrors?.purpose}
          >
            <Select
              id="pay-purpose"
              name="purpose"
              required
              defaultValue={state?.values?.purpose ?? 'CONSULTATION'}
              error={state?.fieldErrors?.purpose}
            >
              {purposeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field
          label={labels.details}
          htmlFor="pay-details"
          error={state?.fieldErrors?.details}
          hint={labels.detailsHint}
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

        <Alert tone="neutral">{labels.simulated}</Alert>

        <SubmitButton pendingLabel={labels.sending} disabled={!bankReady}>
          {labels.sendRequest}
        </SubmitButton>
      </form>
    </details>
  );
}
