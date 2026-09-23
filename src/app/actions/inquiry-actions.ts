'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { isAdministrator, requestMeta, requireActiveUser } from '@/lib/auth';
import type { FormState } from '@/lib/form-state';
import { featureDisabledMessage, getAvailability, isEnabled } from '@/lib/availability';
import {
  closeInquiry,
  createInquiry,
  markInquiryRead,
  replyToInquiry,
} from '@/server/services/inquiry-service';
import { localiseFormState } from '@/lib/i18n/form-messages';

async function createInquiryActionImpl(_prev: FormState, formData: FormData): Promise<FormState> {
  const availability = await getAvailability();
  if (!isEnabled(availability.settings, 'feature.inquiries')) {
    return { ok: false, message: featureDisabledMessage('feature.inquiries') };
  }

  // Every account type may contact a listed professional, so the only
  // requirement is a confirmed email address.
  const user = await requireActiveUser();
  if (isAdministrator(user)) {
    return { ok: false, message: 'Administrator accounts cannot send inquiries.' };
  }
  const meta = await requestMeta();

  const result = await createInquiry(
    user.id,
    {
      listingId: formData.get('listingId'),
      subject: formData.get('subject'),
      message: formData.get('message'),
    },
    meta,
  );

  if (!result.ok) {
    return {
      ok: false,
      message: result.message,
      fieldErrors: result.fieldErrors,
      values: {
        subject: String(formData.get('subject') ?? ''),
        message: String(formData.get('message') ?? ''),
      },
    };
  }

  revalidatePath('/inquiries');
  redirect('/inquiries?tab=sent&notice=inquiry-sent');
}

async function replyToInquiryActionImpl(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireActiveUser();
  const meta = await requestMeta();

  const result = await replyToInquiry(
    user.id,
    { inquiryId: formData.get('inquiryId'), replyBody: formData.get('replyBody') },
    meta,
  );

  if (!result.ok) {
    return {
      ok: false,
      message: result.message,
      fieldErrors: result.fieldErrors,
      values: { replyBody: String(formData.get('replyBody') ?? '') },
    };
  }

  revalidatePath('/inquiries');
  return { ok: true, message: 'Your reply has been sent to the sender.' };
}

async function markInquiryReadActionImpl(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireActiveUser();
  const result = await markInquiryRead(String(formData.get('inquiryId') ?? ''), user.id);
  revalidatePath('/inquiries');
  if (!result.ok) return { ok: false, message: result.message };
  return { ok: true, message: 'Marked as read.' };
}

async function closeInquiryActionImpl(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireActiveUser();
  const result = await closeInquiry(String(formData.get('inquiryId') ?? ''), user.id);
  revalidatePath('/inquiries');
  if (!result.ok) return { ok: false, message: result.message };
  return { ok: true, message: 'Inquiry closed.' };
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
export async function createInquiryAction(
  ...args: Parameters<typeof createInquiryActionImpl>
): Promise<Awaited<ReturnType<typeof createInquiryActionImpl>>> {
  return localiseFormState(await createInquiryActionImpl(...args));
}

export async function replyToInquiryAction(
  ...args: Parameters<typeof replyToInquiryActionImpl>
): Promise<Awaited<ReturnType<typeof replyToInquiryActionImpl>>> {
  return localiseFormState(await replyToInquiryActionImpl(...args));
}

export async function markInquiryReadAction(
  ...args: Parameters<typeof markInquiryReadActionImpl>
): Promise<Awaited<ReturnType<typeof markInquiryReadActionImpl>>> {
  return localiseFormState(await markInquiryReadActionImpl(...args));
}

export async function closeInquiryAction(
  ...args: Parameters<typeof closeInquiryActionImpl>
): Promise<Awaited<ReturnType<typeof closeInquiryActionImpl>>> {
  return localiseFormState(await closeInquiryActionImpl(...args));
}
