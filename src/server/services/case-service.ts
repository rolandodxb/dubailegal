import { LegalArea, LegalCaseStatus, Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { recordAudit } from '@/lib/audit';
import { storeUpload, UploadRejected, deleteUpload } from '@/lib/storage';
import {
  MAX_CASE_FILES,
  MAX_CHAT_ATTACHMENTS_PER_MESSAGE,
  ONGOING_CASE_STATUSES,
} from '@/lib/constants';
import { notify, notifyMany } from './notification-service';
import { decryptText, encryptText } from '@/lib/crypto';
import { fromZodError, failure, success, type ServiceResult } from './result';
import { z } from 'zod';

/**
 * The client-facing case lifecycle.
 *
 *   SUBMITTED     the client has sent it; nobody has opened it
 *   UNDER_REVIEW  a lawyer opened it ("review the case") but has not committed
 *   ASSIGNED      a named lawyer has accepted it and is responsible
 *   IN_PROGRESS   the work is under way
 *   COMPLETED     finished
 *   DECLINED      refused, with a reason the client can read
 *
 * A case is addressed either to a named lawyer or to a firm. A firm case may be
 * accepted by any lawyer registered to that firm, and the accepting lawyer
 * becomes the one responsible.
 */

export const createCaseSchema = z.object({
  listingId: z.string().min(1, 'Choose the professional this case is for.'),
  title: z
    .string()
    .trim()
    .min(4, 'Give the case a name of at least 4 characters.')
    .max(160, 'Keep the case name under 160 characters.'),
  caseType: z.nativeEnum(LegalArea, {
    errorMap: () => ({ message: 'Choose the type of case.' }),
  }),
  description: z
    .string()
    .trim()
    .min(30, 'Describe the matter in at least 30 characters so the professional can assess it.')
    .max(8000, 'Keep the description under 8000 characters.'),
});

const declineSchema = z.object({
  caseId: z.string().min(1),
  reason: z
    .string()
    .trim()
    .min(10, 'Give a reason of at least 10 characters so the client understands.')
    .max(2000),
});

const messageSchema = z.object({
  caseId: z.string().min(1),
  // A message may be files with no words, or words with no files, but not
  // nothing at all. The check happens after the files are known.
  body: z.string().trim().max(4000, 'Keep messages under 4000 characters.').default(''),
});

// ── Access control ───────────────────────────────────────────────────────────

export type CaseViewerRole = 'CLIENT' | 'ASSIGNED_LAWYER' | 'FIRM_MEMBER' | 'FIRM_OWNER';

export type CaseAccess = {
  role: CaseViewerRole;
  /** The acting user's LawyerProfile id, when they have one. */
  lawyerProfileId: string | null;
  /** May open it for review and accept or decline it. */
  canReview: boolean;
  canAccept: boolean;
  canMessage: boolean;
  canProgress: boolean;
};

/**
 * Works out what a signed-in account may do with a case.
 *
 * Note that a firm's own account is not a lawyer: it can see and discuss a case
 * addressed to the firm, but only a registered lawyer can accept it. That is
 * stated in the UI rather than silently prevented.
 */
export async function resolveCaseAccess(
  legalCase: {
    clientId: string;
    lawyerId: string | null;
    firmId: string | null;
    status: LegalCaseStatus;
  },
  userId: string,
): Promise<CaseAccess | null> {
  if (legalCase.clientId === userId) {
    return {
      role: 'CLIENT',
      lawyerProfileId: null,
      canReview: false,
      canAccept: false,
      canMessage: true,
      canProgress: false,
    };
  }

  const lawyerProfile = await prisma.lawyerProfile.findUnique({
    where: { userId },
    select: { id: true, affiliatedFirmId: true },
  });

  // The lawyer this case belongs to. For a case sent straight to a lawyer this
  // is set from the moment it is created, so the same person is both the one
  // asked to review it and — once they accept — the one responsible for it.
  if (legalCase.lawyerId && lawyerProfile?.id === legalCase.lawyerId) {
    const awaitingDecision = legalCase.status === 'SUBMITTED' || legalCase.status === 'UNDER_REVIEW';
    return {
      role: 'ASSIGNED_LAWYER',
      lawyerProfileId: lawyerProfile.id,
      canReview: legalCase.status === 'SUBMITTED',
      canAccept: awaitingDecision,
      canMessage: true,
      canProgress: legalCase.status === 'ASSIGNED' || legalCase.status === 'IN_PROGRESS',
    };
  }

  // A case addressed to a firm: any of its registered lawyers may act on it.
  if (legalCase.firmId && lawyerProfile?.affiliatedFirmId === legalCase.firmId) {
    const awaitingDecision =
      legalCase.status === 'SUBMITTED' ||
      legalCase.status === 'UNDER_REVIEW' ||
      // Once a firm has released the case, its lawyers take it from the offer.
      legalCase.status === 'DISTRIBUTED';
    return {
      role: 'FIRM_MEMBER',
      lawyerProfileId: lawyerProfile.id,
      canReview: legalCase.status === 'SUBMITTED',
      canAccept: awaitingDecision,
      canMessage: true,
      // Progress belongs to whichever lawyer actually accepted the case.
      canProgress: false,
    };
  }

  // The firm's own account, for cases addressed to the firm.
  if (legalCase.firmId) {
    const firm = await prisma.firmProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (firm?.id === legalCase.firmId) {
      return {
        role: 'FIRM_OWNER',
        lawyerProfileId: null,
        canReview: false,
        canAccept: false,
        canMessage: true,
        canProgress: false,
      };
    }
  }

  return null;
}

// ── Reference numbers ────────────────────────────────────────────────────────

async function nextReference(tx: Prisma.TransactionClient): Promise<string> {
  const year = new Date().getUTCFullYear();
  const sequence = await tx.caseSequence.upsert({
    where: { year },
    create: { year, lastValue: 1 },
    update: { lastValue: { increment: 1 } },
  });
  return `DL-${year}-${String(sequence.lastValue).padStart(4, '0')}`;
}

/** A fresh case reference. Exported so other flows can open a case too. */
export async function generateCaseReference(): Promise<string> {
  return prisma.$transaction(async (tx) => nextReference(tx));
}

// ── Creating a case ──────────────────────────────────────────────────────────

const CASE_INCLUDE = {
  client: {
    select: {
      id: true,
      email: true,
      profile: {
        select: {
          fullName: true,
          phone: true,
          countryOfResidence: true,
          avatarDocumentId: true,
        },
      },
    },
  },
  lawyer: {
    select: {
      id: true,
      licenseNumber: true,
      licensingAuthority: true,
      user: {
        select: {
          id: true,
          email: true,
          profile: { select: { fullName: true, avatarDocumentId: true } },
        },
      },
    },
  },
  firm: {
    select: {
      id: true,
      legalName: true,
      tradeLicenseNumber: true,
      user: { select: { id: true, email: true } },
    },
  },
  files: true,
  events: { orderBy: { createdAt: 'asc' as const }, include: { actor: { select: { id: true, email: true } } } },
  _count: { select: { messages: true } },
} satisfies Prisma.LegalCaseInclude;

export type CaseWithParties = Prisma.LegalCaseGetPayload<{ include: typeof CASE_INCLUDE }>;

/** Finds the lawyer profiles that make up a firm. */
async function firmLawyerUserIds(firmId: string): Promise<string[]> {
  const lawyers = await prisma.lawyerProfile.findMany({
    where: { affiliatedFirmId: firmId },
    select: { userId: true },
  });
  return lawyers.map((row) => row.userId);
}

/**
 * Sends a case to a lawyer or a firm.
 *
 * Files are stored before the transaction so a rejected upload cannot leave a
 * half-created case behind.
 */
export async function createCase(
  clientId: string,
  rawInput: unknown,
  files: File[],
  meta: { ip?: string | null } = {},
): Promise<ServiceResult<{ caseId: string; reference: string }>> {
  const parsed = createCaseSchema.safeParse(rawInput);
  if (!parsed.success) return fromZodError(parsed.error);

  if (files.length > MAX_CASE_FILES) {
    return failure(`Attach at most ${MAX_CASE_FILES} files.`, { fieldErrors: { files: `At most ${MAX_CASE_FILES} files.` } });
  }

  const listing = await prisma.listing.findFirst({
    where: { id: parsed.data.listingId, published: true },
    select: {
      id: true,
      kind: true,
      userId: true,
      user: {
        select: {
          id: true,
          email: true,
          lawyerProfile: { select: { id: true } },
          firmProfile: { select: { id: true } },
        },
      },
    },
  });
  if (!listing) return failure('That profile is no longer listed in the directory.', { status: 404 });
  if (listing.userId === clientId) return failure('You cannot submit a case to your own listing.');

  const lawyerId = listing.kind === 'LAWYER' ? (listing.user.lawyerProfile?.id ?? null) : null;
  const firmId = listing.kind === 'FIRM' ? (listing.user.firmProfile?.id ?? null) : null;
  if (!lawyerId && !firmId) {
    return failure('That listing is not linked to a lawyer or firm record yet.', { status: 409 });
  }

  // Store attachments first.
  const stored: { storageKey: string; fileName: string; mimeType: string; sizeBytes: number; sha256: string }[] = [];
  try {
    for (const file of files) {
      if (file.size === 0) continue;
      stored.push(await storeUpload(file, clientId));
    }
  } catch (error) {
    // Roll back anything already written for this attempt.
    for (const entry of stored) await deleteUpload(entry.storageKey).catch(() => undefined);
    if (error instanceof UploadRejected) {
      return failure(error.message, { fieldErrors: { files: error.message } });
    }
    console.error('[cases] attachment storage failed', error);
    return failure('The attachments could not be stored. Please try again.', { status: 500 });
  }

  let created: { id: string; reference: string };
  try {
    created = await prisma.$transaction(async (tx) => {
      const reference = await nextReference(tx);
      const legalCase = await tx.legalCase.create({
        data: {
          reference,
          title: parsed.data.title,
          caseType: parsed.data.caseType,
          description: parsed.data.description,
          status: 'SUBMITTED',
          clientId,
          lawyerId,
          firmId,
          listingId: listing.id,
          files: {
            create: stored.map((entry) => ({ ...entry, uploadedById: clientId })),
          },
          events: {
            create: { toStatus: 'SUBMITTED', actorId: clientId, note: 'Case submitted by the client.' },
          },
        },
        select: { id: true, reference: true },
      });
      return legalCase;
    });
  } catch (error) {
    for (const entry of stored) await deleteUpload(entry.storageKey).catch(() => undefined);
    console.error('[cases] could not create case', error);
    return failure('The case could not be created. Please try again.', { status: 500 });
  }

  // Tell the professional side. For a firm, every registered lawyer is alerted.
  const client = await prisma.user.findUnique({
    where: { id: clientId },
    select: { email: true, profile: { select: { fullName: true } } },
  });
  const clientName = client?.profile?.fullName?.trim() || client?.email || 'A client';

  const link = `/cases/${created.id}`;
  if (firmId) {
    const recipients = await firmLawyerUserIds(firmId);
    await Promise.all(
      recipients.map((userId) =>
        notify({
          userId,
          kind: 'case.submitted',
          title: `New case for your firm: ${created.reference}`,
          body: `${clientName} submitted “${parsed.data.title}”. Any lawyer in the firm may review and accept it.`,
          link,
        }),
      ),
    );
    const firmOwner = await prisma.firmProfile.findUnique({ where: { id: firmId }, select: { userId: true } });
    if (firmOwner) {
      await notify({
        userId: firmOwner.userId,
        kind: 'case.submitted',
        title: `New case submitted to your firm: ${created.reference}`,
        body: `${clientName} submitted “${parsed.data.title}”. One of your registered lawyers must accept it.`,
        link,
      });
    }
  } else if (lawyerId) {
    const lawyer = await prisma.lawyerProfile.findUnique({ where: { id: lawyerId }, select: { userId: true } });
    if (lawyer) {
      await notify({
        userId: lawyer.userId,
        kind: 'case.submitted',
        title: `New case request: ${created.reference}`,
        body: `${clientName} submitted “${parsed.data.title}” and asked you to review it.`,
        link,
      });
    }
  }

  await recordAudit({
    actorUserId: clientId,
    action: 'case.submitted',
    entityType: 'legal_case',
    entityId: created.id,
    metadata: { reference: created.reference, caseType: parsed.data.caseType, files: stored.length, lawyerId, firmId },
    ip: meta.ip ?? null,
  });

  return success({ caseId: created.id, reference: created.reference });
}

// ── Reading ──────────────────────────────────────────────────────────────────

export async function getCaseForViewer(caseId: string, userId: string) {
  const legalCase = await prisma.legalCase.findUnique({ where: { id: caseId }, include: CASE_INCLUDE });
  if (!legalCase) return null;

  const access = await resolveCaseAccess(legalCase, userId);
  if (!access) return null;

  return { legalCase, access };
}

export async function listCasesForClient(clientId: string) {
  return prisma.legalCase.findMany({
    where: { clientId },
    orderBy: { submittedAt: 'desc' },
    include: CASE_INCLUDE,
  });
}

/** Every case a lawyer can act on, whether assigned or addressed to them. */
/**
 * How many cases are waiting for this lawyer to look at them — the badge in the
 * navigation.
 *
 * One query, not a list: the navigation asks for a number on every page, and
 * loading the full case graph (with its client, firm and documents) to measure
 * it cost several round trips per page view on a remote database. The conditions
 * are exactly the ones `listCasesForLawyer` filters on, so the badge can never
 * disagree with the page.
 */
export async function countCasesAwaitingLawyer(lawyerUserId: string): Promise<number> {
  return prisma.legalCase.count({
    where: {
      OR: [
        // Addressed to this lawyer directly and nobody has picked it up.
        { status: 'SUBMITTED', firmId: null, lawyer: { userId: lawyerUserId } },
        // Addressed to the firm this lawyer belongs to, and undecided.
        { status: 'SUBMITTED', firm: { lawyers: { some: { userId: lawyerUserId } } } },
        // Claimed for review by this lawyer.
        { status: 'UNDER_REVIEW', actionedByUserId: lawyerUserId },
      ],
    },
  });
}

/**
 * How many cases are waiting for this firm to decide on them — the badge in the
 * navigation, and the same conditions `listCasesForFirm` filters on.
 */
export async function countCasesAwaitingFirm(firmUserId: string): Promise<number> {
  return prisma.legalCase.count({
    where: {
      firm: { userId: firmUserId },
      status: { in: ['SUBMITTED', 'UNDER_REVIEW'] },
    },
  });
}

export async function listCasesForLawyer(lawyerUserId: string) {
  const profile = await prisma.lawyerProfile.findUnique({
    where: { userId: lawyerUserId },
    select: { id: true, affiliatedFirmId: true },
  });
  if (!profile) return { portfolio: [], pending: [], reviewing: [], offered: [], all: [] };

  const or: Prisma.LegalCaseWhereInput[] = [{ lawyerId: profile.id }];
  if (profile.affiliatedFirmId) {
    or.push({ firmId: profile.affiliatedFirmId });
    // A case the firm has released to its lawyers is theirs to see even though
    // nobody is assigned yet — otherwise the offer would go nowhere.
    or.push({ offers: { some: { lawyerId: profile.id, status: 'PENDING' } } });
  }

  const all = await prisma.legalCase.findMany({
    where: { OR: or },
    relationLoadStrategy: 'join',
    orderBy: { submittedAt: 'desc' },
    include: CASE_INCLUDE,
  });

  // "Pending review" means nobody has picked it up. A case already claimed for
  // review by this lawyer is listed separately so it is not lost.
  const pending = all.filter(
    (item) =>
      item.status === 'SUBMITTED' &&
      ((item.firmId === null && item.lawyerId === profile.id) ||
        (item.firmId !== null && item.firmId === profile.affiliatedFirmId)),
  );
  const reviewing = all.filter((item) => item.status === 'UNDER_REVIEW' && item.actionedByUserId === lawyerUserId);
  /// Released by the firm and waiting for this lawyer to take it or pass.
  const offered = all.filter((item) => item.status === 'DISTRIBUTED');
  // The portfolio is only work this lawyer has actually accepted.
  const portfolio = all.filter(
    (item) =>
      item.lawyerId === profile.id &&
      ((ONGOING_CASE_STATUSES as readonly string[]).includes(item.status) || item.status === 'COMPLETED'),
  );

  return { portfolio, pending, reviewing, offered, all };
}

export async function listCasesForFirm(firmUserId: string) {
  const firm = await prisma.firmProfile.findUnique({
    where: { userId: firmUserId },
    select: { id: true },
  });
  if (!firm) return { submitted: [], active: [], all: [] };

  const all = await prisma.legalCase.findMany({
    where: { firmId: firm.id },
    relationLoadStrategy: 'join',
    orderBy: { submittedAt: 'desc' },
    include: CASE_INCLUDE,
  });

  return {
    /// Waiting for the firm to decide whether to take it on.
    submitted: all.filter((item) => item.status === 'SUBMITTED' || item.status === 'UNDER_REVIEW'),
    /// Released to the firm's lawyers, waiting for one of them to answer.
    distributed: all.filter((item) => item.status === 'DISTRIBUTED'),
    active: all.filter(
      (item) =>
        item.lawyerId !== null &&
        ((ONGOING_CASE_STATUSES as readonly string[]).includes(item.status) || item.status === 'COMPLETED'),
    ),
    all,
  };
}

/** Distinct clients a lawyer has an accepted case with, or a meeting booked with. */
export async function listClientsForLawyer(lawyerUserId: string) {
  const profile = await prisma.lawyerProfile.findUnique({
    where: { userId: lawyerUserId },
    select: { id: true, affiliatedFirmId: true },
  });
  if (!profile) return [];

  const or: Prisma.LegalCaseWhereInput[] = [{ lawyerId: profile.id }];
  if (profile.affiliatedFirmId) {
    or.push({ firmId: profile.affiliatedFirmId, lawyerId: { not: null } });
  }

  const cases = await prisma.legalCase.findMany({
    where: {
      AND: [
        { OR: or },
        { status: { in: [...ONGOING_CASE_STATUSES, 'COMPLETED'] } },
      ],
    },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      reference: true,
      title: true,
      status: true,
      caseType: true,
      updatedAt: true,
      client: {
        select: {
          id: true,
          email: true,
          profile: {
            select: {
              fullName: true,
              phone: true,
              countryOfResidence: true,
              workDescription: true,
              avatarDocumentId: true,
            },
          },
        },
      },
      lawyer: { select: { id: true, user: { select: { profile: { select: { fullName: true } } } } } },
    },
  });

  // One card per client, carrying their cases.
  const byClient = new Map<
    string,
    {
      client: (typeof cases)[number]['client'];
      cases: { id: string; reference: string; title: string; status: string; caseType: string; updatedAt: Date }[];
    }
  >();

  for (const item of cases) {
    const existing = byClient.get(item.client.id) ?? { client: item.client, cases: [] };
    existing.cases.push({
      id: item.id,
      reference: item.reference,
      title: item.title,
      status: item.status,
      caseType: item.caseType,
      updatedAt: item.updatedAt,
    });
    byClient.set(item.client.id, existing);
  }

  return Array.from(byClient.values());
}

