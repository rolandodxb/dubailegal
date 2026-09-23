import { z } from 'zod';
import { LegalArea, Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { recordAudit } from '@/lib/audit';
import { notify, notifyMany } from './notification-service';
import { newRoomCode } from './room-service';
import { generateToken, hashToken } from '@/lib/tokens';
import { consumeRateLimit } from '@/lib/rate-limit';
import { generateCaseReference } from './case-service';
import { fromZodError, failure, success, type ServiceResult } from './result';

/**
 * Emergency representation.
 *
 * A client raises an urgent request; it reaches the professionals who have said
 * they take emergencies. Raising one does **not** open a case: a case is only
 * created when somebody accepts, which keeps the emergency queue free of
 * abandoned entries and leaves the case history honest about when work began.
 *
 * Who is told, in order:
 *   · lawyers who have turned emergency availability on;
 *   · lawyers their firm has designated as its always-active emergency contact;
 *   · the owners of those firms, so a firm knows its contact was pinged;
 *   · and if that adds up to nobody — which would mean an urgent request silently
 *     going nowhere — every registered lawyer and firm instead.
 *
 * Every professional can also see the open emergency queue regardless.
 */

const HOURS_VALID = 24;

export const emergencySchema = z.object({
  title: z
    .string()
    .trim()
    .min(4, 'Give the emergency a short name of at least 4 characters.')
    .max(160),
  caseType: z.nativeEnum(LegalArea, {
    errorMap: () => ({ message: 'Choose the area of law.' }),
  }),
  description: z
    .string()
    .trim()
    .min(30, 'Describe what has happened in at least 30 characters.')
    .max(4000),
  contactPhone: z
    .string()
    .trim()
    .min(7, 'Give a number a lawyer can call you back on.')
    .max(25)
    .regex(/^\+?[\d\s()-]{7,25}$/, 'Enter a valid phone number.'),
});

async function emergencyRecipients(): Promise<{ userIds: string[]; optedIn: number }> {
  const [available, designated] = await Promise.all([
    prisma.lawyerProfile.findMany({
      where: { acceptsEmergency: true, user: { status: 'ACTIVE' } },
      select: { userId: true },
    }),
    prisma.lawyerProfile.findMany({
      where: { isFirmEmergency: true, affiliatedFirmId: { not: null }, user: { status: 'ACTIVE' } },
      select: { userId: true, affiliatedFirmId: true },
    }),
  ]);

  const ids = new Set<string>();
  for (const row of available) ids.add(row.userId);
  for (const row of designated) ids.add(row.userId);

  // Tell the firms whose own emergency contact has been pinged.
  const firmIds = designated
    .map((row) => row.affiliatedFirmId)
    .filter((id): id is string => id !== null);
  if (firmIds.length > 0) {
    const firms = await prisma.firmProfile.findMany({
      where: { id: { in: firmIds }, user: { status: 'ACTIVE' } },
      select: { userId: true },
    });
    for (const firm of firms) ids.add(firm.userId);
  }

  const optedIn = ids.size;

  // Nobody available would mean an emergency going nowhere, so fall back to
  // everyone rather than dropping it.
  if (ids.size === 0) {
    const [lawyers, firms] = await Promise.all([
      prisma.lawyerProfile.findMany({ where: { user: { status: 'ACTIVE' } }, select: { userId: true } }),
      prisma.firmProfile.findMany({ where: { user: { status: 'ACTIVE' } }, select: { userId: true } }),
    ]);
    for (const row of lawyers) ids.add(row.userId);
    for (const row of firms) ids.add(row.userId);
  }

  return { userIds: Array.from(ids), optedIn };
}

export async function raiseEmergency(
  clientId: string,
  rawInput: unknown,
  meta: { ip?: string | null } = {},
): Promise<
  ServiceResult<{ emergencyId: string; roomCode: string | null; notified: number; optedIn: number }>
> {
  const parsed = emergencySchema.safeParse(rawInput);
  if (!parsed.success) return fromZodError(parsed.error);

  const open = await prisma.emergencyRequest.count({
    where: { clientId, status: 'OPEN' },
  });
  if (open >= 3) {
    return failure(
      'You already have three open emergency requests. Cancel one before raising another.',
      { status: 429 },
    );
  }

  const expiresAt = new Date(Date.now() + HOURS_VALID * 60 * 60 * 1000);

  const request = await prisma.emergencyRequest.create({
    data: {
      clientId,
      title: parsed.data.title,
      caseType: parsed.data.caseType,
      description: parsed.data.description,
      contactPhone: parsed.data.contactPhone,
      status: 'OPEN',
      expiresAt,
      // A room is opened with the request, exactly as it is for somebody without
      // an account. Without it there was nowhere for either side to go: the
      // member waited on a call that had no room, and the professional who
      // answered was sent to the case instead — which is why the two never met.
      roomCode: newRoomCode(),
    },
    select: { id: true, roomCode: true },
  });

  const client = await prisma.user.findUnique({
    where: { id: clientId },
    select: { email: true, profile: { select: { fullName: true } } },
  });
  const clientName = client?.profile?.fullName?.trim() || client?.email || 'A client';

  const { userIds, optedIn } = await emergencyRecipients();
  await notifyMany(userIds, {
    kind: 'emergency.raised',
    title: `Urgent: ${parsed.data.title}`,
    body: `${clientName} needs urgent representation. Call-back number ${parsed.data.contactPhone}. Open the emergency queue to take it.`,
    link: '/emergency',
  });

  await recordAudit({
    actorUserId: clientId,
    action: 'emergency.raised',
    entityType: 'emergency_request',
    entityId: request.id,
    metadata: { caseType: parsed.data.caseType, notified: userIds.length, optedIn },
    ip: meta.ip ?? null,
  });

  return success({
    emergencyId: request.id,
    // The room is opened with the request, so the member has somewhere to wait
    // and the link can be handed out before anybody answers.
    roomCode: request.roomCode,
    notified: userIds.length,
    optedIn,
  });
}

/** Open requests, newest first, for the professional queue. */
export async function listOpenEmergencies() {
  await expireStaleEmergencies();

  return prisma.emergencyRequest.findMany({
    where: { status: 'OPEN' },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      caseType: true,
      description: true,
      contactPhone: true,
      status: true,
      createdAt: true,
      expiresAt: true,
      roomCode: true,
      guestName: true,
      guestPhone: true,
      guestEmail: true,
      clientId: true,
      client: {
        select: {
          id: true,
          email: true,
          accountType: true,
          verificationStatus: true,
          profile: {
            select: {
              fullName: true,
              avatarDocumentId: true,
              countryOfResidence: true,
              countryOfResidenceCode: true,
            },
          },
        },
      },
    },
  });
}

