import { NextResponse, type NextRequest } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import {
  claimEmergencyOnJoin,
  postSignal,
  resolveRoomForGuest,
  resolveRoomForUser,
  type RoomAccess,
} from '@/server/services/room-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_PAYLOAD_BYTES = 64 * 1024;

/**
 * Relays one WebRTC signalling message to the other person in a room.
 *
 * A participant is identified either by their session or — for the emergency room
 * somebody reaches without an account — by the token in their link. The sender is
 * always taken from that identity, never from the body, so nobody can post as
 * somebody else.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ code: string }> },
): Promise<Response> {
  const { code } = await context.params;

  const raw = await request.text();
  if (raw.length > MAX_PAYLOAD_BYTES) {
    return NextResponse.json({ error: 'Payload too large.' }, { status: 413 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'Malformed payload.' }, { status: 400 });
  }

  const kind = (payload as { kind?: string } | null)?.kind;
  if (kind !== 'offer' && kind !== 'answer' && kind !== 'candidate' && kind !== 'bye') {
    return NextResponse.json({ error: 'Unknown signal kind.' }, { status: 400 });
  }

  // ── Who is sending? ─────────────────────────────────────────────────────
  let access: RoomAccess | null = null;

  const viewer = await getSessionUser();
  if (viewer) {
    if (viewer.status === 'SUSPENDED') {
      return NextResponse.json({ error: 'Account suspended.' }, { status: 403 });
    }
    access = await resolveRoomForUser(code, viewer.id);
    if (access?.roomKind === 'EMERGENCY') {
      // Answering the room is answering the emergency.
      await claimEmergencyOnJoin(access, viewer.id);
    }
  } else {
    const token =
      new URL(request.url).searchParams.get('t') ??
      (payload as { token?: string } | null)?.token ??
      '';
    access = await resolveRoomForGuest(code, token);
  }

  if (!access) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  await postSignal(code, access.viewerKey, payload);
  return NextResponse.json({ ok: true });
}
