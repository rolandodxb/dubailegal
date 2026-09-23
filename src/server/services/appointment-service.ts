import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { recordAudit } from '@/lib/audit';
import { SLOT_MINUTES, WORKING_HOURS } from '@/lib/constants';
import { BOOKABLE_HOURS } from '@/lib/appointment-slots';
import { fromUaeDateTime, toUaeHour } from '@/lib/time';
import { notify } from './notification-service';
import { newRoomCode } from './room-service';
import { fromZodError, failure, success, type ServiceResult } from './result';

/**
 * The professional's diary.
 *
 * Bookable slots are generated from WORKING_HOURS and filtered against what is
 * already in the diary, so a slot offered by the UI is genuinely free. The
 * unique constraint on (lawyerId, startsAt) is the real guard: two people
 * booking the same slot at the same moment means one of them gets a clear
 * error rather than a double booking.
 */

const bookSchema = z.object({
  lawyerProfileId: z.string().min(1, 'Choose the lawyer whose diary to book into.'),
  clientId: z.string().min(1, 'Choose the client this meeting is with.'),
  dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a valid date.'),
  hour: z.coerce
    .number()
    .int()
    .min(WORKING_HOURS.startHour, 'Choose an available time.')
    .max(WORKING_HOURS.endHour - 1, 'Choose an available time.'),
  caseId: z.string().optional().nullable(),
  note: z.string().trim().max(1000).optional().nullable(),
  mode: z
    .enum(['VIDEO_CALL', 'OFFICE_VISIT', 'PHONE_CALL'], {
      errorMap: () => ({ message: 'Choose how the meeting will happen.' }),
    })
    .default('OFFICE_VISIT'),
  officeAddress: z
    .string()
    .trim()
    .max(300)
    .optional()
    .nullable()
    .transform((value) => (value && value.length > 0 ? value : null)),
});

export type DaySlot = {
  hour: number;
  label: string;
  startsAt: Date;
  endsAt: Date;
  taken: boolean;
  /** Present when the slot is booked, so the diary can show who with. */
  appointment?: {
    id: string;
    clientName: string;
    caseReference: string | null;
    status: string;
  };
};

export { BOOKABLE_HOURS } from '@/lib/appointment-slots';

/**
 * The slots for one UAE calendar day, with the ones already taken marked.
 * Only this lawyer's own diary is considered.
 */
export async function listDaySlots(lawyerProfileId: string, dateKey: string): Promise<DaySlot[]> {
  const dayStart = fromUaeDateTime(dateKey, 0);
  const dayEnd = fromUaeDateTime(dateKey, 23, 59);

  const booked = await prisma.appointment.findMany({
    where: {
      lawyerId: lawyerProfileId,
      status: 'BOOKED',
      // An urgent call raised by a client is a room, not a diary entry.
      source: 'SCHEDULED',
      startsAt: { gte: dayStart, lte: dayEnd },
    },
    include: {
      client: { select: { email: true, profile: { select: { fullName: true } } } },
      case: { select: { reference: true } },
    },
  });

  // Keyed by the UAE wall-clock hour, which is what the grid shows.
  const byHour = new Map(booked.map((item) => [toUaeHour(item.startsAt), item]));

  return BOOKABLE_HOURS.map((hour) => {
    const startsAt = fromUaeDateTime(dateKey, hour);
    const endsAt = new Date(startsAt.getTime() + SLOT_MINUTES * 60 * 1000);
    const match = byHour.get(hour);
    return {
      hour,
      label: `${String(hour).padStart(2, '0')}:00`,
      startsAt,
      endsAt,
      taken: Boolean(match),
      appointment: match
        ? {
            id: match.id,
            clientName: match.client.profile?.fullName?.trim() || match.client.email,
            caseReference: match.case?.reference ?? null,
            status: match.status,
          }
        : undefined,
    };
  });
}

