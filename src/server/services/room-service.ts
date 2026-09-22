import { randomBytes } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { recordAudit } from '@/lib/audit';
import { hashToken } from '@/lib/tokens';

/**
 * Conference rooms.
 *
 * Two kinds share one mechanism:
 *
 *  · **Appointment rooms** — a video meeting between a professional and a client,
 *    who both have accounts.
 *  · **Emergency rooms** — opened the moment somebody asks for urgent help. The
 *    person may have no account at all, which is the point: nobody being detained
 *    should have to remember a password. They are admitted by a token in their
 *    link, and any lawyer on emergency call may join.
 *
 * In both cases the server relays only connection details — session descriptions
 * and ICE candidates. The audio and video go directly between the two people and
 * never touch this server.
 *
 * Participants are identified by a key rather than a user id, which is what lets
 * a guest take part.
 */

const SIGNAL_TTL_MINUTES = 20;
const PRESENCE_TTL_SECONDS = 30;

export function newRoomCode(): string {
  const raw = randomBytes(6).toString('hex').toUpperCase();
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
}

export function userKey(userId: string): string {
  return `user:${userId}`;
}

export function guestKey(emergencyId: string): string {
  return `guest:${emergencyId}`;
}

export type RoomRole = 'PROFESSIONAL' | 'CLIENT';

export type RoomAccess = {
  roomKind: 'APPOINTMENT' | 'EMERGENCY';
  role: RoomRole;
  /** Identity used for signalling and presence. */
  viewerKey: string;
  otherPartyName: string;
  caseId: string | null;
  appointment: {
    id: string;
    roomCode: string;
    startsAt: Date;
    endsAt: Date;
    mode: string;
    status: string;
    /** SCHEDULED, or a call the client asked for from their case. */
    source: string;
    confirmation: string;
    officeAddress: string | null;
    note: string | null;
  } | null;
  emergency: {
    id: string;
    title: string;
    caseType: string;
    guestName: string | null;
  } | null;
};

/**
 * Whether a member may join, and as whom.
 *
 * For an appointment, only the professional on it and the client. An
 * administrator cannot join either kind of room: a conversation between a lawyer
 * and their client is exactly what an operator must not be able to sit in on.
 */
export async function resolveRoomForUser(
  roomCode: string,
  userId: string,
): Promise<RoomAccess | null> {
  const appointment = await prisma.appointment.findUnique({
    where: { roomCode },
    select: {
      id: true,
      roomCode: true,
      startsAt: true,
      endsAt: true,
      mode: true,
      status: true,
      source: true,
      confirmation: true,
      officeAddress: true,
      note: true,
      caseId: true,
      clientId: true,
      lawyer: {
        select: { userId: true, user: { select: { profile: { select: { fullName: true } } } } },
      },
      client: { select: { id: true, email: true, profile: { select: { fullName: true } } } },
      firm: { select: { userId: true, lawyers: { select: { userId: true } } } },
    },
  });

  if (appointment && appointment.status === 'BOOKED') {
    const professionalUserIds = new Set<string>([appointment.lawyer.userId]);
    if (appointment.firm) {
      professionalUserIds.add(appointment.firm.userId);
      for (const row of appointment.firm.lawyers) professionalUserIds.add(row.userId);
    }

    const isProfessional = professionalUserIds.has(userId);
    const isClient = appointment.clientId === userId;
    if (!isProfessional && !isClient) return null;

    return {
      roomKind: 'APPOINTMENT',
      role: isClient ? 'CLIENT' : 'PROFESSIONAL',
      viewerKey: userKey(userId),
      otherPartyName: isClient
        ? appointment.lawyer.user.profile?.fullName?.trim() || 'the professional'
        : appointment.client.profile?.fullName?.trim() || appointment.client.email,
      caseId: appointment.caseId,
      appointment: {
        id: appointment.id,
        roomCode: appointment.roomCode!,
        startsAt: appointment.startsAt,
        endsAt: appointment.endsAt,
        mode: appointment.mode,
        status: appointment.status,
        source: appointment.source,
        confirmation: appointment.confirmation,
        officeAddress: appointment.officeAddress,
        note: appointment.note,
      },
      emergency: null,
    };
  }

  // Emergency rooms: any lawyer on emergency call may answer.
  const emergency = await prisma.emergencyRequest.findUnique({
    where: { roomCode },
    select: {
      id: true,
      title: true,
      caseType: true,
      guestName: true,
      status: true,
      legalCaseId: true,
    },
  });
  if (!emergency) return null;
  if (['CANCELLED', 'RESOLVED', 'EXPIRED'].includes(emergency.status)) return null;

  const profile = await prisma.lawyerProfile.findUnique({
    where: { userId },
    select: { acceptsEmergency: true, isFirmEmergency: true },
  });
  if (!profile) return null;
  if (!profile.acceptsEmergency && !profile.isFirmEmergency) return null;

  return {
    roomKind: 'EMERGENCY',
    role: 'PROFESSIONAL',
    viewerKey: userKey(userId),
    otherPartyName: emergency.guestName?.trim() || 'A person needing urgent help',
    caseId: emergency.legalCaseId,
    appointment: null,
    emergency: {
      id: emergency.id,
      title: emergency.title,
      caseType: emergency.caseType,
      guestName: emergency.guestName,
    },
  };
}