export async function listMyEmergencies(clientId: string) {
  await expireStaleEmergencies();

  return prisma.emergencyRequest.findMany({
    where: { clientId },
    orderBy: { createdAt: 'desc' },
    include: {
      acceptedBy: { select: { id: true, email: true, profile: { select: { fullName: true } } } },
      legalCase: { select: { id: true, reference: true, title: true, status: true } },
    },
  });
}

/** Requests this professional took. */
export async function listTakenEmergencies(userId: string) {
  return prisma.emergencyRequest.findMany({
    where: { acceptedById: userId },
    orderBy: { acceptedAt: 'desc' },
    select: {
      id: true,
      title: true,
      caseType: true,
      status: true,
      acceptedAt: true,
      guestName: true,
      roomCode: true,
      client: { select: { id: true, email: true, profile: { select: { fullName: true } } } },
      legalCase: { select: { id: true, reference: true, status: true } },
    },
  });
}

/** An open request that nobody picked up inside its window is closed. */
export async function expireStaleEmergencies(): Promise<number> {
  const result = await prisma.emergencyRequest.updateMany({
    where: { status: 'OPEN', expiresAt: { lt: new Date() } },
    data: { status: 'EXPIRED' },
  });
  return result.count;
}

/**
 * Takes an urgent request.
 *
 * A lawyer is assigned the case directly. A firm gets the case addressed to it
 * and, if it has designated an emergency lawyer, assigned to them immediately —
 * an emergency is no place for a queue.
 */
