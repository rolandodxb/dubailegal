'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { cancelPaymentAction, submitPaymentProofAction } from '@/app/actions/payment-actions';
import { initialFormState } from '@/lib/form-state';
import type { MemberCasesDict } from '@/lib/i18n/dict/memberCases';
import { formatMoney, maskCard } from '@/lib/payment-format';
import { formatUaeDateTime } from '@/lib/time';
import { Alert, buttonClasses, Field, Input, cx } from '@/components/ui/primitives';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { Icon } from '@/components/icons';
import { useLocale } from '@/components/layout/ClientLocale';

export type ChatPayment = {
  id: string;
  caseId: string;
  amountFils: number;
  /** The money the fee was quoted in, from the client's country. */
  currency: string;
  purpose: string;
  /** The reason, already in the reader's language. */
  purposeLabel: string;
  details: string | null;
  status: 'REQUESTED' | 'PAID' | 'CANCELLED';
  method: 'CARD' | 'BANK_TRANSFER' | null;
  reference: string | null;
  cardBrand: string | null;
  cardLast4: string | null;
  /** Where the client is told to send a transfer. */
  bankLines: { label: string; value: string }[];
  bankInstructions: string | null;
  receiptNumber: string | null;
  hasProof: boolean;
  proofNote: string | null;
  createdAt: string | Date;
  paidAt: string | Date | null;
  requestedByName: string;
};

const STATUS_STYLE: Record<string, string> = {
  REQUESTED: 'bg-amber-50 text-amber-900 ring-amber-200',
  PAID: 'bg-green-50 text-green-800 ring-green-200',
  CANCELLED: 'bg-slate-100 text-slate-600 ring-slate-200',
};

/**
 * A fee, shown in the conversation.
 *
 * The card itself is identical for the client and for the professional — same
 * amount, same reason, same status, same receipt — because they are looking at
 * one fact, not two. Only the row of actions at the foot differs: the client can
 * pay it, the professional can withdraw it.
 *
 * The order is deliberate. Paying opens a page of its own, a receipt is issued,
 * and only once the payment is complete is proof of payment asked for. Asking for
 * evidence first, as this used to, put the proof before the thing it proved.
 */