// ── Transitions ──────────────────────────────────────────────────────────────

async function applicantLabel(legalCase: { clientId: string }): Promise<string> {
  const client = await prisma.user.findUnique({
    where: { id: legalCase.clientId },
    select: { email: true, profile: { select: { fullName: true } } },
  });
  return client?.profile?.fullName?.trim() || client?.email || 'The client';
}

/**
 * Moves a case between states, writing an event so the history is complete.
 * Callers must have checked `access` first.
 */
async function transition(
  caseId: string,
  actorId: string,
  toStatus: LegalCaseStatus,
  options: {
    note?: string | null;
    setActionedBy?: boolean;
    assignLawyerId?: string | null;
  } = {},
): Promise<ServiceResult<{ status: LegalCaseStatus }>> {
  const existing = await prisma.legalCase.findUnique({
    where: { id: caseId },
    select: { id: true, status: true, clientId: true, reference: true, title: true, lawyerId: true, firmId: true, reviewedAt: true },
  });
  if (!existing) return failure('That case no longer exists.', { status: 404 });

  const now = new Date();
  const data: Prisma.LegalCaseUpdateInput = { status: toStatus };
  if (options.note !== undefined) data.declineReason = options.note;
  if (options.assignLawyerId !== undefined) {
    data.lawyer = options.assignLawyerId ? { connect: { id: options.assignLawyerId } } : { disconnect: true };
  }
  if (options.setActionedBy) {
    data.actionedBy = { connect: { id: actorId } };
  }

  if (toStatus === 'UNDER_REVIEW') data.reviewedAt = now;
  if (toStatus === 'ASSIGNED') data.assignedAt = now;
  if (toStatus === 'COMPLETED') data.completedAt = now;
  if (toStatus === 'DECLINED') data.declinedAt = now;

  await prisma.$transaction([
    prisma.legalCase.update({ where: { id: caseId }, data }),
    prisma.caseStatusEvent.create({
      data: {
        caseId,
        fromStatus: existing.status,
        toStatus,
        actorId,
        note: options.note ?? null,
      },
    }),
  ]);

  await recordAudit({
    actorUserId: actorId,
    action: `case.${toStatus.toLowerCase()}`,
    entityType: 'legal_case',
    entityId: caseId,
    metadata: { reference: existing.reference, from: existing.status, to: toStatus },
    ip: null,
  });

  return success({ status: toStatus });
}

