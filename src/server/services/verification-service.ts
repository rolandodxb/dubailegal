import { prisma } from '@/lib/db';
import { recordAudit } from '@/lib/audit';
import {
  DOCUMENT_REQUIREMENTS,
  DOCUMENT_KIND_LABEL,
} from '@/lib/constants';
import type { AccountType, DocumentKind, VerificationStatus } from '@prisma/client';
import { failure, success, type ServiceResult } from './result';
import { verificationDecisionSchema } from '@/lib/validation';
import { fromZodError } from './result';

/** Statuses that count as "this evidence is currently on file". */
const USABLE_DOCUMENT_STATUSES = ['AWAITING_REVIEW', 'APPROVED'] as const;

const PROFILE_FIELD_LABELS: Record<string, string> = {
  fullName: 'Full name',
  dateOfBirth: 'Date of birth',
  placeOfBirth: 'Place of birth',
  countryOfResidence: 'Country of residence',
  phone: 'Phone number',
  emiratesIdNumber: 'Emirates ID number',
  workDescription: 'Description of your work',
  educationBackground: 'Education background',
};

export type VerificationOverview = Awaited<ReturnType<typeof getVerificationOverview>>;

/**
 * Withdraws an approval when the evidence behind it changes.
 *
 * A "verified" badge is a statement about evidence a named reviewer examined.
 * Once that evidence is replaced — a new Emirates ID, a new licence — the
 * statement is no longer true, so the account returns to UNVERIFIED and must be
 * reviewed again.
 */
export async function invalidateVerification(
  userId: string,
  reason: string,
  ip: string | null,
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { verificationStatus: true },
  });
  if (!user) return;

  await prisma.user.update({
    where: { id: userId },
    data: { verificationStatus: 'UNVERIFIED', verifiedAt: null, verifiedById: null },
  });

  await recordAudit({
    actorUserId: userId,
    action: 'verification.invalidated',
    entityType: 'user',
    entityId: userId,
    metadata: { reason, previousStatus: user.verificationStatus },
    ip,
  });
}

export async function getVerificationOverview(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
      lawyerProfile: true,
      firmProfile: true,
      documents: {
        // A profile picture and a billing mark are part of using the product, not
        // evidence of anything, so neither is ever part of a verification request.
        where: {
          status: { not: 'SUPERSEDED' },
          kind: { notIn: ['BRAND_LOGO', 'PROFILE_PHOTO'] },
        },
        orderBy: { createdAt: 'desc' },
      },
      verificationCases: {
        orderBy: { round: 'desc' },
        include: { reviewer: { select: { id: true, email: true } } },
      },
    },
  });

  if (!user) return null;

  const accountType = user.accountType as AccountType;
  const requirements = DOCUMENT_REQUIREMENTS[accountType];

  const accountTypeName =
    accountType === 'FIRM' ? 'legal firm' : accountType === 'LAWYER' ? 'lawyer' : 'individual';

  // ── Profile completeness ──────────────────────────────────────────────────
  const missingProfileFields: string[] = [];
  const profile = user.profile;
  const requiredProfileKeys: (keyof typeof PROFILE_FIELD_LABELS)[] = [
    'fullName',
    'dateOfBirth',
    'placeOfBirth',
    'countryOfResidence',
    'phone',
    'emiratesIdNumber',
    'workDescription',
    'educationBackground',
  ];
  for (const key of requiredProfileKeys) {
    const value = profile ? (profile as Record<string, unknown>)[key] : null;
    const isEmpty =
      value === null ||
      value === undefined ||
      (typeof value === 'string' && value.trim().length === 0);
    if (isEmpty) missingProfileFields.push(PROFILE_FIELD_LABELS[key]);
  }

  // ── Credentials ───────────────────────────────────────────────────────────
  const needsCredential = accountType === 'LAWYER' || accountType === 'FIRM';
  const hasCredential =
    accountType === 'LAWYER'
      ? Boolean(user.lawyerProfile)
      : accountType === 'FIRM'
        ? Boolean(user.firmProfile)
        : true;

  // ── Documents ─────────────────────────────────────────────────────────────
  const usableDocs = user.documents.filter((doc) =>
    (USABLE_DOCUMENT_STATUSES as readonly string[]).includes(doc.status),
  );
  const presentKinds = new Set(usableDocs.map((doc) => doc.kind));
  const missingDocuments = requirements.required.filter((kind) => !presentKinds.has(kind));

  const emailVerified = user.emailVerifiedAt !== null;
  const openCase = user.verificationCases.find(
    (item) => item.status === 'SUBMITTED' || item.status === 'UNDER_REVIEW',
  );

  const blockers: string[] = [];
  if (!emailVerified) blockers.push('Confirm your email address.');
  if (missingProfileFields.length > 0) {
    blockers.push(`Complete your profile: ${missingProfileFields.join(', ')}.`);
  }
  if (needsCredential && !hasCredential) {
    blockers.push(
      accountType === 'FIRM'
        ? 'Add your firm\u2019s legal registration details.'
        : 'Add your legal licence details.',
    );
  }
  if (missingDocuments.length > 0) {
    blockers.push(
      `Upload the required documents: ${missingDocuments
        .map((kind) => DOCUMENT_KIND_LABEL[kind])
        .join(', ')}.`,
    );
  }
  if (openCase) blockers.push('A verification request is already with our reviewers.');

  const checkDigitWarning =
    profile?.emiratesIdCheckDigitOk === false
      ? 'The Emirates ID you entered does not pass its internal check digit. That does not block you — a reviewer will confirm it against your uploaded card — but please re-read the number if you typed it by hand.'
      : null;

  return {
    user,
    profile,
    accountType,
    accountTypeName,
    requirements,
    documents: user.documents,
    cases: user.verificationCases,
    openCase: openCase ?? null,
    latestCase: user.verificationCases[0] ?? null,
    status: user.verificationStatus as VerificationStatus,
    missingProfileFields,
    missingDocuments,
    hasCredential,
    needsCredential,
    emailVerified,
    checkDigitWarning,
    blockers,
    canSubmit: blockers.length === 0,
  };
}

