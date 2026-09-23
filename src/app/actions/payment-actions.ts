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
import { localiseFormState } from '@/lib/i18n/form-messages';

function revalidateCase(caseId: string): void {
  revalidatePath(`/cases/${caseId}`);
  revalidatePath('/payments');
}

/** A professional asks the client for a fee. */
async function requestPaymentActionImpl(_prev: FormState, formData: FormData): Promise<FormState> {
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
async function recordBankTransferActionImpl(
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
async function submitPaymentProofActionImpl(
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

async function cancelPaymentActionImpl(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireActiveUser();
  const paymentId = String(formData.get('paymentId') ?? '');
  const caseId = String(formData.get('caseId') ?? '');

  const result = await cancelPayment(user.id, paymentId);
  if (!result.ok) return { ok: false, message: result.message };

  revalidateCase(caseId);
  return { ok: true, message: 'Fee request withdrawn. The client has been told nothing is owed.' };
}

/**
 * The actions, localised.
 *
 * Each one is the same function with its result passed through the message
 * catalogue, so a failed form reads in the language the member is using. The
 * implementation keeps its own name with an `Impl` suffix because a `'use
 * server'` module may only export async function declarations — a wrapped
 * constant would be rejected at build time.
 */
export async function requestPaymentAction(
  ...args: Parameters<typeof requestPaymentActionImpl>
): Promise<Awaited<ReturnType<typeof requestPaymentActionImpl>>> {
  return localiseFormState(await requestPaymentActionImpl(...args));
}

export async function recordBankTransferAction(
  ...args: Parameters<typeof recordBankTransferActionImpl>
): Promise<Awaited<ReturnType<typeof recordBankTransferActionImpl>>> {
  return localiseFormState(await recordBankTransferActionImpl(...args));
}

export async function submitPaymentProofAction(
  ...args: Parameters<typeof submitPaymentProofActionImpl>
): Promise<Awaited<ReturnType<typeof submitPaymentProofActionImpl>>> {
  return localiseFormState(await submitPaymentProofActionImpl(...args));
}

export async function cancelPaymentAction(
  ...args: Parameters<typeof cancelPaymentActionImpl>
): Promise<Awaited<ReturnType<typeof cancelPaymentActionImpl>>> {
  return localiseFormState(await cancelPaymentActionImpl(...args));
}