export async function acceptEmergency(
  requestId: string,
  actorUserId: string,
  meta: { ip?: string | null } = {},
): Promise<
  ServiceResult<{ caseId: string | null; reference: string | null; roomCode: string | null }>
> {
  await expireStaleEmergencies();

  const request = await prisma.emergencyRequest.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      status: true,
      clientId: true,
      title: true,
      caseType: true,
      description: true,
      expiresAt: true,
      roomCode: true,
    },
  });
  if (!request) return failure('That emergency request no longer exists.', { status: 404 });
  if (request.status !== 'OPEN') return failure('That request has already been taken or has expired.');
  if (request.clientId === actorUserId) return failure('You cannot take your own request.');

  // Somebody who raised this without an account has no case history to add to.
  // Their help happens in the room; a case is opened only if they later register.
  if (request.clientId === null) {
    await prisma.emergencyRequest.update({
      where: { id: requestId },
      data: { status: 'ACCEPTED', acceptedById: actorUserId, acceptedAt: new Date() },
    });

    await recordAudit({
      actorUserId,
      action: 'emergency.accepted_guest',
      entityType: 'emergency_request',
      entityId: requestId,
      metadata: { guest: true },
      ip: meta.ip ?? null,
    });

    return success({ caseId: null, reference: null, roomCode: request.roomCode });
  }

  const lawyer = await prisma.lawyerProfile.findUnique({
    where: { userId: actorUserId },
    select: { id: true, affiliatedFirmId: true },
  });
  const firm = await prisma.firmProfile.findUnique({
    where: { userId: actorUserId },
    select: { id: true, legalName: true },
  });
  if (!lawyer && !firm) {
    return failure('Only a registered lawyer or legal firm can take an emergency request.', { status: 403 });
  }

  // A firm's designated emergency lawyer takes it on the firm's behalf.
  let assignedLawyerId = lawyer?.id ?? null;
  let firmId = lawyer?.affiliatedFirmId ?? firm?.id ?? null;
  if (!lawyer && firm) {
    const designated = await prisma.lawyerProfile.findFirst({
      where: { affiliatedFirmId: firm.id, isFirmEmergency: true },
      select: { id: true },
    });
    assignedLawyerId = designated?.id ?? null;
  }

  const reference = await generateCaseReference();
  const clientIdForCase = request.clientId;

  const created = await prisma.$transaction(async (tx) => {
    const legalCase = await tx.legalCase.create({
      data: {
        reference,
        title: request.title,
        caseType: request.caseType,
        description: request.description,
        // Accepted straight away, so the case starts life assigned. A guest
        // request never reaches here — it is handled above, because there is no
        // account to hang a case on.
        status: 'ASSIGNED',
        clientId: clientIdForCase,
        lawyerId: assignedLawyerId,
        firmId: assignedLawyerId ? firmId : firmId,
        submittedAt: new Date(),
        assignedAt: new Date(),
        actionedByUserId: actorUserId,
        events: {
          create: [
            {
              toStatus: 'SUBMITTED',
              actorId: request.clientId,
              note: 'Opened from an emergency request.',
            },
            {
              fromStatus: 'SUBMITTED',
              toStatus: 'ASSIGNED',
              actorId: actorUserId,
              note: 'Taken from the emergency queue.',
            },
          ],
        },
      },
      select: { id: true, reference: true },
    });

    await tx.emergencyRequest.update({
      where: { id: request.id },
      data: {
        status: 'ACCEPTED',
        acceptedById: actorUserId,
        acceptedAt: new Date(),
        legalCaseId: legalCase.id,
      },
    });

    return legalCase;
  });

  const actor = await prisma.user.findUnique({
    where: { id: actorUserId },
    select: { email: true, profile: { select: { fullName: true } } },
  });
  const actorName = actor?.profile?.fullName?.trim() || actor?.email || 'A professional';

  await notify({
    userId: request.clientId!,
    kind: 'emergency.accepted',
    title: `${actorName} has taken your urgent request`,
    body: `Case ${created.reference} has been opened and assigned. Join the video room — they are waiting there now.`,
    link: `/emergency/room/${request.roomCode}`,
  });

  await recordAudit({
    actorUserId,
    action: 'emergency.accepted',
    entityType: 'emergency_request',
    entityId: request.id,
    metadata: { caseId: created.id, reference: created.reference, assignedLawyerId, firmId },
    ip: meta.ip ?? null,
  });

  return success({ caseId: created.id, reference: created.reference, roomCode: request.roomCode });
}