// ── Applicant actions ────────────────────────────────────────────────────────

export async function submitForVerification(
  userId: string,
  meta: { ip?: string | null } = {},
): Promise<ServiceResult<{ caseId: string; round: number }>> {
  const overview = await getVerificationOverview(userId);
  if (!overview) return failure('That account no longer exists.', { status: 404 });

  if (!overview.canSubmit) {
    return failure(overview.blockers.join(' '), { status: 400 });
  }

  const previousRounds = await prisma.verificationCase.count({ where: { userId } });
  const round = previousRounds + 1;

  const usable = overview.documents.filter((doc) =>
    (USABLE_DOCUMENT_STATUSES as readonly string[]).includes(doc.status),
  );

  const created = await prisma.$transaction(async (tx) => {
    const verificationCase = await tx.verificationCase.create({
      data: {
        userId,
        round,
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
    });

    await tx.document.updateMany({
      where: { id: { in: usable.map((doc) => doc.id) } },
      data: { caseId: verificationCase.id },
    });

    await tx.user.update({
      where: { id: userId },
      data: { verificationStatus: 'PENDING' },
    });

    return verificationCase;
  });

  await recordAudit({
    actorUserId: userId,
    action: 'verification.submitted',
    entityType: 'verification_case',
    entityId: created.id,
    metadata: { round, documents: usable.length },
    ip: meta.ip ?? null,
  });

  return success({ caseId: created.id, round });
}

export async function withdrawSubmission(
  userId: string,
  meta: { ip?: string | null } = {},
): Promise<ServiceResult> {
  const openCase = await prisma.verificationCase.findFirst({
    where: { userId, status: { in: ['SUBMITTED', 'UNDER_REVIEW'] } },
    select: { id: true },
  });
  if (!openCase) return failure('You have no verification request in progress.', { status: 404 });

  await prisma.$transaction([
    prisma.verificationCase.update({
      where: { id: openCase.id },
      data: { status: 'WITHDRAWN', decidedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { verificationStatus: 'UNVERIFIED' },
    }),
  ]);

  await recordAudit({
    actorUserId: userId,
    action: 'verification.withdrawn',
    entityType: 'verification_case',
    entityId: openCase.id,
    ip: meta.ip ?? null,
  });

  return success();
}

// ── Reviewer actions ─────────────────────────────────────────────────────────

export async function listReviewQueue() {
  const [queue, decided] = await Promise.all([
    prisma.verificationCase.findMany({
      where: { status: { in: ['SUBMITTED', 'UNDER_REVIEW'] } },
      orderBy: { submittedAt: 'asc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            accountType: true,
            verificationStatus: true,
            isDemo: true,
            profile: { select: { fullName: true, phone: true, countryOfResidence: true } },
          },
        },
        reviewer: { select: { id: true, email: true } },
        _count: { select: { documents: true } },
      },
    }),
    prisma.verificationCase.findMany({
      where: { status: { in: ['APPROVED', 'REJECTED', 'WITHDRAWN'] } },
      orderBy: { decidedAt: 'desc' },
      take: 25,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            accountType: true,
            isDemo: true,
            profile: { select: { fullName: true } },
          },
        },
        reviewer: { select: { id: true, email: true } },
      },
    }),
  ]);

  return { queue, decided };
}

