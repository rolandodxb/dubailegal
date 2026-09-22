import { prisma } from '@/lib/db';
import { recordAudit } from '@/lib/audit';
import { deleteUpload, storeUpload, UploadRejected } from '@/lib/storage';
import { fromZodError, failure, success, type ServiceResult } from './result';
import { z } from 'zod';

/**
 * Recordings of conference room calls.
 *
 * Each side of a call records its own camera and microphone, and both files are
 * kept against the room. Both people on the call can play either of them, which
 * is the point: a client and their lawyer should each be able to go back over
 * what was said.
 *
 * **An administrator cannot play one.** Recordings follow exactly the rule the
 * rooms themselves follow — a conversation between a lawyer and their client may
 * be privileged, so the operator who runs the platform has no access to it. The
 * list is not even shown in the console beyond a count of how many exist.
 *
 * The files are encrypted on disk like every other upload, and they are deleted
 * with the appointment or the emergency request they belong to.
 */

const recordingSchema = z.object({
  roomCode: z.string().trim().min(4).max(64),
  durationMs: z.coerce.number().int().min(0).max(24 * 60 * 60 * 1000).optional(),
});

/** Recordings are shorter than an hour in practice; this is the hard ceiling. */
const MAX_RECORDING_BYTES = 200 * 1024 * 1024;
const ALLOWED_RECORDING_TYPES = ['video/webm', 'audio/webm', 'video/mp4', 'audio/mp4', 'video/ogg'];

/** What the room is for, so a recording can be tied to it and deleted with it. */
async function roomContext(roomCode: string) {
  const appointment = await prisma.appointment.findUnique({
    where: { roomCode },
    select: { id: true, clientId: true, lawyer: { select: { userId: true } }, firmId: true },
  });
  if (appointment) return { kind: 'APPOINTMENT' as const, appointment };

  const emergency = await prisma.emergencyRequest.findUnique({
    where: { roomCode },
    select: { id: true, clientId: true, acceptedById: true },
  });
  if (emergency) return { kind: 'EMERGENCY' as const, emergency };

  return null;
}

/**
 * Stores a recording a browser has just finished making.
 *
 * The uploader must be one of the two people on the call: the client or the
 * professional. Nobody else may add a file to a room, and an administrator is
 * refused here for the same reason they cannot join one.
 */
export async function saveRoomRecording(
  recorderUserId: string,
  rawInput: unknown,
  file: File | null,
  meta: { ip?: string | null } = {},
): Promise<ServiceResult<{ recordingId: string }>> {
  const parsed = recordingSchema.safeParse(rawInput);
  if (!parsed.success) return fromZodError(parsed.error);

  if (!file || file.size === 0) return failure('There was no recording to save.');
  if (file.size > MAX_RECORDING_BYTES) {
    return failure('That recording is too large to store.');
  }

  const room = await roomContext(parsed.data.roomCode);
  if (!room) return failure('That room no longer exists.', { status: 404 });

  const reviewer = await prisma.user.count({
    where: { id: recorderUserId, roles: { has: 'REVIEWER' } },
  });
  if (reviewer > 0) {
    return failure('Administrator accounts cannot be part of a call, so they cannot record one.', {
      status: 403,
    });
  }

  if (room.kind === 'APPOINTMENT') {
    const profile = await prisma.lawyerProfile.findUnique({
      where: { userId: recorderUserId },
      select: { id: true },
    });
    const firmLawyers = room.appointment.firmId
      ? await prisma.lawyerProfile.count({
          where: { affiliatedFirmId: room.appointment.firmId, userId: recorderUserId },
        })
      : 0;
    const isProfessional = Boolean(
      profile && room.appointment.lawyer.userId === recorderUserId
        ? true
        : firmLawyers > 0,
    );
    const isClient = room.appointment.clientId === recorderUserId;
    if (!isProfessional && !isClient) {
      return failure('That room is not yours.', { status: 403 });
    }
  } else {
    const isClient = room.emergency.clientId === recorderUserId;
    const isAnswering = room.emergency.acceptedById === recorderUserId;
    if (!isClient && !isAnswering) {
      // The guest who raised it has no account, so only the professional's
      // recording of an emergency call is stored; see the room page.
      return failure('That room is not yours.', { status: 403 });
    }
  }

  let stored;
  try {
    stored = await storeUpload(file, recorderUserId, { allowArchives: true });
  } catch (error) {
    if (error instanceof UploadRejected) return failure(error.message);
    console.error('[rooms] recording storage failed', error);
    return failure('The recording could not be stored.', { status: 500 });
  }

  const detected = stored.mimeType;
  if (!ALLOWED_RECORDING_TYPES.includes(detected) && detected !== 'application/zip') {
    // MediaRecorder writes WebM in Chrome and Firefox and MP4 in Safari; the
    // sniffer sees those as zip-like containers or unrecognised, so the check is
    // on the name rather than the sniffed type for this one upload path.
    const named = stored.fileName.toLowerCase();
    if (!/\.(webm|mp4|m4a|ogg)$/.test(named)) {
      await deleteUpload(stored.storageKey);
      return failure('That file is not a recording this installation can play.');
    }
  }

  const recording = await prisma.roomRecording.create({
    data: {
      roomCode: parsed.data.roomCode,
      recordedById: recorderUserId,
      appointmentId: room.kind === 'APPOINTMENT' ? room.appointment.id : null,
      emergencyRequestId: room.kind === 'EMERGENCY' ? room.emergency.id : null,
      storageKey: stored.storageKey,
      fileName: stored.fileName,
      mimeType: stored.mimeType === 'application/zip' ? 'video/webm' : stored.mimeType,
      sizeBytes: stored.sizeBytes,
      sha256: stored.sha256,
      durationMs: parsed.data.durationMs ?? null,
    },
    select: { id: true },
  });

  await recordAudit({
    actorUserId: recorderUserId,
    action: 'room.recorded',
    entityType: 'room_recording',
    entityId: recording.id,
    metadata: {
      roomCode: parsed.data.roomCode,
      durationMs: parsed.data.durationMs ?? null,
      sizeBytes: stored.sizeBytes,
    },
    ip: meta.ip ?? null,
  });

  return success({ recordingId: recording.id });
}

