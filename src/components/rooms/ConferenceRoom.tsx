'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { formatUaeDateTime } from '@/lib/time';
import { Alert, buttonClasses, Card } from '@/components/ui/primitives';
import { CallRecorder } from './CallRecorder';
import { Icon } from '@/components/icons';

type Role = 'PROFESSIONAL' | 'CLIENT';

type SignalPayload =
  | { kind: 'offer'; sdp: string }
  | { kind: 'answer'; sdp: string }
  | { kind: 'candidate'; candidate: RTCIceCandidateInit }
  | { kind: 'bye' };

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

/**
 * The conference room.
 *
 * A direct peer-to-peer video call between the professional and the client. Setup
 * — the session description and ICE candidates — is relayed through the server
 * over server-sent events; the audio and video never pass through it.
 *
 * The person already in the room makes the offer, the person arriving answers, so
 * whoever joins second completes the connection. If the browser has no camera or
 * microphone, or refuses permission, the failure is stated plainly rather than
 * leaving a black rectangle on screen.
 */
export function ConferenceRoom({
  roomCode,
  role,
  otherPartyName,
  startsAt,
  providerUrl,
  guestToken,
  context,
}: {
  roomCode: string;
  role: Role;
  otherPartyName: string;
  /** Absent for an emergency room, which has no schedule. */
  startsAt?: string;
  providerUrl: string;
  /**
   * Present when the person reached this room without an account. It is the only
   * thing that admits them, and it travels in the signalling requests rather than
   * requiring a session.
   */
  guestToken?: string;
  /** A short line explaining what this room is, shown above the call. */
  context?: string;
}) {
  const [joined, setJoined] = useState(false);
  /** Set once the camera is live, so the recorder can attach to it. */
  const [liveStream, setLiveStream] = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] = useState<'idle' | 'connecting' | 'live' | 'ended'>('idle');
  const [othersPresent, setOthersPresent] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<EventSource | null>(null);
  const politeRef = useRef(false);
  const makingOfferRef = useRef(false);
  const pendingCandidates = useRef<RTCIceCandidateInit[]>([]);

  const sendSignal = useCallback(
    async (payload: SignalPayload) => {
      await fetch(`${signalUrl(roomCode, guestToken)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, token: guestToken }),
      }).catch(() => undefined);
    },
    [roomCode, guestToken],
  );

  const attachLocalMedia = useCallback(async () => {
    const media = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    streamRef.current = media;
    setLiveStream(media);
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = media;
      await localVideoRef.current.play().catch(() => undefined);
    }
    return media;
  }, []);

  const createPeer = useCallback(
    (stream: MediaStream) => {
      const peer = new RTCPeerConnection({ iceServers: ICE_SERVERS });

      for (const track of stream.getTracks()) peer.addTrack(track, stream);

      peer.ontrack = (event) => {
        const [remote] = event.streams;
        if (remote && remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remote;
          void remoteVideoRef.current.play().catch(() => undefined);
          setConnectionState('live');
        }
      };

      peer.onicecandidate = (event) => {
        if (event.candidate) void sendSignal({ kind: 'candidate', candidate: event.candidate.toJSON() });
      };

      peer.onconnectionstatechange = () => {
        if (peer.connectionState === 'connected') setConnectionState('live');
        if (peer.connectionState === 'failed') {
          setError(
            'The call could not be established on this network. A direct connection needs both sides to allow it; a relay (TURN) server is required on restrictive networks.',
          );
          setConnectionState('ended');
        }
        if (peer.connectionState === 'disconnected' || peer.connectionState === 'closed') {
          setConnectionState((current) => (current === 'live' ? 'ended' : current));
        }
      };

      peerRef.current = peer;
      return peer;
    },
    [sendSignal],
  );

  const handleSignal = useCallback(
    async (payload: SignalPayload) => {
      const peer = peerRef.current;
      if (!peer) return;

      try {
        if (payload.kind === 'offer' || payload.kind === 'answer') {
          const description = { type: payload.kind, sdp: payload.sdp } as RTCSessionDescriptionInit;
          const collision = payload.kind === 'offer' && makingOfferRef.current;
          const ignore = collision && !politeRef.current;
          if (ignore) return;

          if (collision) {
            // Both sides offered at once; the polite peer yields.
            await peer.setLocalDescription({ type: 'rollback' } as RTCSessionDescriptionInit).catch(() => undefined);
          }

          await peer.setRemoteDescription(description);

          for (const candidate of pendingCandidates.current) {
            await peer.addIceCandidate(candidate).catch(() => undefined);
          }
          pendingCandidates.current = [];

          if (payload.kind === 'offer') {
            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);
            await sendSignal({ kind: 'answer', sdp: answer.sdp ?? '' });
          }
        } else if (payload.kind === 'candidate') {
          if (peer.remoteDescription) {
            await peer.addIceCandidate(payload.candidate).catch(() => undefined);
          } else {
            pendingCandidates.current.push(payload.candidate);
          }
        } else if (payload.kind === 'bye') {
          setConnectionState('ended');
        }
      } catch (signalError) {
        console.error('[room] could not apply signal', signalError);
      }
    },
    [sendSignal],
  );

  const join = useCallback(async () => {
    setError(null);
    setConnectionState('connecting');

    // Whoever is already here makes the offer; the second arrival answers.
    politeRef.current = othersPresent > 0;

    try {
      const stream = await attachLocalMedia();
      createPeer(stream);
      setJoined(true);

      if (!politeRef.current) {
        makingOfferRef.current = true;
        const offer = await peerRef.current!.createOffer();
        await peerRef.current!.setLocalDescription(offer);
        await sendSignal({ kind: 'offer', sdp: offer.sdp ?? '' });
        makingOfferRef.current = false;
      }
      setConnectionState('connecting');
    } catch (mediaError) {
      const name = mediaError instanceof Error ? mediaError.name : '';
      setError(
        name === 'NotAllowedError'
          ? 'The browser blocked access to your camera and microphone. Allow them for this site, then try again.'
          : name === 'NotFoundError'
            ? 'No camera or microphone was found on this device. You can still follow the case in the chat.'
            : 'Your camera and microphone could not be started.',
      );
      setConnectionState('idle');
    }
  }, [attachLocalMedia, createPeer, othersPresent, sendSignal]);

  const leave = useCallback(async () => {
    await sendSignal({ kind: 'bye' });
    peerRef.current?.close();
    peerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    setJoined(false);
    setConnectionState('ended');
  }, [sendSignal]);

  // Keep the signalling stream open for as long as the page is on screen, so the
  // other side can see that somebody is waiting in the room.
  useEffect(() => {
    const query = guestToken ? `?t=${encodeURIComponent(guestToken)}` : '';
    const source = new EventSource(`/api/rooms/${roomCode}/stream${query}`);
    sourceRef.current = source;

    source.addEventListener('signal', (event) => {
      const data = JSON.parse((event as MessageEvent).data) as { payload: SignalPayload };
      void handleSignal(data.payload);
    });

    source.addEventListener('presence', (event) => {
      const data = JSON.parse((event as MessageEvent).data) as { count: number };
      setOthersPresent(data.count);
    });

    source.addEventListener('reconnect', () => source.close());

    source.onerror = () => {
      // EventSource reconnects on its own; nothing to do but let it.
    };

    return () => {
      source.close();
      sourceRef.current = null;
      void fetch(signalUrl(roomCode, guestToken), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'bye', token: guestToken }),
        keepalive: true,
      }).catch(() => undefined);
      peerRef.current?.close();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [roomCode, handleSignal, guestToken]);

  const toggleMute = () => {
    const track = streamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMuted(!track.enabled);
  };

  const toggleCamera = () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setCameraOff(!track.enabled);
  };

  return (
    <div className="space-y-4">
      {context ? <Alert tone="warning" title="Urgent call">{context}</Alert> : null}

      {error ? <Alert tone="error" title="The call could not start">{error}</Alert> : null}

      <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
        {/* The other party, filling the frame. */}
        <video
          ref={remoteVideoRef}
          playsInline
          autoPlay
          className="aspect-video w-full bg-slate-900 object-cover"
        />

        {connectionState !== 'live' ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
            <Icon name="video" size={28} className="text-slate-500" />
            <p className="text-sm font-medium text-slate-200">
              {connectionState === 'connecting'
                ? `Waiting for ${otherPartyName} to join…`
                : connectionState === 'ended'
                  ? 'The call has ended.'
                  : othersPresent > 0
                    ? `${otherPartyName} is in the room.`
                    : 'Nobody else is in the room yet.'}
            </p>
            <p className="text-xs text-slate-400">
              {role === 'CLIENT' ? 'Your professional' : 'Your client'} can join from the same
              meeting link.
            </p>
          </div>
        ) : null}

        {/* Your own camera, small in the corner. */}
        <video
          ref={localVideoRef}
          playsInline
          autoPlay
          muted
          className="absolute bottom-3 right-3 h-24 w-36 rounded-lg border border-slate-700 bg-slate-800 object-cover sm:h-32 sm:w-48"
        />

        {!joined ? (
          <div className="absolute inset-x-0 bottom-0 flex justify-center pb-4">
            <button type="button" onClick={() => void join()} className={buttonClasses('primary', 'md')}>
              Join the call
            </button>
          </div>
        ) : (
          <div className="absolute inset-x-0 bottom-0 flex justify-center gap-2 pb-4">
            <button type="button" onClick={toggleMute} className={buttonClasses('secondary', 'sm')}>
              {muted ? 'Unmute' : 'Mute'}
            </button>
            <button type="button" onClick={toggleCamera} className={buttonClasses('secondary', 'sm')}>
              {cameraOff ? 'Camera on' : 'Camera off'}
            </button>
            <button type="button" onClick={() => void leave()} className={buttonClasses('danger', 'sm')}>
              Leave
            </button>
          </div>
        )}
      </div>

      {/* The recording runs with the call: both sides record, both recordings are
          kept, and neither an administrator nor a stranger can play them. */}
      <CallRecorder roomCode={roomCode} stream={liveStream} active={joined} />

      <Card>
        <h2 className="font-semibold text-slate-900">Meeting details</h2>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-600">With</dt>
            <dd className="font-medium text-slate-900">{otherPartyName}</dd>
          </div>
          {startsAt ? (
            <div>
              <dt className="text-slate-600">Scheduled</dt>
              <dd className="font-medium text-slate-900">{formatUaeDateTime(new Date(startsAt))}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-slate-600">Room code</dt>
            <dd className="font-mono font-medium text-slate-900">{roomCode}</dd>
          </div>
          <div>
            <dt className="text-slate-600">In the room now</dt>
            <dd className="font-medium text-slate-900">
              {othersPresent > 0 ? `${otherParticipantsLabel(othersPresent)}` : 'Only you'}
            </dd>
          </div>
        </dl>

        <p className="mt-4 border-t border-slate-100 pt-4 text-xs text-slate-500">
          The call is made directly between the two of you; the video does not pass through Dubai
          Legal. On a restrictive network a direct connection may not be possible without a relay
          server.
          {providerUrl ? (
            <>
              {' '}
              <a
                href={`${providerUrl.replace(/\/$/, '')}/${roomCode}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-brand-700 hover:underline"
              >
                Open the backup video room
              </a>{' '}
              if this one will not connect.
            </>
          ) : null}
        </p>
      </Card>
    </div>
  );
}

function otherParticipantsLabel(count: number): string {
  return count === 1 ? '1 other person' : `${count} other people`;
}

/** The signalling endpoint, carrying the guest token when there is one. */
function signalUrl(roomCode: string, guestToken?: string): string {
  return `/api/rooms/${roomCode}/signal${guestToken ? `?t=${encodeURIComponent(guestToken)}` : ''}`;
}