/** A lawyer opens the case for review: SUBMITTED → UNDER_REVIEW. */
export async function reviewCase(
  caseId: string,
  userId: string,
  meta: { ip?: string | null } = {},
): Promise<ServiceResult<{ status: LegalCaseStatus }>> {
  const found = await getCaseForViewer(caseId, userId);
  if (!found) return failure('That case is not available to you.', { status: 404 });
  const { legalCase, access } = found;

  if (!access.canReview && !access.canAccept) {
    return failure('Only the lawyer the case was sent to can review it.', { status: 403 });
  }
  if (legalCase.status !== 'SUBMITTED') {
    return failure('This case is no longer waiting to be reviewed.');
  }

  const result = await transition(caseId, userId, 'UNDER_REVIEW', {
    setActionedBy: true,
    note: 'Opened for review.',
  });
  if (!result.ok) return result;

  await notify({
    userId: legalCase.clientId,
    kind: 'case.under_review',
    title: `Your case ${legalCase.reference} is under review`,
    body: `${await applicantLabelOrLawyerName(userId)} has opened “${legalCase.title}” and is reviewing it.`,
    link: `/cases/${caseId}`,
  });

  await recordAudit({ actorUserId: userId, action: 'case.review_started', entityType: 'legal_case', entityId: caseId, ip: meta.ip ?? null });
  return result;
}