/** Appointments in a date range, for the month and week grids. */
export async function listAppointmentsInRange(
  lawyerIds: string | string[],
  fromKey: string,
  toKey: string,
) {
  const ids = (Array.isArray(lawyerIds) ? lawyerIds : [lawyerIds]).filter(Boolean);
  if (ids.length === 0) return [];

  const from = fromUaeDateTime(fromKey, 0);
  const to = fromUaeDateTime(toKey, 23, 59);

  return prisma.appointment.findMany({
    where: {
      lawyerId: { in: ids },
      // Diary entries only: an urgent call from a case is not a booked slot.
      source: 'SCHEDULED',
      startsAt: { gte: from, lte: to },
    },
    orderBy: { startsAt: 'asc' },
    include: {
      client: { select: { id: true, email: true, profile: { select: { fullName: true } } } },
      case: { select: { id: true, reference: true, title: true } },
      lawyer: { select: { id: true, user: { select: { profile: { select: { fullName: true } } } } } },
    },
  });
}

/**
 * Whose diary this account may look at.
 *
 * A lawyer sees their own. A firm sees every diary held by the lawyers
 * registered with it — that is what running the practice means — but only its
 * own lawyers, never anybody else's.
 */
export async function diaryScope(userId: string): Promise<{
  lawyerProfileId: string | null;
  lawyerIds: string[];
  isFirm: boolean;
  firmId: string | null;
}> {
  const account = await prisma.user.findUnique({
    where: { id: userId },
    select: { accountType: true, lawyerProfile: { select: { id: true } }, firmProfile: { select: { id: true } } },
  });
  if (!account) return { lawyerProfileId: null, lawyerIds: [], isFirm: false, firmId: null };

  if (account.firmProfile) {
    const lawyers = await prisma.lawyerProfile.findMany({
      where: { affiliatedFirmId: account.firmProfile.id },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
      take: 50,
    });
    const lawyerIds = lawyers.map((row) => row.id);
    if (account.lawyerProfile) lawyerIds.unshift(account.lawyerProfile.id);
    return {
      lawyerProfileId: account.lawyerProfile?.id ?? null,
      lawyerIds: Array.from(new Set(lawyerIds)),
      isFirm: true,
      firmId: account.firmProfile.id,
    };
  }

  const own = account.lawyerProfile?.id ?? null;
  return {
    lawyerProfileId: own,
    lawyerIds: own ? [own] : [],
    isFirm: false,
    firmId: null,
  };
}

/** The lawyers whose diaries a firm may act on, for naming an appointment. */
export async function listFirmDiaries(firmId: string) {
  return prisma.lawyerProfile.findMany({
    where: { affiliatedFirmId: firmId },
    orderBy: { createdAt: 'asc' },
    take: 50,
    select: {
      id: true,
      user: { select: { id: true, email: true, profile: { select: { fullName: true } } } },
    },
  });
}

/** The clients a professional may book a meeting with: those with a live case. */
export async function listBookableClients(lawyerUserId: string) {
  const profile = await prisma.lawyerProfile.findUnique({
    where: { userId: lawyerUserId },
    select: { id: true, affiliatedFirmId: true },
  });
  if (!profile) return { lawyerProfileId: null, clients: [] };

  const or: Prisma.LegalCaseWhereInput[] = [{ lawyerId: profile.id }];
  if (profile.affiliatedFirmId) or.push({ firmId: profile.affiliatedFirmId, lawyerId: profile.id });

  const cases = await prisma.legalCase.findMany({
    where: {
      AND: [
        { OR: or },
        { status: { in: ['ASSIGNED', 'IN_PROGRESS', 'COMPLETED'] } },
      ],
    },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      reference: true,
      title: true,
      client: { select: { id: true, email: true, profile: { select: { fullName: true } } } },
    },
  });

  const byClient = new Map<
    string,
    { id: string; name: string; email: string; cases: { id: string; reference: string; title: string }[] }
  >();
  for (const item of cases) {
    const entry = byClient.get(item.client.id) ?? {
      id: item.client.id,
      name: item.client.profile?.fullName?.trim() || item.client.email,
      email: item.client.email,
      cases: [],
    };
    entry.cases.push({ id: item.id, reference: item.reference, title: item.title });
    byClient.set(item.client.id, entry);
  }

  return { lawyerProfileId: profile.id, clients: Array.from(byClient.values()) };
}

