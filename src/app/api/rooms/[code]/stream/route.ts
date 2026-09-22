import { getSessionUser } from '@/lib/auth';
import {
  claimEmergencyOnJoin,
  leaveRoom,
  presentOthers,
  pruneRooms,
  resolveRoomForGuest,
  resolveRoomForUser,
  signalsSince,
  touchPresence,
  type RoomAccess,
} from '@/server/services/room-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const POLL_MS = 1200;
const MAX_STREAM_MS = 4 * 60 * 1000;

/**
 * Server-sent events for one conference room: signalling from the other
 * participant, and who is currently present.
 *
 * Presence doubles as a heartbeat — while the stream is open the participant
 * counts as in the room, and when it closes they leave. For an emergency room,
 * opening this stream is what records that a lawyer answered.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ code: string }> },
): Promise<Response> {
  const { code } = await context.params;

  const viewer = await getSessionUser();
  let access: RoomAccess | null = null;

  if (viewer) {
    access = await resolveRoomForUser(code, viewer.id);
    if (access?.roomKind === 'EMERGENCY' && viewer) {
      await claimEmergencyOnJoin(access, viewer.id);
    }
  } else {
    const token = new URL(request.url).searchParams.get('t') ?? '';
    access = await resolveRoomForGuest(code, token);
  }

  if (!access) return new Response('Not found.', { status: 404 });

  const viewerKey = access.viewerKey;
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      let lastSignalId: string | null = null;
      const startedAt = Date.now();

      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          closed = true;
        }
      };

      const finish = async () => {
        if (closed) return;
        closed = true;
        await leaveRoom(code, viewerKey).catch(() => undefined);
        try {
          controller.close();
        } catch {
          // Already closed by the client.
        }
      };

      send('ready', {
        role: access!.role,
        roomKind: access!.roomKind,
        otherPartyName: access!.otherPartyName,
        appointment: access!.appointment,
        emergency: access!.emergency,
      });

      const tick = async () => {
        if (closed) return;

        try {
          await touchPresence(code, viewerKey);

          const signals = await signalsSince(code, lastSignalId, viewerKey);
          for (const signal of signals) {
            lastSignalId = signal.id;
            send('signal', { id: signal.id, from: signal.fromKey, payload: signal.payload });
          }

          const others = await presentOthers(code, viewerKey);
          send('presence', { others: others.map((row) => row.participantKey), count: others.length });
        } catch (error) {
          console.error('[rooms] stream tick failed', error);
        }

        if (Date.now() - startedAt > MAX_STREAM_MS) {
          send('reconnect', { reason: 'stream lifetime reached' });
          await finish();
          return;
        }

        setTimeout(() => void tick(), POLL_MS);
      };

      request.signal.addEventListener('abort', () => void finish());
      setTimeout(() => void tick(), 0);
      setTimeout(() => void pruneRooms().catch(() => undefined), 5000);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'private, no-store, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