export function PaymentBubble({
  payment,
  isClient,
  labels,
}: {
  payment: ChatPayment;
  isClient: boolean;
  labels: MemberCasesDict['feeBubble'];
}) {
  const locale = useLocale();
  const [proofState, proofAction] = useActionState(submitPaymentProofAction, initialFormState);
  const [cancelState, cancelAction] = useActionState(cancelPaymentAction, initialFormState);

  const settled = payment.status !== 'REQUESTED';
  const proofDone = payment.hasProof;
  // Only asked for once the money step is done, and only of the client.
  const needsProof = isClient && payment.status === 'PAID' && !proofDone;

  const statusLabel =
    payment.status === 'PAID'
      ? labels.paymentCompleted
      : payment.status === 'CANCELLED'
        ? labels.withdrawn
        : labels.paymentPending;

  return (
    <li className="flex justify-center py-2">
      <div
        className={cx(
          'w-full max-w-lg overflow-hidden rounded-xl border bg-white shadow-sm',
          payment.status === 'PAID'
            ? 'border-green-200'
            : payment.status === 'CANCELLED'
              ? 'border-slate-200'
              : 'border-amber-200',
        )}
      >
        {/* ── The card. The same for both sides. ─────────────────────────── */}
        <div className="flex items-start gap-3 p-4">
          <span
            className={cx(
              'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
              payment.status === 'PAID'
                ? 'bg-green-100 text-green-800'
                : payment.status === 'CANCELLED'
                  ? 'bg-slate-100 text-slate-500'
                  : 'bg-domain-payment/10 text-domain-payment',
            )}
          >
            <Icon name="creditCard" size={19} />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {payment.purposeLabel}
              </p>
              <span
                className={cx(
                  'inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
                  STATUS_STYLE[payment.status],
                )}
              >
                {statusLabel}
              </span>
            </div>

            <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
              {formatMoney(payment.amountFils, payment.currency)}
            </p>

            {payment.details ? (
              <p className="mt-1.5 whitespace-pre-line text-sm text-slate-700">{payment.details}</p>
            ) : null}

            <p className="mt-1.5 text-xs text-slate-500">
              {labels.requestedBy
                .replace('{name}', payment.requestedByName)
                .replace('{date}', formatUaeDateTime(new Date(payment.createdAt), locale))}
            </p>

            {payment.status === 'PAID' ? (
              <dl className="mt-3 space-y-1 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                <div className="flex justify-between gap-3">
                  <dt>{labels.paidBy}</dt>
                  <dd className="font-medium text-slate-800">
                    {payment.method === 'CARD'
                      ? maskCard(payment.cardBrand, payment.cardLast4)
                      : payment.method === 'BANK_TRANSFER'
                        ? labels.bankTransfer
                        : labels.card}
                  </dd>
                </div>
                {payment.paidAt ? (
                  <div className="flex justify-between gap-3">
                    <dt>{labels.paidOn}</dt>
                    <dd className="font-medium text-slate-800">
                      {formatUaeDateTime(new Date(payment.paidAt), locale)}
                    </dd>
                  </div>
                ) : null}
                {payment.receiptNumber ? (
                  <div className="flex justify-between gap-3">
                    <dt>{labels.receipt}</dt>
                    <dd className="font-mono font-medium text-slate-800">{payment.receiptNumber}</dd>
                  </div>
                ) : null}
                <div className="flex justify-between gap-3 pt-1">
                  <dt />
                  <dd>
                    <Link
                      href={`/payments/${payment.id}/receipt`}
                      className="font-medium text-brand-700 hover:underline"
                    >
                      {labels.viewReceipt}
                    </Link>
                  </dd>
                </div>
              </dl>
            ) : null}

            <p className="mt-2 rounded-md bg-slate-50 px-2 py-1 text-[11px] text-slate-500">
              {labels.simulated}
            </p>
          </div>
        </div>

        {/* ── Actions ─────────────────────────────────────────────────────── */}

        {/* The client pays, by transfer, and can see where to send it without
            leaving the conversation. */}
        {!settled && payment.bankLines.length > 0 ? (
          <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {labels.payByTransferTo}
            </p>
            <dl className="mt-2 space-y-1 text-xs">
              {payment.bankLines.map((line) => (
                <div key={line.label} className="flex flex-wrap items-baseline justify-between gap-2">
                  <dt className="text-slate-500">{line.label}</dt>
                  <dd className="font-medium break-all text-slate-800">{line.value}</dd>
                </div>
              ))}
            </dl>
            {payment.bankInstructions ? (
              <p className="mt-2 whitespace-pre-line text-[11px] text-slate-500">
                {payment.bankInstructions}
              </p>
            ) : null}
          </div>
        ) : null}

        {isClient && !settled ? (
          <div className="border-t border-slate-100 p-4">
            <Link
              href={`/payments/${payment.id}/pay`}
              className={buttonClasses('primary', 'lg', 'w-full')}
            >
              <Icon name="building" size={18} />
              {labels.payByTransfer.replace(
                '{amount}',
                formatMoney(payment.amountFils, payment.currency),
              )}
            </Link>
            <p className="mt-2 text-center text-[11px] text-slate-500">{labels.recordTransferNote}</p>
          </div>
        ) : null}

        {/* Proof of payment: asked for after the payment, not before it. */}
        {needsProof ? (
          <div className="border-t border-slate-100 bg-domain-payment/5 p-4">
            {proofState?.ok && proofState.message ? (
              <Alert tone="success">{proofState.message}</Alert>
            ) : null}
            {proofState && !proofState.ok && proofState.message ? (
              <Alert tone="error">{proofState.message}</Alert>
            ) : null}

            {proofState?.ok ? null : (
              <>
                <h3 className="text-sm font-semibold text-slate-900">{labels.sendProof}</h3>
                <p className="mt-1 text-xs text-slate-600">{labels.proofBody}</p>

                <form action={proofAction} className="mt-3 space-y-3">
                  <input type="hidden" name="paymentId" value={payment.id} />
                  <input type="hidden" name="caseId" value={payment.caseId} />

                  <Field
                    label={labels.proofLabel}
                    htmlFor={`proof-${payment.id}`}
                    required
                    error={proofState?.fieldErrors?.proof}
                    hint={labels.proofHint}
                  >
                    <input
                      id={`proof-${payment.id}`}
                      name="proof"
                      type="file"
                      required
                      accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                      className="block w-full cursor-pointer rounded-lg border border-slate-300 bg-white text-sm text-slate-700 file:mr-3 file:cursor-pointer file:rounded-l-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-800 hover:file:bg-brand-100"
                    />
                  </Field>

                  <Field
                    label={labels.noteLabel}
                    htmlFor={`note-${payment.id}`}
                    error={proofState?.fieldErrors?.note}
                  >
                    <Input
                      id={`note-${payment.id}`}
                      name="note"
                      maxLength={500}
                      placeholder={labels.notePlaceholder}
                    />
                  </Field>

                  <SubmitButton size="sm" pendingLabel={labels.sending}>
                    {labels.sendProofButton}
                  </SubmitButton>
                </form>
              </>
            )}
          </div>
        ) : null}

        {/* Both sides see that the proof arrived. */}
        {payment.status === 'PAID' ? (
          <div className="border-t border-slate-100 px-4 py-3">
            {proofDone ? (
              <p className="flex items-center gap-2 text-xs font-medium text-green-800">
                <Icon name="checkCircle" size={15} />
                {labels.proofAttached}
                {payment.proofNote ? (
                  <span className="font-normal text-slate-600">· {payment.proofNote}</span>
                ) : null}
              </p>
            ) : (
              <p className="text-xs text-slate-500">
                {isClient ? labels.waitingForProofClient : labels.waitingForProofProfessional}
              </p>
            )}
          </div>
        ) : null}

        {/* The professional withdraws an unpaid request. */}
        {!isClient && !settled ? (
          <form action={cancelAction} className="border-t border-slate-100 px-4 py-3">
            {cancelState?.ok && cancelState.message ? (
              <p className="mb-2 text-xs font-medium text-green-700">{cancelState.message}</p>
            ) : null}
            {cancelState && !cancelState.ok && cancelState.message ? (
              <p className="mb-2 text-xs font-medium text-red-700">{cancelState.message}</p>
            ) : null}
            <input type="hidden" name="paymentId" value={payment.id} />
            <input type="hidden" name="caseId" value={payment.caseId} />
            <SubmitButton
              variant="ghost"
              size="sm"
              confirm={labels.withdrawConfirm}
              pendingLabel="…"
            >
              {labels.withdrawRequest}
            </SubmitButton>
          </form>
        ) : null}
      </div>
    </li>
  );
}