/**
 * Books a meeting and alerts the client.
 *
 * The booking lawyer is always the signed-in lawyer: a professional books into
 * their own diary, never someone else's.
 */
export async function bookAppointment(
  actorUserId: string,
  rawInput: unknown,
  meta: { ip?: string | null } = {},
): Promise<ServiceResult<{ appointmentId: string; roomCode: string | null }>> {
  const parsed = bookSchema.safeParse(rawInput);
  if (!parsed.success) return fromZodError(parsed.error);

  const actorProfile = await prisma.lawyerProfile.findUnique({
    where: { userId: actorUserId },
    select: { id: true, affiliatedFirmId: true, user: { select: { profile: { select: { fullName: true } } } } },
  });
  if (!actorProfile) {
    return failure('Only a registered lawyer has a diary to book into.', { status: 403 });
  }
  if (actorProfile.id !== parsed.data.lawyerProfileId) {
    return failure('You can only book meetings into your own diary.', { status: 403 });
  }

  // The client must actually be one of this lawyer's clients.
  const { clients } = await listBookableClients(actorUserId);
  const client = clients.find((entry) => entry.id === parsed.data.clientId);
  if (!client) {
    return failure('Choose a client who has an accepted case with you.', {
      fieldErrors: { clientId: 'That person is not one of your clients yet.' },
    });
  }

  const startsAt = fromUaeDateTime(parsed.data.dateKey, parsed.data.hour);
  const endsAt = new Date(startsAt.getTime() + SLOT_MINUTES * 60 * 1000);

  if (startsAt.getTime() < Date.now()) {
    return failure('Choose a time in the future.', { fieldErrors: { hour: 'That time has passed.' } });
  }

  // Checked here so the common case gets a clear message. The partial unique
  // index in the database is what actually holds under a race.
  const clash = await prisma.appointment.findFirst({
    where: { lawyerId: actorProfile.id, startsAt, status: 'BOOKED' },
    select: { id: true },
  });
  if (clash) {
    return failure('That time is already booked. Choose another slot.', {
      fieldErrors: { hour: 'No longer available.' },
    });
  }

  const caseId =
    parsed.data.caseId && client.cases.some((item) => item.id === parsed.data.caseId)
      ? parsed.data.caseId
      : (client.cases[0]?.id ?? null);

  // An office visit needs somewhere to come to, and the client has to agree to
  // travel — so it is raised as a request rather than booked outright.
  if (parsed.data.mode === 'OFFICE_VISIT' && !parsed.data.officeAddress) {
    return failure('Give the address the client should come to.', {
      fieldErrors: { officeAddress: 'An office visit needs an address.' },
    });
  }

  // A video call gets its own conference room.
  const roomCode = parsed.data.mode === 'VIDEO_CALL' ? newRoomCode() : null;
  const confirmation = parsed.data.mode === 'OFFICE_VISIT' ? 'PENDING' : 'NOT_REQUIRED';

  try {
    const appointment = await prisma.appointment.create({
      data: {
        lawyerId: actorProfile.id,
        firmId: actorProfile.affiliatedFirmId,
        clientId: parsed.data.clientId,
        caseId,
        startsAt,
        endsAt,
        status: 'BOOKED',
        note: parsed.data.note?.trim() || null,
        createdById: actorUserId,
        mode: parsed.data.mode,
        officeAddress: parsed.data.mode === 'OFFICE_VISIT' ? parsed.data.officeAddress : null,
        roomCode,
        confirmation,
      },
      select: { id: true },
    });

    const lawyerName = actorProfile.user.profile?.fullName?.trim() || 'Your lawyer';
    const caseLabel = caseId
      ? ` about case ${client.cases.find((c) => c.id === caseId)?.reference ?? ''}`
      : '';

    if (parsed.data.mode === 'OFFICE_VISIT') {
      await notify({
        userId: parsed.data.clientId,
        kind: 'appointment.office_requested',
        title: `You are asked to attend the office on {{${startsAt.toISOString()}}}`,
        body: `${lawyerName} has asked you to come to ${parsed.data.officeAddress}${caseLabel}. Accept or decline this from My cases.`,
        link: '/cases',
      });
    } else {
      await notify({
        userId: parsed.data.clientId,
        kind: 'appointment.booked',
        title: `Meeting booked for {{${startsAt.toISOString()}}}`,
        body:
          parsed.data.mode === 'VIDEO_CALL'
            ? `${lawyerName} has scheduled a video call with you${caseLabel}. Open My cases to join the conference room.`
            : `${lawyerName} has scheduled a phone call with you${caseLabel}.`,
        link: '/cases',
      });
    }

    await recordAudit({
      actorUserId,
      action: 'appointment.booked',
      entityType: 'appointment',
      entityId: appointment.id,
      metadata: { startsAt: startsAt.toISOString(), clientId: parsed.data.clientId, caseId },
      ip: meta.ip ?? null,
    });

    return success({ appointmentId: appointment.id, roomCode });
  } catch (error) {
    // The partial unique index on BOOKED rows is what actually prevents a double
    // booking when two requests race between the check above and this insert.
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      return failure('That time has just been booked. Choose another slot.', {
        fieldErrors: { hour: 'No longer available.' },
      });
    }
    console.error('[appointments] booking failed', error);
    return failure('The meeting could not be booked. Please try again.', { status: 500 });
  }
}