/**
 * Admits the person who raised an emergency without an account.
 * The token in their link is the only credential, and it is compared as a digest.
 */
export async function resolveRoomForGuest(
  roomCode: string,
  token: string,
): Promise<RoomAccess | null> {
  if (token.trim().length === 0) return null;

  const emergency = await prisma.emergencyRequest.findUnique({
    where: { roomCode },
    select: {
      id: true,
      title: true,
      caseType: true,
      guestName: true,
      status: true,
      legalCaseId: true,
      guestTokenHash: true,
    },
  });
  if (!emergency?.guestTokenHash) return null;
  if (['CANCELLED', 'RESOLVED', 'EXPIRED'].includes(emergency.status)) return null;

  // Constant-time-ish: compare digests rather than raw values.
  if (emergency.guestTokenHash !== hashToken(token.trim())) return null;

  return {
    roomKind: 'EMERGENCY',
    role: 'CLIENT',
    viewerKey: guestKey(emergency.id),
    otherPartyName: 'The on-call lawyer',
    caseId: emergency.legalCaseId,
    appointment: null,
    emergency: {
      id: emergency.id,
      title: emergency.title,
      caseType: emergency.caseType,
      guestName: emergency.guestName,
    },
  };
}

/**
 * Records that a lawyer has answered an emergency.
 *
 * Joining the room *is* accepting: the first professional through the door is
 * recorded as the one who took it, which is what makes the public emergency
 * route "urgency, no paperwork" rather than another queue.
 */
export async function claimEmergencyOnJoin(access: RoomAccess, userId: string): Promise<void> {
  if (access.roomKind !== 'EMERGENCY' || !access.emergency) return;

  const emergency = await prisma.emergencyRequest.findUnique({
    where: { id: access.emergency.id },
    select: { acceptedById: true, acceptedAt: true, status: true },
  });
  if (!emergency || emergency.acceptedById) return;

  await prisma.emergencyRequest.update({
    where: { id: access.emergency.id },
    data: {
      acceptedById: userId,
      acceptedAt: new Date(),
      status: 'ACCEPTED',
    },
  });

  await recordAudit({
    actorUserId: userId,
    action: 'emergency.answered_in_room',
    entityType: 'emergency_request',
    entityId: access.emergency.id,
    metadata: { roomCode: access.appointment?.roomCode ?? null },
  });
}

export async function roomCodeForAppointment(appointmentId: string): Promise<string | null> {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { roomCode: true },
  });
  return appointment?.roomCode ?? null;
}

// ── Signalling ───────────────────────────────────────────────────────────────

export async function postSignal(
  roomCode: string,
  fromKey: string,
  payload: unknown,
): Promise<void> {
  await prisma.roomSignal.create({
    data: {
      roomCode,
      fromKey,
      fromUserId: fromKey.startsWith('user:') ? fromKey.slice(5) : null,
      payload: payload as Prisma.InputJsonValue,
    },
  });
}