export async function cancelEmergency(
  requestId: string,
  clientId: string,
): Promise<ServiceResult> {
  const request = await prisma.emergencyRequest.findUnique({
    where: { id: requestId },
    select: { id: true, clientId: true, status: true },
  });
  if (!request) return failure('That emergency request no longer exists.', { status: 404 });
  if (request.clientId !== clientId) return failure('That request is not yours.', { status: 403 });
  if (['CANCELLED', 'RESOLVED', 'EXPIRED'].includes(request.status)) {
    return failure('That request has already been closed.');
  }

  await prisma.emergencyRequest.update({
    where: { id: requestId },
    data: { status: 'CANCELLED' },
  });

  await recordAudit({
    actorUserId: clientId,
    action: 'emergency.cancelled',
    entityType: 'emergency_request',
    entityId: requestId,
  });

  return success();
}

// ── Availability ─────────────────────────────────────────────────────────────

export async function setEmergencyAvailability(
  lawyerUserId: string,
  accepts: boolean,
  note: string | null,
): Promise<ServiceResult> {
  const profile = await prisma.lawyerProfile.findUnique({
    where: { userId: lawyerUserId },
    select: { id: true },
  });
  if (!profile) return failure('Only a lawyer can set emergency availability.', { status: 403 });

  await prisma.lawyerProfile.update({
    where: { id: profile.id },
    data: { acceptsEmergency: accepts, emergencyNote: note?.trim() || null },
  });

  await recordAudit({
    actorUserId: lawyerUserId,
    action: accepts ? 'emergency.availability_on' : 'emergency.availability_off',
    entityType: 'lawyer_profile',
    entityId: profile.id,
  });

  return success();
}

/** A firm names one of its lawyers as its always-active emergency contact. */
export async function setFirmEmergencyLawyer(
  firmUserId: string,
  lawyerProfileId: string,
  active: boolean,
): Promise<ServiceResult> {
  const firm = await prisma.firmProfile.findUnique({
    where: { userId: firmUserId },
    select: { id: true, legalName: true },
  });
  if (!firm) return failure('Only a legal-firm account can do this.', { status: 403 });

  const lawyer = await prisma.lawyerProfile.findFirst({
    where: { id: lawyerProfileId, affiliatedFirmId: firm.id },
    select: { id: true, userId: true, user: { select: { profile: { select: { fullName: true } } } } },
  });
  if (!lawyer) return failure('That lawyer is not registered with your firm.', { status: 404 });

  await prisma.$transaction(async (tx) => {
    if (active) {
      // One designated contact at a time, so it is always clear who is on call.
      await tx.lawyerProfile.updateMany({
        where: { affiliatedFirmId: firm.id, isFirmEmergency: true, id: { not: lawyer.id } },
        data: { isFirmEmergency: false },
      });
    }
    await tx.lawyerProfile.update({
      where: { id: lawyer.id },
      data: { isFirmEmergency: active },
    });
  });

  await notify({
    userId: lawyer.userId,
    kind: 'emergency.designated',
    title: active
      ? `You are ${firm.legalName}'s emergency contact`
      : `You are no longer ${firm.legalName}'s emergency contact`,
    body: active
      ? 'Urgent requests that reach the firm are assigned to you directly.'
      : 'Urgent requests for the firm will no longer be assigned to you automatically.',
    link: '/emergency',
  });

  await recordAudit({
    actorUserId: firmUserId,
    action: active ? 'emergency.lawyer_designated' : 'emergency.lawyer_undesignated',
    entityType: 'lawyer_profile',
    entityId: lawyerProfileId,
    metadata: { firmId: firm.id },
  });

  return success();
}

