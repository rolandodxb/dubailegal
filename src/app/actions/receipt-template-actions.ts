'use server';

import { revalidatePath } from 'next/cache';
import { requestMeta, requireActiveUser } from '@/lib/auth';
import type { FormState } from '@/lib/form-state';
import {
  announceReceiptTemplate,
  resetReceiptTemplate,
  saveReceiptTemplate,
} from '@/server/services/receipt-template-service';
import { localiseFormState } from '@/lib/i18n/form-messages';

/**
 * Saves a lawyer's or firm's billing letterhead.
 *
 * Administrators are refused by the service: the Legal Dash mark is fixed for
 * them. Everybody else either uses the standard layout or uploads their own.
 */
async function saveReceiptTemplateActionImpl(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireActiveUser();
  const meta = await requestMeta();

  const logo = formData.get('logo');
  const result = await saveReceiptTemplate(
    user.id,
    {
      layout: formData.get('layout'),
      brandName: formData.get('brandName'),
      headerLine: formData.get('headerLine'),
      footerNote: formData.get('footerNote'),
      accentColor: formData.get('accentColor'),
      showLicence: formData.get('showLicence') === 'on',
      showFirm: formData.get('showFirm') === 'on',
      showContact: formData.get('showContact') === 'on',
      removeLogo: formData.get('removeLogo') === 'on',
    },
    logo instanceof File && logo.size > 0 ? logo : null,
    meta,
  );

  if (!result.ok) {
    return {
      ok: false,
      message: result.message,
      fieldErrors: result.fieldErrors,
      values: {
        layout: String(formData.get('layout') ?? ''),
        brandName: String(formData.get('brandName') ?? ''),
        headerLine: String(formData.get('headerLine') ?? ''),
        footerNote: String(formData.get('footerNote') ?? ''),
        accentColor: String(formData.get('accentColor') ?? ''),
      },
    };
  }

  await announceReceiptTemplate(user.id, result.data.layout);
  revalidatePath('/receipt-template');
  revalidatePath('/account');
  revalidatePath('/payments');

  return {
    ok: true,
    message:
      result.data.layout === 'CUSTOM'
        ? 'Saved. New receipts you raise carry your own letterhead.'
        : 'Saved. New receipts you raise use the standard Legal Dash layout.',
  };
}

/** Returns the account to the standard layout and removes any uploaded mark. */
async function resetReceiptTemplateActionImpl(
  _prev: FormState,
  _formData: FormData,
): Promise<FormState> {
  const user = await requireActiveUser();
  const meta = await requestMeta();

  const result = await resetReceiptTemplate(user.id, meta);
  if (!result.ok) return { ok: false, message: result.message };

  revalidatePath('/receipt-template');
  revalidatePath('/account');
  return { ok: true, message: 'Back to the standard layout. Your uploaded mark was removed.' };
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
export async function saveReceiptTemplateAction(
  ...args: Parameters<typeof saveReceiptTemplateActionImpl>
): Promise<Awaited<ReturnType<typeof saveReceiptTemplateActionImpl>>> {
  return localiseFormState(await saveReceiptTemplateActionImpl(...args));
}

export async function resetReceiptTemplateAction(
  ...args: Parameters<typeof resetReceiptTemplateActionImpl>
): Promise<Awaited<ReturnType<typeof resetReceiptTemplateActionImpl>>> {
  return localiseFormState(await resetReceiptTemplateActionImpl(...args));
}