/** Recordings for a room, newest first, without their bytes. */
export async function listRecordingsForRoom(roomCode: string) {
  return prisma.roomRecording.findMany({
    where: { roomCode },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      recordedById: true,
      mimeType: true,
      sizeBytes: true,
      durationMs: true,
      createdAt: true,
      recordedBy: {
        select: {
          id: true,
          email: true,
          profile: { select: { fullName: true } },
        },
      },
    },
  });
}

/**
 * One recording, for somebody entitled to it: the person who made it, the other
 * party on the call, or — for a room that was reached without an account — the
 * holder of that room's token. Never an administrator, and never a stranger.
 */
export async function getRecordingForViewer(
  recordingId: string,
  viewer: { id: string; roles: string[] } | null,
  guestToken?: string | null,
) {
  const recording = await prisma.roomRecording.findUnique({
    where: { id: recordingId },
    select: {
      id: true,
      roomCode: true,
      storageKey: true,
      fileName: true,
      mimeType: true,
      recordedById: true,
      appointmentId: true,
      emergencyRequestId: true,
    },
  });
  if (!recording) return null;

  if (recording.recordedById === viewer?.id) return recording;

  if (viewer) {
    // An administrator is not a party to a call, by design.
    if (viewer.roles.includes('REVIEWER') && recording.recordedById !== viewer.id) {
      const { resolveRoomForUser } = await import('./room-service');
      const access = await resolveRoomForUser(recording.roomCode, viewer.id);
      if (!access) return null;
      return recording;
    }

    const { resolveRoomForUser } = await import('./room-service');
    const access = await resolveRoomForUser(recording.roomCode, viewer.id);
    if (access) return recording;
  }

  // Somebody who reached an emergency room without an account: the token in
  // their link is the only credential they have, and it is enough.
  if (recording.emergencyRequestId && guestToken) {
    const { resolveRoomForGuest } = await import('./room-service');
    const access = await resolveRoomForGuest(recording.roomCode, guestToken);
    if (access) return recording;
  }

  return null;
}

/** How many recordings exist, for the console. The console never plays them. */
export async function recordingOverview() {
  const [count, rooms, latest] = await Promise.all([
    prisma.roomRecording.count(),
    prisma.roomRecording
      .findMany({ select: { roomCode: true }, distinct: ['roomCode'] })
      .then((rows) => rows.length),
    prisma.roomRecording.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    }),
  ]);

  return { count, rooms, latestAt: latest?.createdAt ?? null };
}