/** Signals from the other participant since a given point. */
export async function signalsSince(roomCode: string, sinceId: string | null, viewerKey: string) {
  return prisma.roomSignal.findMany({
    where: {
      roomCode,
      fromKey: { not: viewerKey },
      ...(sinceId ? { id: { gt: sinceId } } : {}),
    },
    orderBy: { id: 'asc' },
    take: 50,
    select: { id: true, fromKey: true, payload: true },
  });
}

export async function touchPresence(roomCode: string, participantKey: string): Promise<void> {
  await prisma.roomPresence.upsert({
    where: { roomCode_participantKey: { roomCode, participantKey } },
    create: {
      roomCode,
      participantKey,
      userId: participantKey.startsWith('user:') ? participantKey.slice(5) : null,
    },
    update: { lastSeenAt: new Date() },
  });
}

export async function leaveRoom(roomCode: string, participantKey: string): Promise<void> {
  await prisma.roomPresence
    .deleteMany({ where: { roomCode, participantKey } })
    .catch(() => undefined);
}

/** Who else is in the room right now. */
export async function presentOthers(roomCode: string, viewerKey: string) {
  const cutoff = new Date(Date.now() - PRESENCE_TTL_SECONDS * 1000);
  return prisma.roomPresence.findMany({
    where: { roomCode, participantKey: { not: viewerKey }, lastSeenAt: { gte: cutoff } },
    select: { participantKey: true, joinedAt: true },
  });
}

export async function pruneRooms(): Promise<{ signals: number; presence: number }> {
  const signalCutoff = new Date(Date.now() - SIGNAL_TTL_MINUTES * 60 * 1000);
  const presenceCutoff = new Date(Date.now() - PRESENCE_TTL_SECONDS * 1000);

  const [signals, presence] = await Promise.all([
    prisma.roomSignal.deleteMany({ where: { createdAt: { lt: signalCutoff } } }),
    prisma.roomPresence.deleteMany({ where: { lastSeenAt: { lt: presenceCutoff } } }),
  ]);

  return { signals: signals.count, presence: presence.count };
}

/** The administrator's view of conference activity — meetings, never content. */
export async function roomOverview() {
  const [upcoming, recent, active] = await Promise.all([
    prisma.appointment.findMany({
      where: { mode: 'VIDEO_CALL', status: 'BOOKED', startsAt: { gte: new Date() } },
      orderBy: { startsAt: 'asc' },
      take: 25,
      select: {
        id: true,
        roomCode: true,
        startsAt: true,
        case: { select: { id: true, reference: true } },
        client: { select: { id: true, email: true, profile: { select: { fullName: true } } } },
        lawyer: { select: { user: { select: { email: true, profile: { select: { fullName: true } } } } } },
        firm: { select: { legalName: true } },
      },
    }),
    prisma.appointment.findMany({
      where: { mode: 'VIDEO_CALL' },
      orderBy: { createdAt: 'desc' },
      take: 25,
      select: {
        id: true,
        roomCode: true,
        startsAt: true,
        status: true,
        createdAt: true,
        case: { select: { reference: true } },
        client: { select: { email: true } },
        lawyer: { select: { user: { select: { email: true } } } },
      },
    }),
    prisma.roomPresence
      .findMany({ select: { roomCode: true } })
      .then((rows) => new Set(rows.map((row) => row.roomCode)).size),
  ]);

  const [signalCount, presenceCount, emergencyRooms] = await Promise.all([
    prisma.roomSignal.count(),
    prisma.roomPresence.count(),
    prisma.emergencyRequest.count({ where: { roomCode: { not: null } } }),
  ]);

  return { upcoming, recent, activeRooms: active, signalCount, presenceCount, emergencyRooms };
}

export async function recordRoomJoin(
  roomCode: string,
  userId: string,
  role: string,
): Promise<void> {
  await recordAudit({
    actorUserId: userId,
    action: 'room.joined',
    entityType: 'appointment',
    entityId: roomCode,
    metadata: { role },
  });
}

