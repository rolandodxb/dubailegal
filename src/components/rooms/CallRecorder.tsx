'use client';

import { useActionState, useCallback, useEffect, useRef, useState } from 'react';
import { saveRoomRecordingAction } from '@/app/actions/room-actions';
import { initialFormState } from '@/lib/form-state';
import type { MemberCasesDict } from '@/lib/i18n/dict/memberCases';
import { buttonClasses, Card } from '@/components/ui/primitives';
import { Icon } from '@/components/icons';

/**
 * Recording the room, not one camera.
 *
 * What has to be evidenced is the *interaction*: what each person said and did
 * while the other listened. A recording of one camera shows half of that — the
 * lawyer after the client has already spoken, or a face listening silently to a
 * question nobody can hear. So this records the room: both cameras side by side
 * on one picture, and both microphones mixed into one track.
 *
 * The composition is a canvas. Both videos are drawn into it at the framerate the
 * browser offers, the canvas becomes a video track, and an `AudioContext` mixes
 * the two microphones into a second track. `MediaRecorder` then records the two
 * together, exactly as though it were a camera.
 *
 * Both sides compose their own recording, so each file is named from the side that
 * made it and the pair is kept against the room. Nothing here is hidden from the
 * people being recorded: the panel says what is happening for the whole call, and
 * who can watch it afterwards.
 */
