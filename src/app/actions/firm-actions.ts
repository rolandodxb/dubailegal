'use server';

import { revalidatePath } from 'next/cache';
import { requestMeta, requireActiveUser } from '@/lib/auth';
import type { FormState } from '@/lib/form-state';
import {
  createLawyerForFirm,
  inviteLawyerToFirm,
  invitationLink,
  removeLawyerFromFirm,
  respondToInvitation,
  revokeInvitation,
} from '@/server/services/firm-service';
import { markAllNotificationsRead, markNotificationRead } from '@/server/services/notification-service';

// ── Firm roster ──────────────────────────────────────────────────────────────

export async function inviteLawyerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireActiveUser();
  const meta = await requestMeta();

  const result = await inviteLawyerToFirm(user.id, { email: formData.get('email') }, meta);
  if (!result.ok) {
    return {
      ok: false,
      message: result.message,
      fieldErrors: result.fieldErrors,
      values: { email: String(formData.get('email') ?? '') },
    };
  }

  revalidatePath('/firm/lawyers');

  const link = invitationLink(result.data.token);
  return {
    ok: true,
    message: result.data.existingAccount
      ? 'Invitation sent. That lawyer already has an account, so it now appears in their invitations to accept.'
      : `No account exists for that address yet, and this installation cannot send email. Share this registration link with them yourself: ${link}`,
  };
}

/**
 * Creates a working lawyer account on the firm's behalf, affiliated immediately.
 *
 * The generated credentials are returned once so the firm can pass them on —
 * there is no mail provider, so the firm is the delivery channel.
 */
export async function createLawyerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireActiveUser();
  const meta = await requestMeta();

  const result = await createLawyerForFirm(
    user.id,
    {
      fullName: formData.get('fullName'),
      email: formData.get('email'),
      password: formData.get('password'),
      phone: formData.get('phone'),
      licenseNumber: formData.get('licenseNumber'),
      licensingAuthority: formData.get('licensingAuthority'),
      licenseExpiresOn: formData.get('licenseExpiresOn'),
      yearsOfExperience: formData.get('yearsOfExperience'),
    },
    meta,
  );

  if (!result.ok) {
    const values: Record<string, string> = {};
    for (const key of [
      'fullName',
      'email',
      'phone',
      'licenseNumber',
      'licensingAuthority',
      'licenseExpiresOn',
      'yearsOfExperience',
    ]) {
      values[key] = String(formData.get(key) ?? '');
    }
    return { ok: false, message: result.message, fieldErrors: result.fieldErrors, values };
  }

  revalidatePath('/firm/lawyers');
  revalidatePath('/firm/oversight');
  revalidatePath('/directory');

  const { email, password } = result.data;
  return {
    ok: true,
    message: [
      `${email} can sign in now with this password: ${password}`,
      'Pass it on securely — it is shown once and cannot be retrieved again. The lawyer should change it from Account and security after signing in.',
      'They now appear under “Lawyers at this firm” on your public profile, which is where clients find them. Firm lawyers are not listed as separate entries in the directory.',
      'They still need to upload their own Emirates ID and licence before a reviewer can verify them.',
    ].join(' '),
  };
}

export async function revokeInvitationAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireActiveUser();
  const result = await revokeInvitation(user.id, String(formData.get('invitationId') ?? ''));
  revalidatePath('/firm/lawyers');
  if (!result.ok) return { ok: false, message: result.message };
  return { ok: true, message: 'Invitation withdrawn.' };
}

export async function removeLawyerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireActiveUser();
  const result = await removeLawyerFromFirm(user.id, String(formData.get('lawyerProfileId') ?? ''));
  revalidatePath('/firm/lawyers');
  if (!result.ok) return { ok: false, message: result.message };
  return {
    ok: true,
    message: 'Lawyer removed from the firm. Their account and any open cases assigned to them are untouched.',
  };
}

export async function respondToInvitationAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireActiveUser();
  const invitationId = String(formData.get('invitationId') ?? '');
  const accept = String(formData.get('accept') ?? '') === 'true';

  const result = await respondToInvitation(user.id, invitationId, accept);
  revalidatePath('/invitations');
  revalidatePath('/dashboard');
  if (!result.ok) return { ok: false, message: result.message };

  return { ok: true, message: accept ? 'You have joined the firm.' : 'Invitation declined.' };
}

// ── Alerts ───────────────────────────────────────────────────────────────────

export async function markNotificationReadAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireActiveUser();
  await markNotificationRead(user.id, String(formData.get('notificationId') ?? ''));
  revalidatePath('/notifications');
  return { ok: true, message: 'Alert marked as read.' };
}

export async function markAllNotificationsReadAction(_prev: FormState, _formData: FormData): Promise<FormState> {
  const user = await requireActiveUser();
  const count = await markAllNotificationsRead(user.id);
  revalidatePath('/notifications');
  return { ok: true, message: `${count} alert${count === 1 ? '' : 's'} marked as read.` };
}
