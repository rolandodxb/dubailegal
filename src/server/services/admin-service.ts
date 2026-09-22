import { prisma } from '@/lib/db';
import { recordAudit } from '@/lib/audit';
import { failure, success, type ServiceResult } from './result';

/**
 * Reviewer-side account administration.
 *
 * Two invariants protect the platform from locking itself out or from being
 * abused by whoever happens to hold the reviewer role:
 *  · a reviewer cannot suspend their own account;
 *  · a reviewer cannot remove their own reviewer role.
 */

export async function setUserSuspended(
  actorUserId: string,
  targetUserId: string,
  suspend: boolean,
  reason: string | null,
  meta: { ip?: string | null } = {},
): Promise<ServiceResult> {
  if (actorUserId === targetUserId) {
    return failure('You cannot suspend or reinstate your own account.');
  }

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, status: true, email: true },
  });
  if (!target) return failure('That account no longer exists.', { status: 404 });

  const nextStatus = suspend ? 'SUSPENDED' : 'ACTIVE';

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: targetUserId },
      data: {
        status: nextStatus,
        suspendedReason: suspend ? (reason?.trim() || 'No reason recorded.') : null,
      },
    });

    if (suspend) {
      // A suspended account must not retain live sessions.
      await tx.session.updateMany({
        where: { userId: targetUserId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
  });

  await recordAudit({
    actorUserId,
    action: suspend ? 'account.suspended' : 'account.reinstated',
    entityType: 'user',
    entityId: targetUserId,
    metadata: { reason: reason ?? null },
    ip: meta.ip ?? null,
  });

  return success();
}

export async function setReviewerRole(
  actorUserId: string,
  targetUserId: string,
  grant: boolean,
  meta: { ip?: string | null } = {},
): Promise<ServiceResult> {
  if (actorUserId === targetUserId && !grant) {
    return failure('You cannot remove your own reviewer access.');
  }

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, roles: true, email: true, accountType: true },
  });
  if (!target) return failure('That account no longer exists.', { status: 404 });

  const roles = new Set(target.roles);
  if (grant) roles.add('REVIEWER');
  else roles.delete('REVIEWER');

  await prisma.user.update({
    where: { id: targetUserId },
    data: { roles: Array.from(roles) },
  });

  await recordAudit({
    actorUserId,
    action: grant ? 'account.reviewer_granted' : 'account.reviewer_revoked',
    entityType: 'user',
    entityId: targetUserId,
    metadata: { role: 'REVIEWER' },
    ip: meta.ip ?? null,
  });

  return success();
}

export async function listUsersForAdmin(search?: string) {
  const term = search?.trim();
  return prisma.user.findMany({
    where: term
      ? {
          OR: [
            { email: { contains: term, mode: 'insensitive' } },
            { profile: { fullName: { contains: term, mode: 'insensitive' } } },
          ],
        }
      : undefined,
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true,
      email: true,
      accountType: true,
      status: true,
      roles: true,
      verificationStatus: true,
      verifiedAt: true,
      emailVerifiedAt: true,
      createdAt: true,
      suspendedReason: true,
      isDemo: true,
      profile: { select: { fullName: true, countryOfResidence: true } },
      _count: { select: { documents: true, verificationCases: true } },
    },
  });
}

/**
 * The outbox: every outbound message with its full body, including the
 * confirmation and reset links that would otherwise have been emailed.
 */
export async function listOutbox(limit = 50) {
  const rows = await prisma.emailMessage.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { user: { select: { id: true, email: true, accountType: true } } },
  });

  const counts = await prisma.emailMessage.groupBy({
    by: ['status'],
    _count: { _all: true },
  });

  return { rows, counts };
}

export async function getAuditTrail(limit = 60) {
  return prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { actor: { select: { id: true, email: true } } },
  });
}

