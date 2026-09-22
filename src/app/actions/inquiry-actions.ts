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

export async function createInquiryAction(_prev: FormState, formData: FormData): Promise<FormState> {
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

export async function replyToInquiryAction(_prev: FormState, formData: FormData): Promise<FormState> {
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

export async function markInquiryReadAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireActiveUser();
  const result = await markInquiryRead(String(formData.get('inquiryId') ?? ''), user.id);
  revalidatePath('/inquiries');
  if (!result.ok) return { ok: false, message: result.message };
  return { ok: true, message: 'Marked as read.' };
}

export async function closeInquiryAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireActiveUser();
  const result = await closeInquiry(String(formData.get('inquiryId') ?? ''), user.id);
  revalidatePath('/inquiries');
  if (!result.ok) return { ok: false, message: result.message };
  return { ok: true, message: 'Inquiry closed.' };
}