async function applicantLabelOrLawyerName(userId: string): Promise<string> {
  const profile = await prisma.profile.findUnique({ where: { userId }, select: { fullName: true } });
  return profile?.fullName?.trim() || 'A lawyer';
}

/** A lawyer accepts the case: → ASSIGNED, recording who is responsible. */
export async function acceptCase(
  caseId: string,
  userId: string,
  meta: { ip?: string | null } = {},
): Promise<ServiceResult<{ status: LegalCaseStatus }>> {
  const found = await getCaseForViewer(caseId, userId);
  if (!found) return failure('That case is not available to you.', { status: 404 });
  const { legalCase, access } = found;

  if (!access.lawyerProfileId) {
    return failure(
      'Only a registered lawyer can accept a case. Add your lawyers under “Lawyers registered” and ask one of them to accept it.',
      { status: 403 },
    );
  }
  if (!access.canAccept && legalCase.lawyerId !== access.lawyerProfileId) {
    return failure('This case has already been accepted.', { status: 409 });
  }
  const takeable = ['SUBMITTED', 'UNDER_REVIEW', 'DISTRIBUTED'];
  if (!takeable.includes(legalCase.status)) {
    return failure('This case can no longer be accepted.');
  }

  const result = await transition(caseId, userId, 'ASSIGNED', {
    assignLawyerId: access.lawyerProfileId,
    setActionedBy: true,
    note:
      legalCase.status === 'DISTRIBUTED'
        ? 'Taken from the firm’s offer to its lawyers.'
        : 'Case accepted by the assigned lawyer.',
  });
  if (!result.ok) return result;

  // Record the answer and stand the other offers down, so a colleague is not
  // left looking at a case that is already taken.
  const answered = await prisma.caseOffer.findUnique({
    where: { caseId_lawyerId: { caseId, lawyerId: access.lawyerProfileId } },
    select: { id: true },
  });
  if (answered) {
    await prisma.$transaction([
      prisma.caseOffer.update({
        where: { id: answered.id },
        data: { status: 'ACCEPTED', respondedAt: new Date() },
      }),
      prisma.caseOffer.updateMany({
        where: { caseId, status: 'PENDING', id: { not: answered.id } },
        data: { status: 'WITHDRAWN', respondedAt: new Date() },
      }),
    ]);
  }

  const lawyerName = await applicantLabelOrLawyerName(userId);
  await notify({
    userId: legalCase.clientId,
    kind: 'case.assigned',
    title: `Your case ${legalCase.reference} has been assigned`,
    body: `${lawyerName} has accepted “${legalCase.title}”. You can now message them inside the case.`,
    link: `/cases/${caseId}`,
  });

  await recordAudit({
    actorUserId: userId,
    action: 'case.accepted',
    entityType: 'legal_case',
    entityId: caseId,
    metadata: { reference: legalCase.reference, lawyerProfileId: access.lawyerProfileId },
    ip: meta.ip ?? null,
  });
  return result;
}

