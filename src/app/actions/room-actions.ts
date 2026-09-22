'use server';

import { revalidatePath } from 'next/cache';
import { requestMeta, requireActiveUser } from '@/lib/auth';
import type { FormState } from '@/lib/form-state';
import { saveRoomRecording } from '@/server/services/room-recording-service';

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
