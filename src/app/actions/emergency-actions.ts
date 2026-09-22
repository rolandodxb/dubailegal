'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { isAdministrator, requestMeta, requireActiveUser } from '@/lib/auth';
import type { FormState } from '@/lib/form-state';
import {
  acceptEmergency,
  raiseGuestEmergency,
  cancelEmergency,
  cancelGuestEmergency,
  closeEmergencyAsProfessional,
  raiseEmergency,
  setEmergencyAvailability,
  setFirmEmergencyLawyer,
} from '@/server/services/emergency-service';

/**
 * Raises an urgent request and pushes it to every professional who takes
 * emergencies.
 */
export async function raiseEmergencyAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireActiveUser();

  if (isAdministrator(user)) {
    return { ok: false, message: 'Administrator accounts cannot raise emergency requests.' };
  }

  const meta = await requestMeta();
  const result = await raiseEmergency(
    user.id,
    {
      title: formData.get('title'),
      caseType: formData.get('caseType'),
      description: formData.get('description'),
      contactPhone: formData.get('contactPhone'),
    },
    meta,
  );

  if (!result.ok) {
    return {
      ok: false,
      message: result.message,
      fieldErrors: result.fieldErrors,
      values: {
        title: String(formData.get('title') ?? ''),
        caseType: String(formData.get('caseType') ?? ''),
        description: String(formData.get('description') ?? ''),
        contactPhone: String(formData.get('contactPhone') ?? ''),
      },
    };
  }

  revalidatePath('/emergency');
  return {
    ok: true,
    message: `Your urgent request has been sent to ${result.data.notified} ${
      result.data.notified === 1 ? 'professional' : 'professionals'
    }. Keep your phone to hand.`,
  };
}

export async function acceptEmergencyAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireActiveUser();
  const meta = await requestMeta();
  const requestId = String(formData.get('requestId') ?? '');

  const result = await acceptEmergency(requestId, user.id, meta);
  if (!result.ok) return { ok: false, message: result.message };

  revalidatePath('/emergency');
  revalidatePath('/pending');
  redirect(`/cases/${result.data.caseId}?notice=case-assigned`);
}

export async function cancelEmergencyAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireActiveUser();
  const result = await cancelEmergency(String(formData.get('requestId') ?? ''), user.id);
  revalidatePath('/emergency');
  if (!result.ok) return { ok: false, message: result.message };
  return { ok: true, message: 'Your urgent request has been withdrawn.' };
}

export async function setEmergencyAvailabilityAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireActiveUser();
  const accepts = String(formData.get('accepts') ?? '') === 'true';

  const result = await setEmergencyAvailability(
    user.id,
    accepts,
    String(formData.get('note') ?? ''),
  );
  revalidatePath('/emergency');
  revalidatePath('/profile');
  if (!result.ok) return { ok: false, message: result.message };

  return {
    ok: true,
    message: accepts
      ? 'You are now available for emergency requests. Urgent cases will be pushed to you.'
      : 'You are no longer listed as available for emergency requests.',
  };
}

export async function setFirmEmergencyLawyerAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireActiveUser();
  const lawyerProfileId = String(formData.get('lawyerProfileId') ?? '');
  const active = String(formData.get('active') ?? '') === 'true';

  const result = await setFirmEmergencyLawyer(user.id, lawyerProfileId, active);
  revalidatePath('/emergency');
  revalidatePath('/firm/lawyers');
  if (!result.ok) return { ok: false, message: result.message };

  return {
    ok: true,
    message: active
      ? 'That lawyer is now your firm’s emergency contact. Urgent requests are assigned to them directly.'
      : 'Your firm no longer has a designated emergency contact.',
  };
}

/**
 * Raises an emergency without any account and sends the person straight to a
 * video room.
 *
 * No session is required, and none is created: the point is that somebody being
 * detained should not have to remember an email and a password. The only
 * credential is the token in the link they are redirected to.
 */
export async function raisePublicEmergencyAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const meta = await requestMeta();

  const result = await raiseGuestEmergency(
    {
      guestName: formData.get('guestName'),
      guestPhone: formData.get('guestPhone'),
      guestEmail: formData.get('guestEmail'),
      caseType: formData.get('caseType'),
      description: formData.get('description'),
    },
    meta,
  );

  if (!result.ok) {
    return {
      ok: false,
      message: result.message,
      fieldErrors: result.fieldErrors,
      values: {
        guestName: String(formData.get('guestName') ?? ''),
        guestPhone: String(formData.get('guestPhone') ?? ''),
        guestEmail: String(formData.get('guestEmail') ?? ''),
        caseType: String(formData.get('caseType') ?? ''),
        description: String(formData.get('description') ?? ''),
      },
    };
  }

  revalidatePath('/emergency');
  revalidatePath('/emergency/desk');

  // Straight into the room. No waiting screen, no request to be reviewed.
  redirect(
    `/emergency/room/${result.data.roomCode}?t=${encodeURIComponent(result.data.guestToken)}`,
  );
}

/**
 * Cancels an urgent request from inside the room, with the token in the link.
 *
 * No account, no password: the same credential that let the caller into the room
 * is what lets them call the whole thing off.
 */
export async function cancelGuestEmergencyAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const roomCode = String(formData.get('roomCode') ?? '');
  const token = String(formData.get('token') ?? '');

  const result = await cancelGuestEmergency(roomCode, token);
  if (!result.ok) return { ok: false, message: result.message };

  revalidatePath(`/emergency/room/${roomCode}`);
  return {
    ok: true,
    message: result.data.alreadyClosed
      ? 'This request was already closed.'
      : 'Your urgent request has been withdrawn and the room is closed. Every lawyer who saw it has been told.',
  };
}

/** The professional who answered ends the call. The caller is told. */
export async function closeEmergencyAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireActiveUser();
  const requestId = String(formData.get('requestId') ?? '');

  const result = await closeEmergencyAsProfessional(requestId, user.id);
  if (!result.ok) return { ok: false, message: result.message };

  revalidatePath('/emergency/desk');
  revalidatePath('/emergency');
  return { ok: true, message: 'Closed. The caller has been told the call is over.' };
}