/** Empties the traffic register. Recorded, because destroying evidence is itself evidence. */
export async function clearAllTraffic(
  actorUserId: string,
  meta: { ip?: string | null } = {},
): Promise<number> {
  const before = await prisma.trafficLog.count();
  await prisma.trafficLog.deleteMany({});

  await recordAudit({
    actorUserId,
    action: 'traffic.cleared',
    entityType: 'traffic_log',
    entityId: null,
    metadata: { removed: before },
    ip: meta.ip ?? null,
  });

  return before;
}

/**
 * Every legal case in the system, for an administrator to monitor.
 *
 * Read-only by design: an administrator oversees the platform and must not act
 * as a lawyer on it, so nothing here accepts, declines or progresses a case.
 */
export async function listCasesForAdmin(limit = 100) {
  return prisma.legalCase.findMany({
    orderBy: { submittedAt: 'desc' },
    take: limit,
    select: {
      id: true,
      reference: true,
      title: true,
      caseType: true,
      status: true,
      submittedAt: true,
      updatedAt: true,
      reviewedAt: true,
      assignedAt: true,
      completedAt: true,
      declinedAt: true,
      client: { select: { id: true, email: true, profile: { select: { fullName: true } } } },
      lawyer: {
        select: { id: true, user: { select: { id: true, email: true, profile: { select: { fullName: true } } } } },
      },
      firm: { select: { id: true, legalName: true } },
      _count: { select: { files: true, messages: true } },
    },
  });
}

/** Counts per case state, for the administrator's overview. */
export async function caseStatusCounts() {
  const rows = await prisma.legalCase.groupBy({
    by: ['status'],
    _count: { _all: true },
  });
  const result = new Map<string, number>();
  for (const row of rows) result.set(row.status, row._count._all);
  return result;
}

/**
 * Oversight view of a single case.
 *
 * Deliberately partial. An operator needs to see that a case exists, who is on
 * it and how it is progressing — not the client's account of their matter or the
 * messages exchanged about it, which may be legally privileged. The description
 * body, message contents and file contents are therefore not returned here, and
 * the screen says so.
 */
export async function getCaseForAdmin(caseId: string) {
  const legalCase = await prisma.legalCase.findUnique({
    where: { id: caseId },
    select: {
      id: true,
      reference: true,
      title: true,
      caseType: true,
      status: true,
      submittedAt: true,
      reviewedAt: true,
      assignedAt: true,
      completedAt: true,
      declinedAt: true,
      declineReason: true,
      client: {
        select: {
          id: true,
          email: true,
          status: true,
          accountType: true,
          verificationStatus: true,
          profile: { select: { fullName: true, countryOfResidence: true } },
        },
      },
      lawyer: {
        select: {
          id: true,
          licenseNumber: true,
          licensingAuthority: true,
          user: {
            select: { id: true, email: true, status: true, profile: { select: { fullName: true } } },
          },
        },
      },
      firm: { select: { id: true, legalName: true, tradeLicenseNumber: true } },
      files: { select: { id: true, fileName: true, sizeBytes: true, createdAt: true, uploadedById: true } },
      events: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          fromStatus: true,
          toStatus: true,
          note: true,
          createdAt: true,
          actor: { select: { id: true, email: true } },
        },
      },
      _count: { select: { messages: true, files: true } },
      review: { select: { id: true, rating: true, status: true, createdAt: true } },
    },
  });

  return legalCase;
}

/**
 * Deletes an account and everything that hangs off it.
 *
 * This is the hard delete, not a suspension: it is what removes a seeded sample
 * firm or a spam account for good. Two things are deliberately preserved rather
 * than cascaded away:
 *
 *   · the audit trail, which records that the deletion happened and who did it;
 *   · the other side's history — a case is removed with its client, but the
 *     professional's own record of having worked is not silently rewritten.
 *
 * The caller must type the account's email address, so a mistyped id cannot
 * delete the wrong person.
 */