export async function getCaseForReview(caseId: string, reviewerId: string, ip: string | null) {
  const verificationCase = await prisma.verificationCase.findUnique({
    where: { id: caseId },
    include: {
      user: {
        include: {
          profile: true,
          lawyerProfile: true,
          firmProfile: true,
          listing: true,
          documents: {
            where: { status: { not: 'SUPERSEDED' } },
            orderBy: { createdAt: 'desc' },
          },
        },
      },
      documents: { orderBy: { createdAt: 'desc' } },
      reviewer: { select: { id: true, email: true } },
    },
  });
  if (!verificationCase) return null;

  // Reading a case exposes a full Emirates ID, so the read itself is recorded.
  await recordAudit({
    actorUserId: reviewerId,
    action: 'verification.case_viewed',
    entityType: 'verification_case',
    entityId: caseId,
    metadata: { subjectUserId: verificationCase.userId },
    ip,
  });

  return verificationCase;
}

export async function claimCase(
  caseId: string,
  reviewerId: string,
  meta: { ip?: string | null } = {},
): Promise<ServiceResult> {
  const verificationCase = await prisma.verificationCase.findUnique({
    where: { id: caseId },
    select: { id: true, status: true, userId: true, reviewerId: true },
  });
  if (!verificationCase) return failure('That verification case no longer exists.', { status: 404 });
  if (verificationCase.status === 'APPROVED' || verificationCase.status === 'REJECTED') {
    return failure('This request has already been decided.');
  }
  if (verificationCase.status === 'WITHDRAWN') {
    return failure('The applicant withdrew this request.');
  }
  if (verificationCase.reviewerId && verificationCase.reviewerId !== reviewerId) {
    return failure('Another reviewer has already claimed this case.');
  }

  await prisma.$transaction([
    prisma.verificationCase.update({
      where: { id: caseId },
      data: { status: 'UNDER_REVIEW', reviewerId, claimedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: verificationCase.userId },
      data: { verificationStatus: 'UNDER_REVIEW' },
    }),
  ]);

  await recordAudit({
    actorUserId: reviewerId,
    action: 'verification.case_claimed',
    entityType: 'verification_case',
    entityId: caseId,
    ip: meta.ip ?? null,
  });

  return success();
}

export async function reviewDocument(
  documentId: string,
  reviewerId: string,
  decision: 'APPROVED' | 'REJECTED',
  notes: string | null,
  meta: { ip?: string | null } = {},
): Promise<ServiceResult> {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: { id: true, userId: true, caseId: true, case: { select: { status: true, reviewerId: true } } },
  });
  if (!document) return failure('That document no longer exists.', { status: 404 });
  if (!document.caseId || !document.case) {
    return failure('That document is not part of a verification case.');
  }
  if (document.case.status !== 'UNDER_REVIEW') {
    return failure('Take the request before reviewing its documents.');
  }
  if (!document.case.reviewerId) {
    return failure('That request has no assigned reviewer.');
  }
  if (decision === 'REJECTED' && (!notes || notes.trim().length < 5)) {
    return failure('Say why this document is not acceptable so the applicant can fix it.', {
      fieldErrors: { notes: 'Explain what is wrong with this document.' },
    });
  }

  await prisma.document.update({
    where: { id: documentId },
    data: {
      status: decision,
      reviewNotes: notes?.trim() || null,
      reviewedAt: new Date(),
      reviewerId,
    },
  });

  await recordAudit({
    actorUserId: reviewerId,
    action: decision === 'APPROVED' ? 'document.approved' : 'document.rejected',
    entityType: 'document',
    entityId: documentId,
    metadata: { subjectUserId: document.userId },
    ip: meta.ip ?? null,
  });

  return success();
}