/**
 * The client accepts or declines being asked to come to the office.
 *
 * Declining does not cancel the meeting — it tells the professional the client
 * will not travel, so they can rearrange it themselves.
 */
export async function respondToOfficeRequest(
  appointmentId: string,
  clientId: string,
  accept: boolean,
): Promise<ServiceResult> {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      id: true,
      clientId: true,
      confirmation: true,
      status: true,
      startsAt: true,
      officeAddress: true,
      lawyer: {
        select: {
          userId: true,
          user: { select: { profile: { select: { fullName: true } } } },
        },
      },
      firm: { select: { userId: true, legalName: true } },
      case: { select: { reference: true } },
    },
  });
  if (!appointment) return failure('That meeting no longer exists.', { status: 404 });
  if (appointment.clientId !== clientId) {
    return failure('That request is not addressed to you.', { status: 403 });
  }
  if (appointment.confirmation !== 'PENDING') {
    return failure('That request has already been answered.');
  }
  if (appointment.status !== 'BOOKED') {
    return failure('That meeting is no longer scheduled.');
  }

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      confirmation: accept ? 'ACCEPTED' : 'DECLINED',
      confirmedAt: accept ? new Date() : null,
      declinedAt: accept ? null : new Date(),
    },
  });

  const client = await prisma.user.findUnique({
    where: { id: clientId },
    select: { email: true, profile: { select: { fullName: true } } },
  });
  const clientName = client?.profile?.fullName?.trim() || client?.email || 'The client';

  const recipients = [appointment.lawyer.userId];
  if (appointment.firm) recipients.push(appointment.firm.userId);

  await Promise.all(
    recipients.map((userId) =>
      notify({
        userId,
        kind: accept ? 'appointment.office_accepted' : 'appointment.office_declined',
        title: accept
          ? `${clientName} will attend on {{${appointment.startsAt.toISOString()}}}`
          : `${clientName} declined the office visit`,
        body: accept
          ? `They accepted the meeting at ${appointment.officeAddress}.`
          : `They cannot come to the office for the meeting on {{${appointment.startsAt.toISOString()}}}. You may want to offer a video call instead.`,
        link: '/calendar',
      }),
    ),
  );

  await recordAudit({
    actorUserId: clientId,
    action: accept ? 'appointment.office_accepted' : 'appointment.office_declined',
    entityType: 'appointment',
    entityId: appointmentId,
    metadata: { caseReference: appointment.case?.reference ?? null },
    ip: null,
  });

  return success();
}