/**
 * A client's conference rooms, one row per case with a professional on it.
 *
 * This is the client's own door into a room: the case, the professional handling
 * it, and either the room already waiting or a button to ask for one. A client
 * should never have to wait for somebody else to book a meeting before they can
 * speak to their own lawyer.
 */
export async function listRoomsForClient(clientId: string) {
  const cases = await prisma.legalCase.findMany({
    where: {
      clientId,
      status: { in: ['ASSIGNED', 'IN_PROGRESS'] },
    },
    orderBy: { updatedAt: 'desc' },
    take: 50,
    select: {
      id: true,
      reference: true,
      title: true,
      status: true,
      lawyer: {
        select: {
          id: true,
          user: { select: { id: true, email: true, profile: { select: { fullName: true, avatarDocumentId: true } } } },
        },
      },
      firm: { select: { id: true, legalName: true } },
    },
  });

  if (cases.length === 0) return [];

  const rooms = await prisma.appointment.findMany({
    where: {
      caseId: { in: cases.map((row) => row.id) },
      roomCode: { not: null },
      status: 'BOOKED',
      OR: [
        // An urgent call the client asked for and is still open.
        { source: 'CASE_REQUEST', createdAt: { gte: new Date(Date.now() - 2 * 60 * 60 * 1000) } },
        // A video meeting that has not finished yet.
        { source: 'SCHEDULED', mode: 'VIDEO_CALL', endsAt: { gte: new Date(Date.now() - 30 * 60 * 1000) } },
      ],
    },
    orderBy: { startsAt: 'asc' },
    select: {
      id: true,
      caseId: true,
      roomCode: true,
      startsAt: true,
      endsAt: true,
      source: true,
      mode: true,
      lawyer: { select: { user: { select: { profile: { select: { fullName: true } } } } } },
    },
  });

  const byCase = new Map<string, typeof rooms>();
  for (const room of rooms) {
    if (!room.caseId) continue;
    const list = byCase.get(room.caseId) ?? [];
    list.push(room);
    byCase.set(room.caseId, list);
  }

  return cases.map((row) => ({
    ...row,
    rooms: byCase.get(row.id) ?? [],
  }));
}

/**
 * A professional's conference rooms: video meetings that have not finished, and
 * urgent calls their clients have asked for.
 */
export async function listRoomsForProfessional(userId: string) {
  const profile = await prisma.lawyerProfile.findUnique({
    where: { userId },
    select: { id: true, affiliatedFirmId: true },
  });
  const firm = await prisma.firmProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  const lawyerIds: string[] = [];
  if (profile) lawyerIds.push(profile.id);
  if (firm) {
    const rows = await prisma.lawyerProfile.findMany({
      where: { affiliatedFirmId: firm.id },
      select: { id: true },
      take: 50,
    });
    for (const row of rows) lawyerIds.push(row.id);
  }
  if (lawyerIds.length === 0 && !firm) return [];

  return prisma.appointment.findMany({
    where: {
      roomCode: { not: null },
      status: 'BOOKED',
      OR: [
        { lawyerId: { in: lawyerIds.length > 0 ? lawyerIds : ['__none__'] } },
        ...(firm ? [{ firmId: firm.id }] : []),
      ],
      AND: [
        {
          OR: [
            { source: 'CASE_REQUEST', createdAt: { gte: new Date(Date.now() - 2 * 60 * 60 * 1000) } },
            {
              source: 'SCHEDULED',
              mode: 'VIDEO_CALL',
              endsAt: { gte: new Date(Date.now() - 30 * 60 * 1000) },
            },
          ],
        },
      ],
    },
    orderBy: [{ source: 'desc' }, { startsAt: 'asc' }],
    take: 50,
    select: {
      id: true,
      roomCode: true,
      startsAt: true,
      endsAt: true,
      source: true,
      mode: true,
      note: true,
      case: { select: { id: true, reference: true, title: true } },
      client: {
        select: {
          id: true,
          email: true,
          profile: { select: { fullName: true, avatarDocumentId: true } },
        },
      },
      lawyer: { select: { id: true, user: { select: { profile: { select: { fullName: true } } } } } },
    },
  });
}