/** A lawyer refuses the case, with a reason the client can read. */
export async function declineCase(
  caseId: string,
  userId: string,
  rawInput: unknown,
  meta: { ip?: string | null } = {},
): Promise<ServiceResult<{ status: LegalCaseStatus }>> {
  const parsed = declineSchema.safeParse({ ...(rawInput as object), caseId });
  if (!parsed.success) return fromZodError(parsed.error);

  const found = await getCaseForViewer(caseId, userId);
  if (!found) return failure('That case is not available to you.', { status: 404 });
  const { legalCase, access } = found;

  if (!access.canAccept && !access.canReview) {
    return failure('Only the lawyer the case was sent to can decline it.', { status: 403 });
  }
  if (legalCase.status === 'COMPLETED' || legalCase.status === 'DECLINED') {
    return failure('This case has already been closed.');
  }

  const result = await transition(caseId, userId, 'DECLINED', {
    note: parsed.data.reason,
    setActionedBy: true,
  });
  if (!result.ok) return result;

  await notify({
    userId: legalCase.clientId,
    kind: 'case.declined',
    title: `Your case ${legalCase.reference} was declined`,
    body: `${await applicantLabelOrLawyerName(userId)} declined “${legalCase.title}”. Reason: ${parsed.data.reason}`,
    link: `/cases/${caseId}`,
  });

  await recordAudit({ actorUserId: userId, action: 'case.declined', entityType: 'legal_case', entityId: caseId, metadata: { reference: legalCase.reference }, ip: meta.ip ?? null });
  return result;
}