export async function cancelAppointment(
  appointmentId: string,
  actorUserId: string,
): Promise<ServiceResult> {
  const authorization = await loadAppointmentForManagement(appointmentId, actorUserId);
  if (!authorization.ok) return failure(authorization.message, { status: authorization.status });

  const { appointment, isOwningLawyer, isFirmOwner, isClient } = authorization;
  if (!isOwningLawyer && !isFirmOwner && !isClient) {
    return failure('That meeting is not yours to cancel.', { status: 403 });
  }

  await prisma.appointment.update({ where: { id: appointmentId }, data: { status: 'CANCELLED' } });

  const other = isClient ? appointment.lawyer.userId : appointment.clientId;
  await notify({
    userId: other,
    kind: 'appointment.cancelled',
    title: 'A meeting was cancelled',
    body: isClient
      ? `The client cancelled the meeting on {{${appointment.startsAt.toISOString()}}}.`
      : `The meeting on {{${appointment.startsAt.toISOString()}}} has been cancelled.`,
    link: '/cases',
  });

  await recordAudit({
    actorUserId,
    action: 'appointment.cancelled',
    entityType: 'appointment',
    entityId: appointmentId,
    metadata: { byFirmOwner: isFirmOwner && !isOwningLawyer },
    ip: null,
  });

  return success();
}

type ManagedAppointment = {
  ok: true;
  appointment: {
    id: string;
    startsAt: Date;
    endsAt: Date;
    status: string;
    mode: string;
    officeAddress: string | null;
    roomCode: string | null;
    confirmation: string;
    caseId: string | null;
    clientId: string;
    lawyerId: string;
    firmId: string | null;
    note: string | null;
    source: string;
    lawyer: {
      userId: string;
      user: { profile: { fullName: string } | null };
    };
    firm: { id: string; userId: string; legalName: string } | null;
    case: { reference: string } | null;
  };
  isOwningLawyer: boolean;
  isFirmOwner: boolean;
  isClient: boolean;
};

type ManagedAppointmentFailure = { ok: false; message: string; status: number };

/**
 * Loads a meeting and works out who is entitled to manage it.
 *
 * Two people may: the lawyer whose diary it is, and the firm that lawyer belongs
 * to — a firm is responsible for what its practice has arranged. The firm is
 * matched on the lawyer's *current* affiliation as well as the firm recorded on
 * the meeting, because a lawyer who joins a practice brings their diary with
 * them. The client is not among them: a client may answer an office request and
 * may cancel, but only a professional moves a meeting.
 */
async function loadAppointmentForManagement(
  appointmentId: string,
  actorUserId: string,
): Promise<ManagedAppointment | ManagedAppointmentFailure> {
  const [appointment, actorFirm] = await Promise.all([
    prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: {
        id: true,
        startsAt: true,
        endsAt: true,
        status: true,
        mode: true,
        officeAddress: true,
        roomCode: true,
        confirmation: true,
        caseId: true,
        clientId: true,
        lawyerId: true,
        firmId: true,
        note: true,
        source: true,
        lawyer: {
          select: {
            userId: true,
            affiliatedFirmId: true,
            user: { select: { profile: { select: { fullName: true } } } },
          },
        },
        firm: { select: { id: true, userId: true, legalName: true } },
        case: { select: { reference: true } },
      },
    }),
    prisma.firmProfile.findUnique({ where: { userId: actorUserId }, select: { id: true } }),
  ]);

  if (!appointment) return { ok: false, message: 'That meeting no longer exists.', status: 404 };

  const firmOwnsIt =
    actorFirm !== null &&
    (appointment.firmId === actorFirm.id || appointment.lawyer.affiliatedFirmId === actorFirm.id);

  return {
    ok: true,
    appointment,
    isOwningLawyer: appointment.lawyer.userId === actorUserId,
    isFirmOwner: Boolean(appointment.firm?.userId === actorUserId || firmOwnsIt),
    isClient: appointment.clientId === actorUserId,
  };
}

const rescheduleSchema = z.object({
  appointmentId: z.string().min(1),
  dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a valid date.'),
  hour: z.coerce
    .number()
    .int()
    .min(WORKING_HOURS.startHour, 'Choose an available time.')
    .max(WORKING_HOURS.endHour - 1, 'Choose an available time.'),
  mode: z.enum(['VIDEO_CALL', 'OFFICE_VISIT', 'PHONE_CALL']).default('OFFICE_VISIT'),
  officeAddress: z
    .string()
    .trim()
    .max(300)
    .optional()
    .nullable()
    .transform((value) => (value && value.length > 0 ? value : null)),
});