export async function deleteAccount(
  actorUserId: string,
  targetUserId: string,
  confirmation: string,
  meta: { ip?: string | null } = {},
): Promise<ServiceResult<{ deletedEmail: string; documents: number }>> {
  if (actorUserId === targetUserId) {
    return failure('You cannot delete your own account from here.');
  }

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: {
      id: true,
      email: true,
      accountType: true,
      isDemo: true,
      roles: true,
      _count: { select: { documents: true, clientCases: true, sessions: true } },
    },
  });
  if (!target) return failure('That account no longer exists.', { status: 404 });

  if (confirmation.trim().toLowerCase() !== target.email.toLowerCase()) {
    return failure('The email address you typed does not match this account.', {
      fieldErrors: { confirm: 'Type the exact email address of the account you are deleting.' },
    });
  }

  if (target.roles.includes('REVIEWER')) {
    const reviewers = await prisma.user.count({ where: { roles: { has: 'REVIEWER' } } });
    if (reviewers <= 1) {
      return failure(
        'That is the only reviewer account. Grant reviewer access to somebody else first, or you will lock yourself out of this console.',
      );
    }
  }

  // Collect the files first: the rows are about to disappear.
  const [documents, caseFiles] = await Promise.all([
    prisma.document.findMany({ where: { userId: targetUserId }, select: { storageKey: true } }),
    prisma.caseFile.findMany({ where: { uploadedById: targetUserId }, select: { storageKey: true } }),
  ]);

  await recordAudit({
    actorUserId,
    action: 'account.deleted',
    entityType: 'user',
    entityId: targetUserId,
    metadata: {
      email: target.email,
      accountType: target.accountType,
      isDemo: target.isDemo,
      documents: documents.length,
      cases: target._count.clientCases,
    },
    ip: meta.ip ?? null,
  });

  await prisma.user.delete({ where: { id: targetUserId } });

  const { deleteUpload } = await import('@/lib/storage');
  for (const entry of [...documents, ...caseFiles]) {
    await deleteUpload(entry.storageKey).catch(() => undefined);
  }

  return success({ deletedEmail: target.email, documents: documents.length });
}

/** The admin view of emergency activity. */
export async function emergencyOverview() {
  const [open, accepted, expired, resolved, recent] = await Promise.all([
    prisma.emergencyRequest.count({ where: { status: 'OPEN' } }),
    prisma.emergencyRequest.count({ where: { status: 'ACCEPTED' } }),
    prisma.emergencyRequest.count({ where: { status: 'EXPIRED' } }),
    prisma.emergencyRequest.count({ where: { status: 'RESOLVED' } }),
    prisma.emergencyRequest.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        title: true,
        caseType: true,
        status: true,
        contactPhone: true,
        guestName: true,
        guestPhone: true,
        roomCode: true,
        createdAt: true,
        expiresAt: true,
        acceptedAt: true,
        client: { select: { id: true, email: true, profile: { select: { fullName: true } } } },
        acceptedBy: { select: { id: true, email: true, profile: { select: { fullName: true } } } },
        legalCase: { select: { id: true, reference: true, status: true } },
      },
    }),
  ]);

  const [availableLawyers, designatedContacts] = await Promise.all([
    prisma.lawyerProfile.count({ where: { acceptsEmergency: true } }),
    prisma.lawyerProfile.count({ where: { isFirmEmergency: true } }),
  ]);

  return { open, accepted, expired, resolved, recent, availableLawyers, designatedContacts };
}

/** Every meeting, so an operator can see what has been arranged. */
export async function appointmentOverview() {
  const rows = await prisma.appointment.findMany({
    orderBy: { startsAt: 'desc' },
    take: 100,
    select: {
      id: true,
      startsAt: true,
      status: true,
      mode: true,
      roomCode: true,
      officeAddress: true,
      confirmation: true,
      createdAt: true,
      client: { select: { id: true, email: true, profile: { select: { fullName: true } } } },
      lawyer: { select: { user: { select: { email: true, profile: { select: { fullName: true } } } } } },
      firm: { select: { legalName: true } },
      case: { select: { id: true, reference: true } },
    },
  });

  return {
    rows,
    videoCalls: rows.filter((row) => row.mode === 'VIDEO_CALL').length,
    officeVisits: rows.filter((row) => row.mode === 'OFFICE_VISIT').length,
    awaitingAnswer: rows.filter((row) => row.confirmation === 'PENDING').length,
  };
}

