'use server';

import { revalidatePath } from 'next/cache';
import { requestMeta, requireActiveUser, requireReviewer } from '@/lib/auth';
import type { FormState } from '@/lib/form-state';
import { deleteAllRecordings, deleteRecording, saveRoomRecording } from '@/server/services/room-recording-service';

/**
 * Stores a finished call recording.
 *
 * The browser that made the recording posts it here when the call ends. The
 * service decides whether this account was actually on the call, so a recording
 * cannot be attached to somebody else's room.
 */
export async function saveRoomRecordingAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireActiveUser();
  const meta = await requestMeta();
  const recording = formData.get('recording');

  const result = await saveRoomRecording(
    user.id,
    { roomCode: formData.get('roomCode'), durationMs: formData.get('durationMs') },
    recording instanceof File && recording.size > 0 ? recording : null,
    meta,
  );

  if (!result.ok) return { ok: false, message: result.message };

  revalidatePath('/rooms');
  return { ok: true, message: 'The recording has been saved to this room.' };
}

/**
 * Removing recordings.
 *
 * Evidence is kept while it might be needed and not a day longer, so there has to
 * be a way to destroy it deliberately — one recording, or every recording on the
 * platform at once. Both require the reviewer role: this is an act of
 * administration, not something a participant does to their own evidence
 * mid-dispute.
 */
export async function deleteRecordingAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireReviewer();
  const meta = await requestMeta();
  const reviewer = await requireReviewer();
  const result = await deleteRecording(String(formData.get('recordingId') ?? ''), reviewer.id, meta);

  if (!result.ok) return { ok: false, message: result.message };
  revalidatePath('/admin/recordings');
  return { ok: true, message: 'The recording and its file have been destroyed.' };
}

export async function deleteAllRecordingsAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const reviewer = await requireReviewer();
  const meta = await requestMeta();

  if (String(formData.get('confirm') ?? '') !== 'delete-all') {
    return { ok: false, message: 'Type the confirmation before deleting every recording.' };
  }

  const result = await deleteAllRecordings(reviewer.id, meta);
  revalidatePath('/admin/recordings');

  if (!result.ok) return { ok: false, message: result.message };
  return {
    ok: true,
    message:
      result.data.deleted === 0
        ? 'There were no recordings to delete.'
        : `${result.data.deleted} recording${result.data.deleted === 1 ? '' : 's'} destroyed, files included.`,
  };
}