/** The assigned lawyer moves the case forward or closes it. */
export async function advanceCase(
  caseId: string,
  userId: string,
  toStatus: 'IN_PROGRESS' | 'COMPLETED',
  meta: { ip?: string | null } = {},
): Promise<ServiceResult<{ status: LegalCaseStatus }>> {
  const found = await getCaseForViewer(caseId, userId);
  if (!found) return failure('That case is not available to you.', { status: 404 });
  const { legalCase, access } = found;

  if (!access.canProgress) {
    return failure('Only the lawyer assigned to this case can change its progress.', { status: 403 });
  }
  if (legalCase.status !== 'ASSIGNED' && legalCase.status !== 'IN_PROGRESS') {
    return failure('This case is not in a state that can be progressed.');
  }
  if (toStatus === 'IN_PROGRESS' && legalCase.status !== 'ASSIGNED') {
    return failure('This case is already in progress.');
  }

  const result = await transition(caseId, userId, toStatus, {
    note: toStatus === 'COMPLETED' ? 'Case completed by the lawyer.' : 'Work started.',
  });
  if (!result.ok) return result;

  await notify({
    userId: legalCase.clientId,
    kind: toStatus === 'COMPLETED' ? 'case.completed' : 'case.in_progress',
    title:
      toStatus === 'COMPLETED'
        ? `Your case ${legalCase.reference} is marked complete`
        : `Work has started on ${legalCase.reference}`,
    body: `“${legalCase.title}” is now ${toStatus === 'COMPLETED' ? 'completed' : 'in progress'}.`,
    link: `/cases/${caseId}`,
  });

  return result;
}

// ── Chat ─────────────────────────────────────────────────────────────────────

export async function postCaseMessage(
  caseId: string,
  authorId: string,
  rawInput: unknown,
): Promise<ServiceResult<{ messageId: string; attachments: number }>> {
  const input = rawInput as { body?: unknown; files?: unknown };
  const parsed = messageSchema.safeParse({ caseId, body: input.body ?? '' });
  if (!parsed.success) return fromZodError(parsed.error);

  const files = (Array.isArray(input.files) ? input.files : []).filter(
    (entry): entry is File => entry instanceof File && entry.size > 0,
  );

  if (parsed.data.body.length === 0 && files.length === 0) {
    return failure('Write a message or attach a file.', {
      fieldErrors: { body: 'Write something, or attach a file.' },
    });
  }
  if (files.length > MAX_CHAT_ATTACHMENTS_PER_MESSAGE) {
    return failure(`Attach up to ${MAX_CHAT_ATTACHMENTS_PER_MESSAGE} files at a time.`, {
      fieldErrors: { files: `That is ${files.length} files.` },
    });
  }

  const found = await getCaseForViewer(caseId, authorId);
  if (!found) return failure('That case is not available to you.', { status: 404 });
  const { legalCase, access } = found;
  if (!access.canMessage) return failure('You cannot post in this case.', { status: 403 });
  if (legalCase.status === 'DECLINED') {
    return failure('This case was declined, so the conversation is closed.');
  }

  // Files first: a rejected attachment must not leave a message behind that says
  // something was sent when it was not.
  const stored = [];
  for (const file of files) {
    try {
      stored.push(await storeUpload(file, authorId, { allowArchives: true }));
    } catch (error) {
      if (error instanceof UploadRejected) {
        await Promise.all(stored.map((entry) => deleteUpload(entry.storageKey)));
        return failure(`${file.name}: ${error.message}`, { fieldErrors: { files: error.message } });
      }
      console.error('[cases] attachment storage failed', error);
      await Promise.all(stored.map((entry) => deleteUpload(entry.storageKey)));
      return failure('The attachment could not be stored. Please try again.', { status: 500 });
    }
  }

  const message = await prisma.caseMessage.create({
    data: {
      caseId,
      authorId,
      // Encrypted at rest: the column never holds the words themselves.
      body: parsed.data.body.length > 0 ? encryptText(parsed.data.body) : '',
      attachments: {
        create: stored.map((entry) => ({
          storageKey: entry.storageKey,
          fileName: entry.fileName,
          mimeType: entry.mimeType,
          sizeBytes: entry.sizeBytes,
          sha256: entry.sha256,
        })),
      },
    },
    select: { id: true },
  });

  const authorName = await applicantLabelOrLawyerName(authorId);

  // The other side is alerted: the client for anything a professional writes,
  // and every professional with access when the client writes.
  const recipients = new Set<string>();
  if (authorId === legalCase.clientId) {
    if (legalCase.lawyerId) {
      const lawyer = await prisma.lawyerProfile.findUnique({
        where: { id: legalCase.lawyerId },
        select: { userId: true },
      });
      if (lawyer) recipients.add(lawyer.userId);
    }
    if (legalCase.firmId) {
      for (const userId of await firmLawyerUserIds(legalCase.firmId)) recipients.add(userId);
    }
  } else {
    recipients.add(legalCase.clientId);
  }

  const summary =
    parsed.data.body.length > 0
      ? `${authorName}: ${parsed.data.body.slice(0, 120)}`
      : files.length === 1
        ? `${authorName} sent ${files[0]!.name}`
        : `${authorName} sent ${files.length} files`;

  await Promise.all(
    Array.from(recipients).map((userId) =>
      notify({
        userId,
        kind: 'case.message',
        title: `New message on ${legalCase.reference}`,
        body: summary,
        link: `/cases/${caseId}`,
      }),
    ),
  );

  await recordAudit({
    actorUserId: authorId,
    action: 'case.message_posted',
    entityType: 'case_message',
    entityId: message.id,
    metadata: { caseId, attachments: stored.length, encrypted: true },
    ip: null,
  });

  return success({ messageId: message.id, attachments: stored.length });
}

