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
import { localiseFormState } from '@/lib/i18n/form-messages';

/**
 * Raises an urgent request and pushes it to every professional who takes
 * emergencies.
 */
async function raiseEmergencyActionImpl(_prev: FormState, formData: FormData): Promise<FormState> {
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

async function acceptEmergencyActionImpl(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireActiveUser();
  const meta = await requestMeta();
  const requestId = String(formData.get('requestId') ?? '');

  const result = await acceptEmergency(requestId, user.id, meta);
  if (!result.ok) return { ok: false, message: result.message };

  revalidatePath('/emergency');
  revalidatePath('/pending');
  // Into the room, not into the case. The person who raised it is waiting there
  // and the call cannot start until both are present; sending the professional to
  // the case left each half of the call in a different place, which is exactly
  // why it sat holding for a party that had already arrived.
  if (result.data.roomCode) {
    redirect(`/emergency/room/${result.data.roomCode}`);
  }
  redirect(`/cases/${result.data.caseId}?notice=case-assigned`);
}

async function cancelEmergencyActionImpl(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireActiveUser();
  const result = await cancelEmergency(String(formData.get('requestId') ?? ''), user.id);
  revalidatePath('/emergency');
  if (!result.ok) return { ok: false, message: result.message };
  return { ok: true, message: 'Your urgent request has been withdrawn.' };
}

async function setEmergencyAvailabilityActionImpl(
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

async function setFirmEmergencyLawyerActionImpl(
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
async function raisePublicEmergencyActionImpl(
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
async function cancelGuestEmergencyActionImpl(
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
async function closeEmergencyActionImpl(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireActiveUser();
  const requestId = String(formData.get('requestId') ?? '');

  const result = await closeEmergencyAsProfessional(requestId, user.id);
  if (!result.ok) return { ok: false, message: result.message };

  revalidatePath('/emergency/desk');
  revalidatePath('/emergency');
  return { ok: true, message: 'Closed. The caller has been told the call is over.' };
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
export async function raiseEmergencyAction(
  ...args: Parameters<typeof raiseEmergencyActionImpl>
): Promise<Awaited<ReturnType<typeof raiseEmergencyActionImpl>>> {
  return localiseFormState(await raiseEmergencyActionImpl(...args));
}

export async function acceptEmergencyAction(
  ...args: Parameters<typeof acceptEmergencyActionImpl>
): Promise<Awaited<ReturnType<typeof acceptEmergencyActionImpl>>> {
  return localiseFormState(await acceptEmergencyActionImpl(...args));
}

export async function cancelEmergencyAction(
  ...args: Parameters<typeof cancelEmergencyActionImpl>
): Promise<Awaited<ReturnType<typeof cancelEmergencyActionImpl>>> {
  return localiseFormState(await cancelEmergencyActionImpl(...args));
}

export async function setEmergencyAvailabilityAction(
  ...args: Parameters<typeof setEmergencyAvailabilityActionImpl>
): Promise<Awaited<ReturnType<typeof setEmergencyAvailabilityActionImpl>>> {
  return localiseFormState(await setEmergencyAvailabilityActionImpl(...args));
}

export async function setFirmEmergencyLawyerAction(
  ...args: Parameters<typeof setFirmEmergencyLawyerActionImpl>
): Promise<Awaited<ReturnType<typeof setFirmEmergencyLawyerActionImpl>>> {
  return localiseFormState(await setFirmEmergencyLawyerActionImpl(...args));
}

export async function raisePublicEmergencyAction(
  ...args: Parameters<typeof raisePublicEmergencyActionImpl>
): Promise<Awaited<ReturnType<typeof raisePublicEmergencyActionImpl>>> {
  return localiseFormState(await raisePublicEmergencyActionImpl(...args));
}

export async function cancelGuestEmergencyAction(
  ...args: Parameters<typeof cancelGuestEmergencyActionImpl>
): Promise<Awaited<ReturnType<typeof cancelGuestEmergencyActionImpl>>> {
  return localiseFormState(await cancelGuestEmergencyActionImpl(...args));
}

export async function closeEmergencyAction(
  ...args: Parameters<typeof closeEmergencyActionImpl>
): Promise<Awaited<ReturnType<typeof closeEmergencyActionImpl>>> {
  return localiseFormState(await closeEmergencyActionImpl(...args));
}
