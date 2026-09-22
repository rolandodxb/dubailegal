'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { isAdministrator, requestMeta, requireActiveUser } from '@/lib/auth';
import type { FormState } from '@/lib/form-state';
import { featureDisabledMessage, getAvailability, isEnabled } from '@/lib/availability';
import {
  bookAppointment,
  cancelAppointment,
  deleteAppointment,
  requestUrgentCall,
  rescheduleAppointment,
  respondToOfficeRequest,
} from '@/server/services/appointment-service';

/**
 * Books a meeting into the signed-in lawyer's own diary for one of their
 * clients. The client is alerted in-app, which is the only channel available on
 * an installation with no mail provider.
 */
export async function bookAppointmentAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireActiveUser();

  if (isAdministrator(user)) {
    return { ok: false, message: 'Administrator accounts do not have a diary.' };
  }

  const availability = await getAvailability();
  if (!isEnabled(availability.settings, 'feature.appointments')) {
    return { ok: false, message: featureDisabledMessage('feature.appointments') };
  }
  const meta = await requestMeta();

  const result = await bookAppointment(
    user.id,
    {
      lawyerProfileId: formData.get('lawyerProfileId'),
      clientId: formData.get('clientId'),
      dateKey: formData.get('dateKey'),
      hour: formData.get('hour'),
      caseId: formData.get('caseId') || null,
      note: formData.get('note') || null,
      mode: formData.get('mode') || 'OFFICE_VISIT',
      officeAddress: formData.get('officeAddress') || null,
    },
    meta,
  );

  if (!result.ok) {
    return {
      ok: false,
      message: result.message,
      fieldErrors: result.fieldErrors,
      values: {
        clientId: String(formData.get('clientId') ?? ''),
        dateKey: String(formData.get('dateKey') ?? ''),
        hour: String(formData.get('hour') ?? ''),
        mode: String(formData.get('mode') ?? ''),
        officeAddress: String(formData.get('officeAddress') ?? ''),
        note: String(formData.get('note') ?? ''),
      },
    };
  }

  revalidatePath('/calendar');
  revalidatePath('/dashboard');
  revalidatePath('/cases');

  const mode = String(formData.get('mode') ?? 'OFFICE_VISIT');
  return {
    ok: true,
    message:
      mode === 'VIDEO_CALL'
        ? 'Meeting booked. A conference room has been created and the client can join it from My cases.'
        : mode === 'OFFICE_VISIT'
          ? 'Meeting scheduled. The client has been asked to confirm they will come to the office.'
          : 'Meeting booked. The client has been alerted.',
  };
}

export async function cancelAppointmentAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireActiveUser();
  const result = await cancelAppointment(String(formData.get('appointmentId') ?? ''), user.id);
  if (!result.ok) return { ok: false, message: result.message };

  revalidatePath('/calendar');
  revalidatePath('/cases');
  return { ok: true, message: 'Meeting cancelled and the other party has been told.' };
}

/**
 * Moves a meeting to another time in the same diary.
 *
 * The client is alerted, because a client who arrives at the old time has been
 * failed by the product — the only action here that says nothing to the client is
 * deletion, which erases the arrangement instead of changing it.
 */
export async function rescheduleAppointmentAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireActiveUser();
  const meta = await requestMeta();

  const result = await rescheduleAppointment(
    user.id,
    {
      appointmentId: formData.get('appointmentId'),
      dateKey: formData.get('dateKey'),
      hour: formData.get('hour'),
      mode: formData.get('mode'),
      officeAddress: formData.get('officeAddress') || null,
    },
    meta,
  );

  if (!result.ok) {
    return {
      ok: false,
      message: result.message,
      fieldErrors: result.fieldErrors,
      values: {
        dateKey: String(formData.get('dateKey') ?? ''),
        hour: String(formData.get('hour') ?? ''),
        mode: String(formData.get('mode') ?? ''),
        officeAddress: String(formData.get('officeAddress') ?? ''),
      },
    };
  }

  revalidatePath('/calendar');
  revalidatePath('/cases');
  return { ok: true, message: 'Meeting moved. The client has been told the new time.' };
}

/**
 * Deletes a meeting outright.
 *
 * No notification is sent: this erases the arrangement rather than changing it,
 * and the button says so before it is pressed.
 */
export async function deleteAppointmentAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireActiveUser();
  const meta = await requestMeta();

  const result = await deleteAppointment(String(formData.get('appointmentId') ?? ''), user.id, meta);
  if (!result.ok) return { ok: false, message: result.message };

  revalidatePath('/calendar');
  revalidatePath('/cases');
  return { ok: true, message: 'Meeting deleted. The client was not notified.' };
}

/**
 * The client asks for an urgent call with the professional on their case.
 *
 * This is the client's own way into a conference room, so they do not have to
 * wait for an appointment to be booked for them.
 */
export async function requestUrgentCallAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireActiveUser();
  const meta = await requestMeta();
  const caseId = String(formData.get('caseId') ?? '');

  const result = await requestUrgentCall(user.id, caseId, meta);
  if (!result.ok) return { ok: false, message: result.message };

  // Straight into the room: the point of an urgent call is talking now, not
  // reading a confirmation that somebody has been alerted.
  revalidatePath(`/cases/${caseId}`);
  revalidatePath('/rooms');
  redirect(`/rooms/${result.data.roomCode}`);
}

/**
 * The client accepts or declines being asked to come to the office.
 *
 * Declining leaves the meeting in place so the professional can rearrange it —
 * it is an answer, not a cancellation.
 */
export async function respondToOfficeRequestAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireActiveUser();

  const result = await respondToOfficeRequest(
    String(formData.get('appointmentId') ?? ''),
    user.id,
    String(formData.get('accept') ?? '') === 'true',
  );

  revalidatePath('/cases');
  revalidatePath('/calendar');
  if (!result.ok) return { ok: false, message: result.message };

  return {
    ok: true,
    message:
      String(formData.get('accept') ?? '') === 'true'
        ? 'Thank you — the professional has been told you will attend.'
        : 'The professional has been told you cannot come. They may offer a video call instead.',
  };
}