/** How many messages the case page loads before the reader scrolls back. */
export const CASE_MESSAGE_PAGE_SIZE = 30;

/**
 * The most recent page of the conversation, oldest first, plus whether older
 * messages exist above it. Older pages are fetched on demand from
 * /api/cases/[id]/messages as the reader scrolls up.
 *
 * Opening the thread marks every message from the other side as read, not just
 * the page that was loaded, so the unread badge cannot get stuck.
 */
export async function listCaseMessages(
  caseId: string,
  viewerId: string,
  limit = CASE_MESSAGE_PAGE_SIZE,
) {
  const rows = await prisma.caseMessage.findMany({
    where: { caseId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
    include: {
      author: {
        select: {
          id: true,
          email: true,
          accountType: true,
          profile: { select: { fullName: true, avatarDocumentId: true } },
        },
      },
      attachments: {
        select: { id: true, fileName: true, mimeType: true, sizeBytes: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  const hasMore = rows.length > limit;
  const page = (hasMore ? rows.slice(0, limit) : rows)
    .reverse()
    .map((row) => ({ ...row, body: decryptText(row.body) }));

  await prisma.caseMessage.updateMany({
    where: { caseId, authorId: { not: viewerId }, readAt: null },
    data: { readAt: new Date() },
  });

  return { messages: page, hasMore };
}

export async function unreadCaseMessageCount(userId: string): Promise<number> {
  return prisma.caseMessage.count({
    where: {
      readAt: null,
      authorId: { not: userId },
      case: {
        OR: [
          { clientId: userId },
          { lawyer: { userId } },
          { firm: { lawyers: { some: { userId } } } },
          { firm: { userId } },
        ],
      },
    },
  });
}

export { applicantLabel };

/**
 * Unread message counts per case for this member.
 *
 * Drives the badges in the case lists, so a lawyer can see at a glance which
 * client has written without opening every case.
 */
export async function unreadMessageCountsByCase(userId: string): Promise<Map<string, number>> {
  const rows = await prisma.caseMessage.findMany({
    where: {
      readAt: null,
      authorId: { not: userId },
      case: {
        OR: [
          { clientId: userId },
          { lawyer: { userId } },
          { firm: { userId } },
          { firm: { lawyers: { some: { userId } } } },
        ],
      },
    },
    select: { caseId: true },
  });

  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.caseId, (counts.get(row.caseId) ?? 0) + 1);
  }
  return counts;
}


// ── A firm releasing a case to its lawyers ───────────────────────────────────

/**
 * Releases a case the firm is holding to every lawyer registered with it.
 *
 * The firm reviews first and decides the work is a fit; only then does it go out.
 * Each lawyer receives an offer and answers it themselves — taking it assigns the
 * case and withdraws the others' offers, passing leaves it for a colleague.
 *
 * A firm with no registered lawyers cannot release anything, and is told so
 * rather than being allowed to strand a client's case.
 */
export async function distributeCaseToFirmLawyers(
  caseId: string,
  firmUserId: string,
  meta: { ip?: string | null } = {},
): Promise<ServiceResult<{ offers: number }>> {
  const firm = await prisma.firmProfile.findUnique({
    where: { userId: firmUserId },
    select: { id: true, legalName: true, lawyers: { select: { id: true, userId: true } } },
  });
  if (!firm) return failure('Only a legal-firm account can release a case to its lawyers.', { status: 403 });

  const legalCase = await prisma.legalCase.findUnique({
    where: { id: caseId },
    select: { id: true, firmId: true, status: true, reference: true, title: true, clientId: true },
  });
  if (!legalCase) return failure('That case no longer exists.', { status: 404 });
  if (legalCase.firmId !== firm.id) return failure('That case is not with your firm.', { status: 403 });
  if (legalCase.status === 'ASSIGNED' || legalCase.status === 'IN_PROGRESS' || legalCase.status === 'COMPLETED') {
    return failure('A lawyer has already taken this case.');
  }
  if (legalCase.status === 'DECLINED') return failure('This case was declined and cannot be released.');
  if (firm.lawyers.length === 0) {
    return failure(
      'Your firm has no registered lawyers yet. Add one under “Lawyers registered” before releasing a case.',
    );
  }

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    for (const lawyer of firm.lawyers) {
      await tx.caseOffer.upsert({
        where: { caseId_lawyerId: { caseId, lawyerId: lawyer.id } },
        create: { caseId, lawyerId: lawyer.id, status: 'PENDING' },
        // Re-releasing reopens a passed offer, so a case never becomes stuck.
        update: { status: 'PENDING', respondedAt: null, note: null },
      });
    }

    await tx.legalCase.update({
      where: { id: caseId },
      data: {
        status: 'DISTRIBUTED',
        distributedAt: now,
        reviewedAt: now,
        actionedByUserId: firmUserId,
      },
    });

    await tx.caseStatusEvent.create({
      data: {
        caseId,
        fromStatus: legalCase.status,
        toStatus: 'DISTRIBUTED',
        actorId: firmUserId,
        note: `Released to ${firm.lawyers.length} registered lawyer(s).`,
      },
    });
  });

  await notifyMany(
    firm.lawyers.map((lawyer) => lawyer.userId),
    {
      kind: 'case.offered',
      title: `New case offered by ${firm.legalName}: ${legalCase.reference}`,
      body: `“${legalCase.title}” has been released to the firm's lawyers. Take it, or pass and let a colleague pick it up.`,
      link: `/cases/${caseId}`,
    },
  );

  await notify({
    userId: legalCase.clientId,
    kind: 'case.distributed',
    title: `Your case ${legalCase.reference} is being assigned`,
    body: `${firm.legalName} has reviewed it and passed it to their lawyers. You will be told as soon as one takes it.`,
    link: `/cases/${caseId}`,
  });

  await recordAudit({
    actorUserId: firmUserId,
    action: 'case.distributed',
    entityType: 'legal_case',
    entityId: caseId,
    metadata: { reference: legalCase.reference, lawyers: firm.lawyers.length },
    ip: meta.ip ?? null,
  });

  return success({ offers: firm.lawyers.length });
}

/** The offers a lawyer has been given, still awaiting an answer. */
export async function listOffersForLawyer(lawyerUserId: string) {
  const profile = await prisma.lawyerProfile.findUnique({
    where: { userId: lawyerUserId },
    select: { id: true },
  });
  if (!profile) return [];

  return prisma.caseOffer.findMany({
    where: { lawyerId: profile.id, status: 'PENDING' },
    orderBy: { createdAt: 'desc' },
    include: { case: { include: CASE_INCLUDE } },
  });
}

/**
 * Declines a case a firm offered.
 *
 * Passing is not a rejection of the client: the case stays with the firm and goes
 * to whichever colleague takes it. Once everybody has passed the firm is told, so
 * the case cannot quietly stall.
 */
export async function passCaseOffer(
  caseId: string,
  lawyerUserId: string,
  note: string | null,
): Promise<ServiceResult> {
  const profile = await prisma.lawyerProfile.findUnique({
    where: { userId: lawyerUserId },
    select: { id: true, user: { select: { profile: { select: { fullName: true } } } } },
  });
  if (!profile) return failure('Only a lawyer can pass on an offered case.', { status: 403 });

  const offer = await prisma.caseOffer.findUnique({
    where: { caseId_lawyerId: { caseId, lawyerId: profile.id } },
    select: { id: true, status: true, case: { select: { reference: true, firmId: true, id: true } } },
  });
  if (!offer) return failure('That case was not offered to you.', { status: 404 });
  if (offer.status !== 'PENDING') return failure('You have already answered this offer.');

  await prisma.caseOffer.update({
    where: { id: offer.id },
    data: { status: 'PASSED', respondedAt: new Date(), note: note?.trim() || null },
  });

  const remaining = await prisma.caseOffer.count({
    where: { caseId, status: 'PENDING' },
  });

  const firm = offer.case.firmId
    ? await prisma.firmProfile.findUnique({
        where: { id: offer.case.firmId },
        select: { userId: true, legalName: true },
      })
    : null;

  const lawyerName = profile.user.profile?.fullName?.trim() || 'A lawyer';

  if (firm) {
    await notify({
      userId: firm.userId,
      kind: remaining === 0 ? 'case.offers_exhausted' : 'case.offer_passed',
      title:
        remaining === 0
          ? `Nobody has taken ${offer.case.reference} yet`
          : `${lawyerName} passed on ${offer.case.reference}`,
      body:
        remaining === 0
          ? 'Every lawyer you offered it to has passed. You can release it again, or handle it yourself.'
          : `${remaining} lawyer(s) still have this offer.`,
      link: `/cases/${caseId}`,
    });
  }

  await recordAudit({
    actorUserId: lawyerUserId,
    action: 'case.offer_passed',
    entityType: 'legal_case',
    entityId: caseId,
    metadata: { remaining, note: note?.trim() || null },
    ip: null,
  });

  return success();
}

/** The offers on a case, for the firm to see who has answered. */
export async function listCaseOffers(caseId: string) {
  return prisma.caseOffer.findMany({
    where: { caseId },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      status: true,
      note: true,
      respondedAt: true,
      lawyer: {
        select: {
          id: true,
          user: { select: { id: true, email: true, profile: { select: { fullName: true } } } },
        },
      },
    },
  });
}