/** The emergency picture on the professional's own page. */
export async function emergencyStanding(userId: string) {
  const lawyer = await prisma.lawyerProfile.findUnique({
    where: { userId },
    select: {
      id: true,
      acceptsEmergency: true,
      emergencyNote: true,
      isFirmEmergency: true,
      affiliatedFirm: { select: { legalName: true } },
    },
  });
  const firm = await prisma.firmProfile.findUnique({
    where: { userId },
    select: {
      id: true,
      legalName: true,
      lawyers: {
        where: { isFirmEmergency: true },
        select: { id: true, user: { select: { email: true, profile: { select: { fullName: true } } } } },
      },
    },
  });

  return { lawyer, firm };
}


// ── Emergency without an account ─────────────────────────────────────────────

export const guestEmergencySchema = z.object({
  guestName: z.string().trim().min(2, 'Tell us your name.').max(120),
  guestPhone: z
    .string()
    .trim()
    .min(7, 'Give a number a lawyer can call you on.')
    .max(25)
    .regex(/^\+?[\d\s()-]{7,25}$/, 'Enter a valid phone number.'),
  caseType: z.nativeEnum(LegalArea, {
    errorMap: () => ({ message: 'Choose the area of law.' }),
  }),
  description: z
    .string()
    .trim()
    .min(10, 'Describe in a few words what is happening.')
    .max(2000),
  guestEmail: z
    .string()
    .trim()
    .max(254)
    .optional()
    .nullable()
    .transform((value) => (value && value.length > 0 ? value.toLowerCase() : null))
    .refine(
      (value) => value === null || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value),
      'Enter a valid email address.',
    ),
});

/**
 * Raises an emergency with no account and opens a video room immediately.
 *
 * This is the whole point of the public route: somebody being detained should not
 * have to remember an email and a password. They give a name and a number, and
 * the next thing they see is a room with a lawyer's arrival in it. The link they
 * hold contains a token that is the only thing admitting them, and any lawyer on
 * emergency call may join — the first to arrive is recorded as having answered.
 */
export async function raiseGuestEmergency(
  rawInput: unknown,
  meta: { ip?: string | null } = {},
): Promise<
  ServiceResult<{ emergencyId: string; roomCode: string; guestToken: string; notified: number }>
> {
  const parsed = guestEmergencySchema.safeParse(rawInput);
  if (!parsed.success) return fromZodError(parsed.error);

  const limit = consumeRateLimit(`emergency:${meta.ip ?? 'unknown'}`, 5, 60 * 60);
  if (!limit.allowed) {
    return failure(
      'Too many emergency requests from this connection. If you are in danger, call 999.',
      { status: 429 },
    );
  }

  const roomCode = newRoomCode();
  const guestToken = generateToken();

  const request = await prisma.emergencyRequest.create({
    data: {
      title: parsed.data.description.slice(0, 80),
      caseType: parsed.data.caseType,
      description: parsed.data.description,
      contactPhone: parsed.data.guestPhone,
      guestName: parsed.data.guestName,
      guestPhone: parsed.data.guestPhone,
      guestEmail: parsed.data.guestEmail,
      roomCode,
      guestTokenHash: hashToken(guestToken),
      status: 'OPEN',
      // Shorter than an account request: an unanswered emergency room should not
      // linger open for a day.
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
    },
    select: { id: true },
  });

  const { userIds } = await emergencyRecipients();
  await notifyMany(userIds, {
    kind: 'emergency.public',
    title: `Urgent: ${parsed.data.guestName} needs help now`,
    body: `${parsed.data.description.slice(0, 140)} — call-back ${parsed.data.guestPhone}. Join the room to take it.`,
    link: `/emergency/room/${roomCode}`,
  });

  await recordAudit({
    action: 'emergency.raised_public',
    entityType: 'emergency_request',
    entityId: request.id,
    metadata: { caseType: parsed.data.caseType, notified: userIds.length, roomCode },
    ip: meta.ip ?? null,
  });

  return success({
    emergencyId: request.id,
    roomCode,
    guestToken,
    notified: userIds.length,
  });
}

