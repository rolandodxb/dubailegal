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

export async function createSupportTicketAction(
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

export async function replySupportTicketAction(
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

export async function replySupportTicketAsAdminAction(
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
export async function solveSupportTicketAction(
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
