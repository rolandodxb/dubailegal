'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requestMeta, requireActiveUser, requireReviewer } from '@/lib/auth';
import type { FormState } from '@/lib/form-state';
import {
  createSupportTicket,
  replyToTicketAsAdmin,
  replyToTicketAsOwner,
  solveSupportTicket,
} from '@/server/services/support-service';
import { localiseFormState } from '@/lib/i18n/form-messages';

/**
 * Support is for members, not for administrators: an operator with a problem
 * reports it to the other operators, not to themselves through this form.
 */
function revalidateSupport(ticketId?: string): void {
  revalidatePath('/support');
  revalidatePath('/admin/support');
  if (ticketId) {
    revalidatePath(`/admin/support/${ticketId}`);
    revalidatePath(`/support?ticket=${ticketId}`);
  }
}

async function createSupportTicketActionImpl(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireActiveUser();
  const meta = await requestMeta();

  const result = await createSupportTicket(
    user.id,
    {
      subject: formData.get('subject'),
      category: formData.get('category'),
      body: formData.get('body'),
      contextPath: formData.get('contextPath') || null,
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
        category: String(formData.get('category') ?? ''),
        body: String(formData.get('body') ?? ''),
      },
    };
  }

  revalidateSupport(result.data.ticketId);
  redirect(`/support?ticket=${result.data.ticketId}`);
}

async function replySupportTicketActionImpl(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireActiveUser();
  const meta = await requestMeta();
  const ticketId = String(formData.get('ticketId') ?? '');

  const result = await replyToTicketAsOwner(
    user.id,
    { ticketId, body: formData.get('body') },
    meta,
  );

  if (!result.ok) return { ok: false, message: result.message, fieldErrors: result.fieldErrors };

  revalidateSupport(ticketId);
  return { ok: true, message: 'Message sent to support.' };
}

async function replySupportTicketAsAdminActionImpl(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const reviewer = await requireReviewer();
  const meta = await requestMeta();
  const ticketId = String(formData.get('ticketId') ?? '');

  const result = await replyToTicketAsAdmin(
    reviewer.id,
    { ticketId, body: formData.get('body') },
    meta,
  );

  if (!result.ok) return { ok: false, message: result.message, fieldErrors: result.fieldErrors };

  revalidateSupport(ticketId);
  return { ok: true, message: 'Reply sent. The reporter has been alerted.' };
}

/** Marks a ticket solved and closes it. Neither side can post to it afterwards. */
async function solveSupportTicketActionImpl(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const reviewer = await requireReviewer();
  const meta = await requestMeta();
  const ticketId = String(formData.get('ticketId') ?? '');

  const result = await solveSupportTicket(reviewer.id, ticketId, meta);
  if (!result.ok) return { ok: false, message: result.message };

  revalidateSupport(ticketId);
  return {
    ok: true,
    message: `Ticket ${result.data.reference} is solved and closed. The reporter has been told.`,
  };
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
export async function createSupportTicketAction(
  ...args: Parameters<typeof createSupportTicketActionImpl>
): Promise<Awaited<ReturnType<typeof createSupportTicketActionImpl>>> {
  return localiseFormState(await createSupportTicketActionImpl(...args));
}

export async function replySupportTicketAction(
  ...args: Parameters<typeof replySupportTicketActionImpl>
): Promise<Awaited<ReturnType<typeof replySupportTicketActionImpl>>> {
  return localiseFormState(await replySupportTicketActionImpl(...args));
}

export async function replySupportTicketAsAdminAction(
  ...args: Parameters<typeof replySupportTicketAsAdminActionImpl>
): Promise<Awaited<ReturnType<typeof replySupportTicketAsAdminActionImpl>>> {
  return localiseFormState(await replySupportTicketAsAdminActionImpl(...args));
}

export async function solveSupportTicketAction(
  ...args: Parameters<typeof solveSupportTicketActionImpl>
): Promise<Awaited<ReturnType<typeof solveSupportTicketActionImpl>>> {
  return localiseFormState(await solveSupportTicketActionImpl(...args));
}