/**
 * Moves a meeting.
 *
 * The client is told, because a client who turns up at the old time has been
 * failed by the product. Cancelling and rescheduling both notify; deleting, which
 * erases the arrangement entirely rather than changing it, does not.
 */
export async function rescheduleAppointment(
  actorUserId: string,
  rawInput: unknown,
  meta: { ip?: string | null } = {},
): Promise<ServiceResult<{ appointmentId: string }>> {
  const parsed = rescheduleSchema.safeParse(rawInput);
  if (!parsed.success) return fromZodError(parsed.error);

  const authorization = await loadAppointmentForManagement(parsed.data.appointmentId, actorUserId);
  if (!authorization.ok) return failure(authorization.message, { status: authorization.status });

  const { appointment, isOwningLawyer, isFirmOwner } = authorization;
  if (!isOwningLawyer && !isFirmOwner) {
    return failure('Only the lawyer whose diary it is, or the firm, can move a meeting.', {
      status: 403,
    });
  }
  if (appointment.status !== 'BOOKED') {
    return failure('That meeting is no longer scheduled, so it cannot be moved.');
  }
  if (parsed.data.mode === 'OFFICE_VISIT' && !parsed.data.officeAddress) {
    return failure('Give the address the client should come to.', {
      fieldErrors: { officeAddress: 'An office visit needs an address.' },
    });
  }

  const startsAt = fromUaeDateTime(parsed.data.dateKey, parsed.data.hour);
  const endsAt = new Date(startsAt.getTime() + SLOT_MINUTES * 60 * 1000);

  if (startsAt.getTime() < Date.now()) {
    return failure('Choose a time in the future.', { fieldErrors: { hour: 'That time has passed.' } });
  }

  if (startsAt.getTime() === appointment.startsAt.getTime() && parsed.data.mode === appointment.mode) {
    return failure('That is the time it is already booked for. Choose another slot.', {
      fieldErrors: { hour: 'No change.' },
    });
  }

  const clash = await prisma.appointment.findFirst({
    where: {
      id: { not: appointment.id },
      lawyerId: appointment.lawyerId,
      startsAt,
      status: 'BOOKED',
      source: 'SCHEDULED',
    },
    select: { id: true },
  });
  if (clash) {
    return failure('That time is already booked. Choose another slot.', {
      fieldErrors: { hour: 'No longer available.' },
    });
  }

  // Moving to a video call needs a room; moving away from one keeps the room it
  // already has, so a link somebody saved still works.
  const roomCode =
    parsed.data.mode === 'VIDEO_CALL' ? (appointment.roomCode ?? newRoomCode()) : appointment.roomCode;

  try {
    await prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        startsAt,
        endsAt,
        mode: parsed.data.mode,
        officeAddress: parsed.data.mode === 'OFFICE_VISIT' ? parsed.data.officeAddress : null,
        roomCode,
        // A fresh office visit needs a fresh answer, because the client has to
        // agree to travel to a new time.
        confirmation: parsed.data.mode === 'OFFICE_VISIT' ? 'PENDING' : 'NOT_REQUIRED',
        confirmedAt: null,
        declinedAt: null,
        rescheduledAt: new Date(),
      },
    });
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      return failure('That time has just been booked. Choose another slot.', {
        fieldErrors: { hour: 'No longer available.' },
      });
    }
    console.error('[appointments] reschedule failed', error);
    return failure('The meeting could not be moved. Please try again.', { status: 500 });
  }

  const professionalName =
    appointment.firm?.legalName ||
    appointment.lawyer.user.profile?.fullName?.trim() ||
    'Your professional';

  await notify({
    userId: appointment.clientId,
    kind: 'appointment.rescheduled',
    title: `Your meeting moved to {{${startsAt.toISOString()}}}`,
    body:
      parsed.data.mode === 'OFFICE_VISIT'
        ? `${professionalName} moved the meeting from {{${appointment.startsAt.toISOString()}}} to {{${startsAt.toISOString()}}} at ${parsed.data.officeAddress}. Accept or decline the new time from My cases.`
        : `${professionalName} moved the meeting from {{${appointment.startsAt.toISOString()}}} to {{${startsAt.toISOString()}}}${
            parsed.data.mode === 'VIDEO_CALL' ? '. Open My cases to join the conference room.' : '.'
          }`,
    link: '/cases',
  });

  await recordAudit({
    actorUserId,
    action: 'appointment.rescheduled',
    entityType: 'appointment',
    entityId: appointment.id,
    metadata: {
      from: appointment.startsAt.toISOString(),
      to: startsAt.toISOString(),
      byFirmOwner: isFirmOwner && !isOwningLawyer,
    },
    ip: meta.ip ?? null,
  });

  return success({ appointmentId: appointment.id });
}

