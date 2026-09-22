'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requestMeta, requireActiveUser } from '@/lib/auth';
import type { FormState } from '@/lib/form-state';
import {
  cancelPayment,
  recordBankTransfer,
  requestPayment,
  submitPaymentProof,
} from '@/server/services/payment-service';

function revalidateCase(caseId: string): void {
  revalidatePath(`/cases/${caseId}`);
  revalidatePath('/payments');
}

/** A professional asks the client for a fee. */
export async function requestPaymentAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireActiveUser();
  const meta = await requestMeta();
  const caseId = String(formData.get('caseId') ?? '');

  const result = await requestPayment(
    user.id,
    {
      caseId,
      amountAed: formData.get('amountAed'),
      purpose: formData.get('purpose'),
      details: formData.get('details'),
    },
    meta,
  );

  if (!result.ok) {
    return {
      ok: false,
      message: result.message,
      fieldErrors: result.fieldErrors,
      values: {
        amountAed: String(formData.get('amountAed') ?? ''),
        purpose: String(formData.get('purpose') ?? ''),
        details: String(formData.get('details') ?? ''),
      },
    };
  }

  revalidateCase(caseId);
  return {
    ok: true,
    message:
      'Fee request sent. It now appears in the case conversation, with a pay button for the client. This is a simulated payment: no money moves.',
  };
}

/**
 * The client records that they have sent the bank transfer.
 *
 * On success the browser is sent to the receipt, which is the page that can be
 * printed or saved as a PDF. The chat card flips to completed as soon as this
 * returns, which is why the receipt is where the client lands.
 */
export async function recordBankTransferAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireActiveUser();
  const meta = await requestMeta();
  const paymentId = String(formData.get('paymentId') ?? '');

  const result = await recordBankTransfer(
    user.id,
    {
      paymentId,
      reference: formData.get('reference'),
      note: formData.get('note'),
    },
    meta,
  );

  if (!result.ok) {
    return {
      ok: false,
      message: result.message,
      fieldErrors: result.fieldErrors,
      values: {
        reference: String(formData.get('reference') ?? ''),
        note: String(formData.get('note') ?? ''),
      },
    };
  }

  revalidateCase(String(formData.get('caseId') ?? ''));
  redirect(`/payments/${result.data.paymentId}/receipt?paid=1`);
}

/** Sends proof of payment, which is asked for only after the payment is done. */
export async function submitPaymentProofAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireActiveUser();
  const meta = await requestMeta();
  const paymentId = String(formData.get('paymentId') ?? '');
  const caseId = String(formData.get('caseId') ?? '');

  const proof = formData.get('proof');
  const result = await submitPaymentProof(
    user.id,
    { paymentId, note: formData.get('note') },
    proof instanceof File && proof.size > 0 ? proof : null,
    meta,
  );

  if (!result.ok) {
    return { ok: false, message: result.message, fieldErrors: result.fieldErrors };
  }

  revalidateCase(caseId);
  return { ok: true, message: 'Proof of payment sent. The professional has been told.' };
}

export async function cancelPaymentAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireActiveUser();
  const paymentId = String(formData.get('paymentId') ?? '');
  const caseId = String(formData.get('caseId') ?? '');

  const result = await cancelPayment(user.id, paymentId);
  if (!result.ok) return { ok: false, message: result.message };

  revalidateCase(caseId);
  return { ok: true, message: 'Fee request withdrawn. The client has been told nothing is owed.' };
}
