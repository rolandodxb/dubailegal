import { NextResponse, type NextRequest } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { readUpload } from '@/lib/storage';
import { getRecordingForViewer } from '@/server/services/room-recording-service';

/**
 * Serves a call recording.
 *
 * Authorisation is decided by the room, not by the file: the two people on the
 * call, and for a room reached without an account the holder of its token. An
 * administrator is refused, exactly as they are refused the room itself — a call
 * between a lawyer and their client may be privileged.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  const guestToken = new URL(request.url).searchParams.get('t');

  const viewer = await getSessionUser();
  if (!viewer && !guestToken) return new NextResponse('Not signed in.', { status: 401 });

  const recording = await getRecordingForViewer(
    id,
    viewer ? { id: viewer.id, roles: viewer.roles } : null,
    guestToken,
  );
  if (!recording) return new NextResponse('Not found.', { status: 404 });

  let bytes: Buffer;
  try {
    bytes = await readUpload(recording.storageKey);
  } catch {
    return new NextResponse('The stored recording is missing.', { status: 410 });
  }

  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      'Content-Type': recording.mimeType,
      'Content-Length': String(bytes.byteLength),
      'Content-Disposition': `inline; filename="${recording.fileName.replace(/["\\\r\n]/g, '_')}"`,
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; media-src 'self'; object-src 'none'; sandbox",
    },
  });
}