/**
 * Deletes every seeded sample account, in one action.
 *
 * The only fabricated records this installation can contain are the accounts
 * created by `npm run seed:demo`, and they are flagged `isDemo` from the moment
 * they are written. This is the counterweight to that: an operator can remove all
 * of them, and everything hanging off them, without hunting through the account
 * list for the addresses they happen to remember.
 *
 * Real accounts are never touched, whatever they are called.
 */
export async function deleteAllSampleData(
  actorUserId: string,
  confirmation: string,
  meta: { ip?: string | null } = {},
): Promise<
  ServiceResult<{ accounts: number; documents: number; cases: number; emails: string[] }>
> {
  if (confirmation.trim().toUpperCase() !== 'DELETE SAMPLE DATA') {
    return failure('Type DELETE SAMPLE DATA exactly to confirm.', {
      fieldErrors: { confirm: 'The phrase did not match.' },
    });
  }

  const accounts = await prisma.user.findMany({
    where: { isDemo: true },
    select: {
      id: true,
      email: true,
      roles: true,
      _count: { select: { documents: true, clientCases: true } },
    },
  });

  if (accounts.length === 0) {
    return success({ accounts: 0, documents: 0, cases: 0, emails: [] });
  }

  // A seeded account that is somehow the only reviewer must not take the console
  // down with it.
  const demoReviewers = accounts.filter((row) => row.roles.includes('REVIEWER'));
  if (demoReviewers.length > 0) {
    const reviewers = await prisma.user.count({ where: { roles: { has: 'REVIEWER' } } });
    if (reviewers <= demoReviewers.length) {
      return failure(
        'One of the sample accounts is the only reviewer. Grant reviewer access to a real account first.',
      );
    }
  }

  const ids = accounts.map((row) => row.id);

  // Files first: the rows that point at them are about to disappear.
  const [documents, caseFiles] = await Promise.all([
    prisma.document.findMany({ where: { userId: { in: ids } }, select: { storageKey: true } }),
    prisma.caseFile.findMany({ where: { uploadedById: { in: ids } }, select: { storageKey: true } }),
  ]);

  const cases = accounts.reduce((total, row) => total + row._count.clientCases, 0);

  await recordAudit({
    actorUserId,
    action: 'system.sample_data_deleted',
    entityType: 'system',
    entityId: 'sample-data',
    metadata: {
      accounts: accounts.length,
      documents: documents.length,
      cases,
      emails: accounts.map((row) => row.email),
    },
    ip: meta.ip ?? null,
  });

  await prisma.user.deleteMany({ where: { id: { in: ids } } });

  const { deleteUpload } = await import('@/lib/storage');
  for (const entry of [...documents, ...caseFiles]) {
    await deleteUpload(entry.storageKey).catch(() => undefined);
  }

  return success({
    accounts: accounts.length,
    documents: documents.length,
    cases,
    emails: accounts.map((row) => row.email),
  });
}

/** How many seeded sample accounts exist, so the button can say so before it is pressed. */
export async function sampleDataSummary() {
  const [accounts, documents, cases] = await Promise.all([
    prisma.user.findMany({
      where: { isDemo: true },
      select: { id: true, email: true, accountType: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.document.count({ where: { user: { isDemo: true } } }),
    prisma.legalCase.count({
      where: {
        OR: [
          { client: { isDemo: true } },
          { actionedBy: { is: { isDemo: true } } },
          { lawyer: { is: { user: { isDemo: true } } } },
          { firm: { is: { user: { isDemo: true } } } },
        ],
      },
    }),
  ]);

  return { accounts, documents, cases };
}
