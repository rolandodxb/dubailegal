'use server';

import { revalidatePath } from 'next/cache';
import { isAdministrator, requestMeta, requireActiveUser, requireMember } from '@/lib/auth';
import type { FormState } from '@/lib/form-state';
import { claimEnquiry, closeEnquiry, createEnquiry } from '@/server/services/enquiry-service';
import { localiseFormState } from '@/lib/i18n/form-messages';

/**
 * Sends a general enquiry. No account is needed, and none is created — the whole
 * point of the pool is that somebody can ask without signing up.
 */
async function createEnquiryActionImpl(_prev: FormState, formData: FormData): Promise<FormState> {
  const meta = await requestMeta();

  const result = await createEnquiry(
    {
      name: formData.get('name'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      caseType: formData.get('caseType'),
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
        name: String(formData.get('name') ?? ''),
        email: String(formData.get('email') ?? ''),
        phone: String(formData.get('phone') ?? ''),
        caseType: String(formData.get('caseType') ?? ''),
        subject: String(formData.get('subject') ?? ''),
        message: String(formData.get('message') ?? ''),
      },
    };
  }

  revalidatePath('/enquiries');
  return {
    ok: true,
    message: `Your enquiry has been sent to ${result.data.notified} registered ${
      result.data.notified === 1 ? 'professional' : 'professionals'
    }. The first to pick it up will contact you directly.`,
  };
}

/** Claims an enquiry from the pool. The first professional to claim it takes it. */
async function claimEnquiryActionImpl(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireMember();
  const meta = await requestMeta();

  if (user.accountType === 'USER') {
    return { ok: false, message: 'Only lawyers and legal firms work the enquiry pool.' };
  }

  const result = await claimEnquiry(String(formData.get('enquiryId') ?? ''), user.id, meta);
  revalidatePath('/enquiries');
  if (!result.ok) return { ok: false, message: result.message };

  return {
    ok: true,
    message:
      'Enquiry claimed. Their contact details are below — get in touch, and suggest they create an account so the work can be tracked as a case.',
  };
}

async function closeEnquiryActionImpl(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireActiveUser();
  const result = await closeEnquiry(String(formData.get('enquiryId') ?? ''), user.id);
  revalidatePath('/enquiries');
  if (!result.ok) return { ok: false, message: result.message };
  return { ok: true, message: 'Enquiry closed.' };
}

/** Administrators are told rather than able to work the pool. */
async function enquiryPoolNoteImpl(): Promise<string | null> {
  const user = await requireActiveUser();
  return isAdministrator(user) ? 'Administrators monitor the pool but do not claim from it.' : null;
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
export async function createEnquiryAction(
  ...args: Parameters<typeof createEnquiryActionImpl>
): Promise<Awaited<ReturnType<typeof createEnquiryActionImpl>>> {
  return localiseFormState(await createEnquiryActionImpl(...args));
}

export async function claimEnquiryAction(
  ...args: Parameters<typeof claimEnquiryActionImpl>
): Promise<Awaited<ReturnType<typeof claimEnquiryActionImpl>>> {
  return localiseFormState(await claimEnquiryActionImpl(...args));
}

export async function closeEnquiryAction(
  ...args: Parameters<typeof closeEnquiryActionImpl>
): Promise<Awaited<ReturnType<typeof closeEnquiryActionImpl>>> {
  return localiseFormState(await closeEnquiryActionImpl(...args));
}

export async function enquiryPoolNote(
  ...args: Parameters<typeof enquiryPoolNoteImpl>
): Promise<Awaited<ReturnType<typeof enquiryPoolNoteImpl>>> {
  return localiseFormState(await enquiryPoolNoteImpl(...args));
}