/**
 * Deletes a meeting.
 *
 * Deliberately silent: the client is not told, because the arrangement is being
 * erased rather than changed, and the two actions are meant to be different. The
 * confirmation on the button says exactly that.
 */
export async function deleteAppointment(
  appointmentId: string,
  actorUserId: string,
  meta: { ip?: string | null } = {},
): Promise<ServiceResult> {
  const authorization = await loadAppointmentForManagement(appointmentId, actorUserId);
  if (!authorization.ok) return failure(authorization.message, { status: authorization.status });

  const { appointment, isOwningLawyer, isFirmOwner } = authorization;
  if (!isOwningLawyer && !isFirmOwner) {
    return failure('Only the lawyer whose diary it is, or the firm, can delete a meeting.', {
      status: 403,
    });
  }

  await prisma.appointment.delete({ where: { id: appointment.id } });

  // A deleted meeting must not leave signalling behind for a room code that may
  // later be reissued.
  if (appointment.roomCode) {
    await prisma.roomSignal.deleteMany({ where: { roomCode: appointment.roomCode } }).catch(() => undefined);
    await prisma.roomPresence.deleteMany({ where: { roomCode: appointment.roomCode } }).catch(() => undefined);
  }

  await recordAudit({
    actorUserId,
    action: 'appointment.deleted',
    entityType: 'appointment',
    entityId: appointment.id,
    metadata: {
      startsAt: appointment.startsAt.toISOString(),
      clientId: appointment.clientId,
      caseId: appointment.caseId,
      byFirmOwner: isFirmOwner && !isOwningLawyer,
      clientNotified: false,
    },
    ip: meta.ip ?? null,
  });

  return success();
}

/**
 * The client asks for an urgent call with the professional on their case.
 *
 * This is the client's own route into a conference room: no diary slot, no
 * waiting for the professional to book one. It opens a room and alerts the
 * professional, who joins from their case page. A second request while one is
 * still open returns the room already waiting rather than ringing again.
 */
