'use client';

import { useActionState, useCallback, useEffect, useRef, useState } from 'react';
import { saveRoomRecordingAction } from '@/app/actions/room-actions';
import { initialFormState } from '@/lib/form-state';
import { buttonClasses, Card } from '@/components/ui/primitives';
import { Icon } from '@/components/icons';

/**
 * Recording the call, from this side of it.
 *
 * The browser records this participant's own camera and microphone with
 * MediaRecorder and hands the finished file to the server when the call ends.
 * Both sides record, so both recordings exist and both are kept against the room
 * — that is what makes them available to the client and the lawyer alike, and
 * what keeps an administrator out of them.
 *
 * It is disclosed on screen for the whole call. Nothing here is hidden from the
 * person being recorded, and the note at the foot says who can watch it back.
 */
export function CallRecorder({
  roomCode,
  stream,
  active,
  onSaved,
}: {
  roomCode: string;
  /** The local camera and microphone, once the call is joined. */
  stream: MediaStream | null;
  /** False until the call is actually running. */
  active: boolean;
  onSaved?: () => void;
}) {
  const [state, saveRecording] = useActionState(saveRoomRecordingAction, initialFormState);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [uploading, setUploading] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const roomRef = useRef(roomCode);
  roomRef.current = roomCode;

  useEffect(() => {
    if (state?.ok) {
      setUploading(false);
      onSaved?.();
    }
    if (state && !state.ok) setUploading(false);
  }, [state, onSaved]);

  /** Stop the recorder; `onstop` sends what it captured. */
  const finish = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    recorderRef.current = null;
    setRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    try {
      recorder.stop();
    } catch {
      // Already stopped: nothing to do.
    }
  }, []);

  useEffect(() => {
    if (!active || !stream || recorderRef.current) return;
    if (typeof MediaRecorder === 'undefined') return;

    const mimeType = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4',
    ].find((candidate) => MediaRecorder.isTypeSupported(candidate));

    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    } catch {
      // A browser that will not record a stream simply records nothing; the rest
      // of the call is unaffected.
      return;
    }

    chunksRef.current = [];
    startedAtRef.current = Date.now();

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) chunksRef.current.push(event.data);
    };

    recorder.onstop = () => {
      const type = recorder.mimeType || 'video/webm';
      const blob = new Blob(chunksRef.current, { type });
      const durationMs = Math.max(0, Date.now() - startedAtRef.current);
      chunksRef.current = [];
      if (blob.size === 0) return;

      setUploading(true);
      const payload = new FormData();
      payload.set('roomCode', roomRef.current);
      payload.set('durationMs', String(durationMs));
      payload.set(
        'recording',
        new File([blob], `call-${roomRef.current}.webm`, { type: type || 'video/webm' }),
      );
      // A Server Action is callable directly, which is what lets the finished
      // file go up without a form and without a page reload.
      void saveRecording(payload);
    };

    // A timeslice keeps chunks coming, so a long call is not one blob held in
    // memory until the very end.
    recorder.start(5000);
    recorderRef.current = recorder;
    setRecording(true);
    setElapsed(0);
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 1000);

    return () => {
      recorderRef.current = null;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (recorder.state !== 'inactive') {
        try {
          recorder.stop();
        } catch {
          // Nothing to stop.
        }
      }
    };
  }, [active, stream, saveRecording]);

  // A tab that is closed, or a room that is left, still saves what was captured.
  useEffect(() => {
    const handleHide = () => finish();
    window.addEventListener('pagehide', handleHide);
    return () => {
      window.removeEventListener('pagehide', handleHide);
      finish();
    };
  }, [finish]);

  const minutes = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const seconds = String(elapsed % 60).padStart(2, '0');

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={
              recording
                ? 'inline-flex h-9 w-9 items-center justify-center rounded-full bg-red-100 text-red-700'
                : 'inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500'
            }
          >
            <Icon name="record" size={18} />
          </span>
          <div>
            <h2 className="font-semibold text-slate-900">
              {recording ? 'Recording this call' : uploading ? 'Saving the recording' : 'Recording'}
            </h2>
            <p className="text-xs text-slate-600">
              {recording ? (
                <>
                  {minutes}:{seconds} · both sides are recording, and both recordings are kept private
                  to the two of you
                </>
              ) : uploading ? (
                'Uploading the recording, encrypted.'
              ) : active ? (
                'Recording starts with the call.'
              ) : (
                'Join the call and it is recorded from the moment you are connected.'
              )}
            </p>
          </div>
        </div>

        {recording ? (
          <button type="button" onClick={finish} className={buttonClasses('secondary', 'sm')}>
            Stop recording
          </button>
        ) : null}
      </div>

      {state && !state.ok && state.message ? (
        <p className="mt-3 text-xs font-medium text-red-700">{state.message}</p>
      ) : null}
      {state?.ok && state.message ? (
        <p className="mt-3 text-xs font-medium text-green-700">{state.message}</p>
      ) : null}

      <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
        <strong className="font-medium text-slate-800">Private and encrypted.</strong> Recordings are
        stored encrypted, available to you and to the other person on the call, and to nobody else. An
        administrator of this platform cannot play them. They are deleted with the meeting or the
        emergency request they belong to.
      </p>
    </Card>
  );
}