export function CallRecorder({
  roomCode,
  stream,
  remoteStream,
  active,
  localLabel,
  remoteLabel,
  onSaved,
  labels,
}: {
  roomCode: string;
  /** The local camera and microphone, once the call is joined. */
  stream: MediaStream | null;
  /** The other side's camera and microphone. */
  remoteStream: MediaStream | null;
  /** False until the call is actually running. */
  active: boolean;
  /** Printed on the two halves of the picture, so the recording says who is who. */
  localLabel: string;
  remoteLabel: string;
  onSaved?: () => void;
  /** The recorder panel's words, in the reader's language. */
  labels: MemberCasesDict['recorder'];
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

    /**
     * Builds the picture and the sound of the room.
     *
     * Two video elements play the two streams into a canvas — the other party on
     * the left, this side on the right, each with its name printed on it — and an
     * `AudioContext` mixes both microphones into one track. If the other side has
     * not arrived yet the canvas says so rather than showing a black rectangle,
     * because a recording that silently shows nothing is worse than one that
     * explains itself.
     */
    const compose = async (): Promise<{ stream: MediaStream; stop: () => void } | null> => {
      const canvas = document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 720;
      const context = canvas.getContext('2d');
      if (!context) return null;

      const attach = (media: MediaStream, muted: boolean) => {
        const element = document.createElement('video');
        element.srcObject = media;
        element.muted = muted;
        element.playsInline = true;
        void element.play().catch(() => undefined);
        return element;
      };

      const mine = attach(stream, true);
      const theirs = remoteStream ? attach(remoteStream, true) : null;

      const audio = new AudioContext();
      const destination = audio.createMediaStreamDestination();
      // Connected to the recording destination only — never to the speakers, or
      // the call would echo back into itself.
      audio.createMediaStreamSource(stream).connect(destination);
      if (remoteStream && remoteStream.getAudioTracks().length > 0) {
        audio.createMediaStreamSource(remoteStream).connect(destination);
      }

      const tileLabel = (text: string, x: number, y: number, width: number) => {
        context.fillStyle = 'rgba(15, 23, 42, 0.72)';
        context.fillRect(x, y, width, 44);
        context.fillStyle = '#ffffff';
        context.font = '600 22px system-ui, sans-serif';
        context.fillText(text.slice(0, 44), x + 16, y + 30);
      };

      const draw = (video: HTMLVideoElement, x: number, width: number, label: string, missing: string) => {
        const ready = video.readyState >= 2 && video.videoWidth > 0;
        if (ready) {
          // Cropped to fill the tile, so neither face is squashed.
          const scale = Math.max(width / video.videoWidth, canvas.height / video.videoHeight);
          const w = video.videoWidth * scale;
          const h = video.videoHeight * scale;
          context.drawImage(video, x + (width - w) / 2, (canvas.height - h) / 2, w, h);
        } else {
          context.fillStyle = '#0f172a';
          context.fillRect(x, 0, width, canvas.height);
          context.fillStyle = '#94a3b8';
          context.font = '500 24px system-ui, sans-serif';
          context.textAlign = 'center';
          context.fillText(missing, x + width / 2, canvas.height / 2);
          context.textAlign = 'start';
        }
        tileLabel(label, x, canvas.height - 64, width);
      };

      let frame = 0;
      const render = () => {
        context.fillStyle = '#0f172a';
        context.fillRect(0, 0, canvas.width, canvas.height);
        const half = canvas.width / 2;
        if (theirs) {
          draw(theirs, 0, half, remoteLabel, labels.waiting);
        } else {
          context.fillStyle = '#0f172a';
          context.fillRect(0, 0, half, canvas.height);
          context.fillStyle = '#94a3b8';
          context.font = '500 24px system-ui, sans-serif';
          context.textAlign = 'center';
          context.fillText(labels.waiting, half / 2, canvas.height / 2);
          context.textAlign = 'start';
        }
        draw(mine, half, half, localLabel, labels.cameraOff);

        // A divider, so the two halves read as two people rather than one picture.
        context.fillStyle = '#1e293b';
        context.fillRect(half - 2, 0, 4, canvas.height);

        frame = requestAnimationFrame(render);
      };
      render();

      const composed = new MediaStream([
        ...canvas.captureStream(25).getVideoTracks(),
        ...destination.stream.getAudioTracks(),
      ]);

      return {
        stream: composed,
        stop: () => {
          cancelAnimationFrame(frame);
          void audio.close().catch(() => undefined);
          mine.srcObject = null;
          if (theirs) theirs.srcObject = null;
        },
      };
    };

    let composite: { stream: MediaStream; stop: () => void } | null = null;
    let recorder: MediaRecorder;
    let cancelled = false;

    // The recorder is created once the canvas exists; until then nothing is lost,
    // because the call itself has not started being captured yet.
    const start = async () => {
      composite = await compose().catch(() => null);
      if (cancelled) {
        composite?.stop();
        return;
      }

      try {
        recorder = new MediaRecorder(composite ? composite.stream : stream, mimeType ? { mimeType } : undefined);
      } catch {
        // A browser that will not record simply records nothing; the rest of the
        // call is unaffected.
        composite?.stop();
        return;
      }

      installRecorder(recorder);
    };

    void start();

    /**
     * Wires up the recorder once the composed stream is ready.
     *
     * Everything below is what already existed: chunks, the upload on stop, the
     * timer. The only change is what is being recorded.
     */
    function installRecorder(active: MediaRecorder) {
      recorder = active;

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
      composite?.stop();
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

    }

    return () => {
      cancelled = true;
      recorderRef.current = null;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (recorder && recorder.state !== 'inactive') {
        try {
          recorder.stop();
        } catch {
          // Nothing to stop.
        }
      } else {
        // Never started: the canvas and the audio graph still have to go.
        composite?.stop();
      }
    };
  }, [active, stream, remoteStream, localLabel, remoteLabel, saveRecording, labels]);

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
              {recording
                ? labels.recordingThisCall
                : uploading
                  ? labels.savingRecording
                  : labels.recording}
            </h2>
            <p className="text-xs text-slate-600">
              {recording ? (
                <>
                  {minutes}:{seconds} · {labels.bothSides}
                </>
              ) : uploading ? (
                labels.uploading
              ) : active ? (
                labels.startsWithCall
              ) : (
                labels.joinAndRecorded
              )}
            </p>
          </div>
        </div>

        {recording ? (
          <button type="button" onClick={finish} className={buttonClasses('secondary', 'sm')}>
            {labels.stop}
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
        <strong className="font-medium text-slate-800">{labels.privateEncryptedTitle}</strong>
        {labels.privateEncryptedBody}
      </p>
    </Card>
  );
}