/** The guest's own view of their emergency room, admitted by token. */
export async function guestEmergencyByRoom(roomCode: string) {
  return prisma.emergencyRequest.findUnique({
    where: { roomCode },
    select: {
      id: true,
      title: true,
      caseType: true,
      description: true,
      guestName: true,
      guestPhone: true,
      status: true,
      createdAt: true,
      expiresAt: true,
      acceptedAt: true,
      acceptedBy: {
        select: { id: true, email: true, profile: { select: { fullName: true } } },
      },
    },
  });
}

/**
 * The caller withdraws an urgent request from inside the room.
 *
 * A call made by mistake — the wrong button, the wrong number, a false alarm —
 * has to be cancellable by the person who made it, and immediately: a room that
 * stays open keeps ringing lawyers who are no longer wanted. The guest token in
 * their link is the credential, exactly as it is for joining.
 */
export async function cancelGuestEmergency(
  roomCode: string,
  token: string,
): Promise<ServiceResult<{ alreadyClosed: boolean }>> {
  if (token.trim().length === 0) return failure('That link is not valid.', { status: 403 });

  const request = await prisma.emergencyRequest.findUnique({
    where: { roomCode },
    select: {
      id: true,
      title: true,
      status: true,
      guestTokenHash: true,
      clientId: true,
      acceptedById: true,
    },
  });
  if (!request?.guestTokenHash) return failure('That request no longer exists.', { status: 404 });
  if (request.guestTokenHash !== hashToken(token.trim())) {
    return failure('That link is not valid.', { status: 403 });
  }

  if (request.status === 'CANCELLED' || request.status === 'RESOLVED' || request.status === 'EXPIRED') {
    return success({ alreadyClosed: true });
  }

  await prisma.emergencyRequest.update({
    where: { id: request.id },
    data: { status: 'CANCELLED' },
  });

  // Whoever was answering, or waiting to, is told the room is closed.
  const recipients = [request.acceptedById, request.clientId].filter(
    (value): value is string => Boolean(value),
  );
  if (recipients.length > 0) {
    await notifyMany(recipients, {
      kind: 'emergency.cancelled_by_caller',
      title: 'The urgent call was cancelled',
      body: `“${request.title}” was withdrawn by the person who raised it. Nothing is owed for it.`,
      link: '/emergency/desk',
    });
  }

  await recordAudit({
    actorUserId: request.clientId,
    action: 'emergency.cancelled',
    entityType: 'emergency_request',
    entityId: request.id,
    metadata: { byCaller: true, fromRoom: true },
  });

  return success({ alreadyClosed: false });
}

/**
 * The professional ends a call they answered.
 *
 * Closing it is not the same as the caller withdrawing: this says the matter was
 * dealt with, which is what the professional knows and the caller may not.
 */
export async function closeEmergencyAsProfessional(
  requestId: string,
  actorUserId: string,
): Promise<ServiceResult> {
  const request = await prisma.emergencyRequest.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      title: true,
      status: true,
      clientId: true,
      acceptedById: true,
      legalCaseId: true,
    },
  });
  if (!request) return failure('That urgent request no longer exists.', { status: 404 });

  const canClose =
    request.acceptedById === actorUserId ||
    (await prisma.firmProfile.count({
      where: {
        userId: actorUserId,
        lawyers: { some: { userId: request.acceptedById ?? undefined } },
      },
    })) > 0;
  if (!canClose) {
    return failure('Only the professional who answered it can close it.', { status: 403 });
  }

  if (request.status === 'RESOLVED') return success();
  if (request.status === 'CANCELLED' || request.status === 'EXPIRED') {
    return failure('That request is already closed.');
  }

  await prisma.emergencyRequest.update({ where: { id: request.id }, data: { status: 'RESOLVED' } });

  if (request.clientId) {
    await notify({
      userId: request.clientId,
      kind: 'emergency.resolved',
      title: 'Your urgent call was closed',
      body: `“${request.title}” was marked as dealt with by the lawyer who answered. If you need to speak again, raise a new request — it is not held against you.`,
      link: '/emergency',
    });
  }

  await recordAudit({
    actorUserId,
    action: 'emergency.resolved',
    entityType: 'emergency_request',
    entityId: request.id,
    metadata: { legalCaseId: request.legalCaseId },
  });

  return success();
}