export async function decideCase(
  caseId: string,
  reviewerId: string,
  rawInput: unknown,
  meta: { ip?: string | null } = {},
): Promise<ServiceResult<{ decision: 'APPROVED' | 'REJECTED' }>> {
  const parsed = verificationDecisionSchema.safeParse(rawInput);
  if (!parsed.success) return fromZodError(parsed.error);

  const verificationCase = await prisma.verificationCase.findUnique({
    where: { id: caseId },
    include: {
      user: { select: { id: true, accountType: true, status: true } },
      documents: { select: { id: true, kind: true, status: true } },
    },
  });
  if (!verificationCase) return failure('That verification case no longer exists.', { status: 404 });
  if (verificationCase.id !== parsed.data.caseId) {
    return failure('The case reference did not match.');
  }
  if (verificationCase.status === 'APPROVED' || verificationCase.status === 'REJECTED') {
    return failure('This request has already been decided.');
  }
  if (verificationCase.status === 'WITHDRAWN') {
    return failure('The applicant withdrew this request.');
  }
  if (verificationCase.user.status === 'SUSPENDED') {
    return failure('This account is suspended; lift the suspension before deciding.');
  }
  if (verificationCase.reviewerId && verificationCase.reviewerId !== reviewerId) {
    return failure('Another reviewer has claimed this case.');
  }

  const decision = parsed.data.decision;
  const notes = parsed.data.notes?.trim() || null;

  if (decision === 'APPROVED') {
    // Approval demands that every required document be individually accepted by
    // the reviewer. A case can never be approved on the strength of documents
    // that were merely uploaded, or that nobody has looked at yet.
    const accountType = verificationCase.user.accountType as AccountType;
    const required = DOCUMENT_REQUIREMENTS[accountType].required;
    const byKind = new Map<DocumentKind, string[]>();
    for (const doc of verificationCase.documents) {
      const list = byKind.get(doc.kind) ?? [];
      list.push(doc.status);
      byKind.set(doc.kind, list);
    }
    const problems: string[] = [];
    for (const kind of required) {
      const statuses = byKind.get(kind) ?? [];
      if (statuses.length === 0) {
        problems.push(`${DOCUMENT_KIND_LABEL[kind]} is missing from this case.`);
      } else if (!statuses.includes('APPROVED')) {
        problems.push(`${DOCUMENT_KIND_LABEL[kind]} has not been accepted yet.`);
      }
    }
    if (problems.length > 0) {
      return failure(problems.join(' '), { status: 400 });
    }
  }

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.verificationCase.update({
      where: { id: caseId },
      data: {
        status: decision,
        decidedAt: now,
        reviewerId,
        claimedAt: verificationCase.status === 'SUBMITTED' ? now : undefined,
        decisionNotes: notes,
      },
    });

    if (decision === 'APPROVED') {
      await tx.document.updateMany({
        where: { caseId, status: 'AWAITING_REVIEW' },
        data: { status: 'APPROVED', reviewedAt: now, reviewerId },
      });
      await tx.user.update({
        where: { id: verificationCase.userId },
        data: { verificationStatus: 'APPROVED', verifiedAt: now, verifiedById: reviewerId },
      });
    } else {
      await tx.user.update({
        where: { id: verificationCase.userId },
        data: { verificationStatus: 'REJECTED', verifiedAt: null, verifiedById: null },
      });
    }
  });

  await recordAudit({
    actorUserId: reviewerId,
    action: decision === 'APPROVED' ? 'verification.approved' : 'verification.rejected',
    entityType: 'verification_case',
    entityId: caseId,
    metadata: { subjectUserId: verificationCase.userId, accountType: verificationCase.user.accountType },
    ip: meta.ip ?? null,
  });

  return success({ decision });
}