export async function requestUrgentCall(
  clientId: string,
  caseId: string,
  meta: { ip?: string | null } = {},
): Promise<ServiceResult<{ roomCode: string; appointmentId: string; joinedExisting: boolean }>> {
  const legalCase = await prisma.legalCase.findUnique({
    where: { id: caseId },
    select: {
      id: true,
      reference: true,
      title: true,
      status: true,
      clientId: true,
      lawyerId: true,
      lawyer: { select: { id: true, userId: true } },
      firm: {
        select: {
          id: true,
          userId: true,
          legalName: true,
          lawyers: {
            orderBy: [{ isFirmEmergency: 'desc' }, { createdAt: 'asc' }],
            select: { id: true, userId: true },
            take: 1,
          },
        },
      },
    },
  });

  if (!legalCase) return failure('That case no longer exists.', { status: 404 });
  if (legalCase.clientId !== clientId) {
    return failure('Only the client on this case can ask for a call about it.', { status: 403 });
  }
  if (!['ASSIGNED', 'IN_PROGRESS'].includes(legalCase.status)) {
    return failure('An urgent call can be requested once a professional has taken the case.');
  }

  const lawyerProfileId = legalCase.lawyer?.id ?? legalCase.firm?.lawyers[0]?.id ?? null;
  if (!lawyerProfileId) {
    return failure(
      legalCase.firm
        ? `${legalCase.firm.legalName} has no lawyer registered yet, so there is nobody to call. The case stays with the firm until one is added.`
        : 'No lawyer is assigned to this case yet, so there is nobody to call.',
    );
  }

  // One open room per case: asking twice means the client wants the call they
  // already started, not a second one.
  const open = await prisma.appointment.findFirst({
    where: {
      caseId,
      clientId,
      source: 'CASE_REQUEST',
      status: 'BOOKED',
      roomCode: { not: null },
      createdAt: { gte: new Date(Date.now() - 2 * 60 * 60 * 1000) },
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true, roomCode: true },
  });
  if (open?.roomCode) {
    return success({ roomCode: open.roomCode, appointmentId: open.id, joinedExisting: true });
  }

  const now = new Date();
  const appointment = await prisma.appointment.create({
    data: {
      lawyerId: lawyerProfileId,
      firmId: legalCase.firm?.id ?? null,
      clientId,
      caseId,
      startsAt: now,
      endsAt: new Date(now.getTime() + SLOT_MINUTES * 60 * 1000),
      status: 'BOOKED',
      mode: 'VIDEO_CALL',
      roomCode: newRoomCode(),
      confirmation: 'NOT_REQUIRED',
      source: 'CASE_REQUEST',
      requestedById: clientId,
      createdById: clientId,
      note: 'Urgent call requested by the client from the case.',
    },
    select: { id: true, roomCode: true },
  });

  const client = await prisma.user.findUnique({
    where: { id: clientId },
    select: { email: true, profile: { select: { fullName: true } } },
  });
  const clientName = client?.profile?.fullName?.trim() || client?.email || 'Your client';

  const recipients = [legalCase.lawyer?.userId, legalCase.firm?.userId].filter(
    (value): value is string => Boolean(value),
  );
  await Promise.all(
    recipients.map((userId) =>
      notify({
        userId,
        kind: 'appointment.urgent_call',
        title: `${clientName} is asking for an urgent call`,
        body: `On case ${legalCase.reference}. Open the case and join the room to answer.`,
        link: `/cases/${legalCase.id}`,
      }),
    ),
  );

  await recordAudit({
    actorUserId: clientId,
    action: 'appointment.urgent_call_requested',
    entityType: 'appointment',
    entityId: appointment.id,
    metadata: { caseId, roomCode: appointment.roomCode },
    ip: meta.ip ?? null,
  });

  return success({
    roomCode: appointment.roomCode!,
    appointmentId: appointment.id,
    joinedExisting: false,
  });
}

/**
 * The live urgent-call room on a case, if there is one. Both sides read this to
 * find the room without hunting through a diary.
 */
export async function activeUrgentCall(caseId: string) {
  return prisma.appointment.findFirst({
    where: {
      caseId,
      source: 'CASE_REQUEST',
      status: 'BOOKED',
      roomCode: { not: null },
      createdAt: { gte: new Date(Date.now() - 2 * 60 * 60 * 1000) },
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      roomCode: true,
      createdAt: true,
      startsAt: true,
      mode: true,
      lawyer: { select: { user: { select: { id: true, profile: { select: { fullName: true } } } } } },
    },
  });
}

export async function listAppointmentsForClient(clientId: string) {
  return prisma.appointment.findMany({
    where: { clientId },
    orderBy: { startsAt: 'asc' },
    select: {
      id: true,
      startsAt: true,
      endsAt: true,
      status: true,
      mode: true,
      roomCode: true,
      officeAddress: true,
      confirmation: true,
      note: true,
      createdAt: true,
      lawyer: {
        select: {
          licenseNumber: true,
          user: { select: { email: true, profile: { select: { fullName: true } } } },
        },
      },
      firm: { select: { legalName: true } },
      case: { select: { id: true, reference: true, title: true } },
    },
  });
}
