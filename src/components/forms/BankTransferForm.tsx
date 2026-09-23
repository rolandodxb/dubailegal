'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { recordBankTransferAction } from '@/app/actions/payment-actions';
import { initialFormState } from '@/lib/form-state';
import type { MemberCasesDict } from '@/lib/i18n/dict/memberCases';
import { formatAed } from '@/lib/payment-format';
import { Alert, buttonClasses, cx, Field, Input, Textarea } from '@/components/ui/primitives';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { Icon } from '@/components/icons';

/**
 * Paying a fee.
 *
 * One method works and one does not, and the page says which is which rather
 * than offering a card form that goes nowhere. A bank transfer is recorded here:
 * the client says they have sent it and quotes the reference their bank gave
 * them, which is the only thing the professional can match a transfer against.
 *
 * **No money moves through this application.** Nothing on this page contacts a
 * bank, and the receipt says so.
 */
export function BankTransferForm({
  paymentId,
  caseId,
  amountFils,
  purposeLabel,
  reference,
  lines,
  instructions,
  method,
  labels,
}: {
  paymentId: string;
  caseId: string;
  amountFils: number;
  purposeLabel: string;
  /** The case reference, offered as the transfer reference to quote. */
  reference: string;
  lines: { label: string; value: string }[];
  instructions: string | null;
  /** Chosen in the URL, so the page works without JavaScript. */
  method: 'TRANSFER' | 'CARD';
  labels: MemberCasesDict['bankTransfer'];
}) {
  const [state, formAction] = useActionState(recordBankTransferAction, initialFormState);
  const href = (next: 'TRANSFER' | 'CARD') => `/payments/${paymentId}/pay?method=${next.toLowerCase()}`;

  return (
    <div className="space-y-5">
      {/* What is being paid, kept at the top so the amount is never in doubt. */}
      <div className="rounded-xl border border-domain-payment/30 bg-domain-payment/5 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-domain-payment">
              {purposeLabel}
            </p>
            <p className="mt-1 text-sm text-slate-700">
              {labels.forCase.replace('{reference}', reference)}
            </p>
          </div>
          <p className="text-xl font-semibold tabular-nums text-slate-900">{formatAed(amountFils)}</p>
        </div>
      </div>

      {/* ── How to pay ───────────────────────────────────────────────────── */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-slate-800">{labels.howPay}</legend>

        <Link
          href={href('TRANSFER')}
          aria-current={method === 'TRANSFER' ? 'true' : undefined}
          className={cx(
            'flex items-start gap-3 rounded-lg border p-3 no-underline',
            method === 'TRANSFER'
              ? 'border-brand-500 bg-brand-50/50'
              : 'border-slate-200 hover:border-brand-400',
          )}
        >
          <span className="mt-1 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-slate-300">
            {method === 'TRANSFER' ? (
              <span className="h-2 w-2 rounded-full bg-brand-700" aria-hidden="true" />
            ) : null}
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-2 text-sm font-medium text-slate-900">
              <Icon name="building" size={16} />
              {labels.bankTransfer}
            </span>
            <span className="mt-0.5 block text-xs text-slate-600">
              {labels.bankTransferBody}
            </span>
          </span>
        </Link>

        <Link
          href={href('CARD')}
          aria-current={method === 'CARD' ? 'true' : undefined}
          className={cx(
            'flex items-start gap-3 rounded-lg border p-3 no-underline',
            method === 'CARD' ? 'border-amber-300 bg-amber-50/60' : 'border-slate-200 hover:border-amber-300',
          )}
        >
          <span className="mt-1 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-slate-300">
            {method === 'CARD' ? (
              <span className="h-2 w-2 rounded-full bg-amber-600" aria-hidden="true" />
            ) : null}
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-2 text-sm font-medium text-slate-900">
              <Icon name="creditCard" size={16} />
              {labels.card}
            </span>
            <span className="mt-0.5 block text-xs text-slate-600">{labels.cardBody}</span>
          </span>
        </Link>
      </fieldset>

      {method === 'CARD' ? (
        <Alert tone="warning" title={labels.cardTitle}>
          {labels.cardAlertBefore}
          <strong>{labels.cardAlertBold}</strong>
          {labels.cardAlertAfter}
        </Alert>
      ) : null}

      {/* ── The details, and recording the transfer ──────────────────────── */}
      {method === 'TRANSFER' ? (
        <>
          <div className="rounded-xl border border-slate-200 p-4">
            <h2 className="text-sm font-semibold text-slate-900">{labels.transferTo}</h2>
            <dl className="mt-3 space-y-2 text-sm">
              {lines.map((line) => (
                <div key={line.label} className="flex flex-wrap items-baseline justify-between gap-2">
                  <dt className="text-slate-500">{line.label}</dt>
                  <dd className="font-medium break-all text-slate-900">{line.value}</dd>
                </div>
              ))}
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-t border-slate-100 pt-2">
                <dt className="text-slate-500">{labels.referenceToQuote}</dt>
                <dd className="font-mono font-medium text-slate-900">{reference}</dd>
              </div>
            </dl>
            {instructions ? (
              <p className="mt-3 whitespace-pre-line rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                {instructions}
              </p>
            ) : null}
          </div>

          <form action={formAction} className="space-y-4">
            <input type="hidden" name="paymentId" value={paymentId} />
            <input type="hidden" name="caseId" value={caseId} />

            {state && !state.ok && state.message ? <Alert tone="error">{state.message}</Alert> : null}

            <Alert tone="info" title={labels.sendFirstTitle}>
              {labels.sendFirstBody}
            </Alert>

            <Field
              label={labels.transferReference}
              htmlFor="reference"
              required
              error={state?.fieldErrors?.reference}
              hint={labels.transferReferenceHint}
            >
              <Input
                id="reference"
                name="reference"
                required
                maxLength={120}
                defaultValue={state?.values?.reference ?? ''}
                error={state?.fieldErrors?.reference}
                placeholder="FT26265XK21"
              />
            </Field>

            <Field label={labels.note} htmlFor="note" error={state?.fieldErrors?.note}>
              <Textarea
                id="note"
                name="note"
                rows={2}
                maxLength={500}
                defaultValue={state?.values?.note ?? ''}
                error={state?.fieldErrors?.note}
                placeholder={labels.notePlaceholder}
              />
            </Field>

            <SubmitButton size="lg" className="w-full" pendingLabel={labels.recording}>
              {labels.sent}
            </SubmitButton>

            <p className="text-center text-xs text-slate-500">{labels.confirming}</p>
          </form>
        </>
      ) : (
        <p>
          <Link href={href('TRANSFER')} className={buttonClasses('secondary', 'md')}>
            {labels.payByTransferInstead}
          </Link>
        </p>
      )}
    </div>
  );
}
