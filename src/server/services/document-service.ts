import { DocumentKind } from '@prisma/client';
import { prisma } from '@/lib/db';
import { recordAudit } from '@/lib/audit';
import { deleteUpload, storeUpload, UploadRejected } from '@/lib/storage';
import { documentRequirementsFor, optionalKinds } from '@/lib/document-requirements';
import { failure, success, type ServiceResult } from './result';
import { invalidateVerification } from './verification-service';

function isDocumentKind(value: string): value is DocumentKind {
  return Object.prototype.hasOwnProperty.call(DocumentKind, value);
}

const OPEN_CASE_STATUSES = ['SUBMITTED', 'UNDER_REVIEW'] as const;

async function hasOpenCase(userId: string): Promise<boolean> {
  const count = await prisma.verificationCase.count({
    where: { userId, status: { in: [...OPEN_CASE_STATUSES] } },
  });
  return count > 0;
}

/**
 * Stores one piece of evidence against an account.
 *
 * Replacing a document supersedes the previous one of the same kind rather than
 * deleting it, so a reviewer always sees the current evidence and the history
 * is preserved. Uploading is blocked while a case is with a reviewer, because
 * the evidence must not change under a decision in progress.
 */
export async function uploadDocument(
  userId: string,
  input: {
    kind: string;
    file: File;
    documentNumber?: string | null;
    expiresOn?: Date | null;
  },
  meta: { ip?: string | null } = {},
): Promise<ServiceResult<{ documentId: string }>> {
  if (!isDocumentKind(input.kind)) {
    return failure('Choose what kind of document you are uploading.', {
      fieldErrors: { kind: 'Choose a document type.' },
    });
  }
  const kind = input.kind;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      accountType: true,
      verificationStatus: true,
      profile: {
        select: {
          countryOfBirthCode: true,
          nationalityCode: true,
          countryOfResidenceCode: true,
          declaresNoResidencePermit: true,
        },
      },
    },
  });
  if (!user) return failure('That account no longer exists.', { status: 404 });

  // A profile picture is not part of what a reviewer is judging, so it stays
  // editable while a verification request is open. Evidence does not.
  if (kind !== 'PROFILE_PHOTO' && (await hasOpenCase(userId))) {
    return failure(
      'Your documents are with a reviewer right now. Withdraw the request from the verification page if you need to replace a document.',
      { status: 409 },
    );
  }

  // Whether an approved version of this kind existed decides if the replacement
  // invalidates an existing approval.
  const previouslyApproved = await prisma.document.findFirst({
    where: { userId, kind, status: 'APPROVED' },
    select: { id: true },
  });

  let stored;
  try {
    stored = await storeUpload(input.file, userId);
  } catch (error) {
    if (error instanceof UploadRejected) {
      return failure(error.message, { fieldErrors: { file: error.message } });
    }
    console.error('[documents] upload failed', error);
    return failure('The file could not be stored. Please try again.', { status: 500 });
  }

  const created = await prisma.$transaction(async (tx) => {
    await tx.document.updateMany({
      where: { userId, kind, status: { not: 'SUPERSEDED' } },
      data: { status: 'SUPERSEDED' },
    });

    const document = await tx.document.create({
      data: {
        userId,
        kind,
        // A profile picture and a billing mark are not evidence of anything, so
        // they are live the moment they are uploaded. Nothing puts them in a
        // reviewer's queue, and nothing tells the member they are waiting.
        status: kind === 'PROFILE_PHOTO' || kind === 'BRAND_LOGO' ? 'APPROVED' : 'AWAITING_REVIEW',
        storageKey: stored.storageKey,
        fileName: stored.fileName,
        mimeType: stored.mimeType,
        sizeBytes: stored.sizeBytes,
        sha256: stored.sha256,
        documentNumber: input.documentNumber?.trim() || null,
        expiresOn: input.expiresOn ?? null,
      },
    });

    if (kind === 'PROFILE_PHOTO') {
      await tx.profile.update({
        where: { userId },
        data: { avatarDocumentId: document.id },
      });
    }

    return document;
  });

  // Required of *this* member, in their country — not of everybody in the Emirates.
  const required = documentRequirementsFor({
    accountType: user.accountType,
    countryOfBirthCode: user.profile?.countryOfBirthCode,
    nationalityCode: user.profile?.nationalityCode,
    countryOfResidenceCode: user.profile?.countryOfResidenceCode,
    declaresNoResidencePermit: user.profile?.declaresNoResidencePermit,
  }).required;
  if (previouslyApproved && required.includes(kind) && user.verificationStatus === 'APPROVED') {
    await invalidateVerification(
      userId,
      `Required document replaced: ${kind}`,
      meta.ip ?? null,
    );
  }

  await recordAudit({
    actorUserId: userId,
    action: 'document.uploaded',
    entityType: 'document',
    entityId: created.id,
    metadata: { kind, sizeBytes: stored.sizeBytes, supersededApproved: Boolean(previouslyApproved) },
    ip: meta.ip ?? null,
  });

  return success({ documentId: created.id });
}

export async function deleteDocument(
  userId: string,
  documentId: string,
  meta: { ip?: string | null } = {},
): Promise<ServiceResult> {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: { id: true, userId: true, kind: true, storageKey: true, status: true },
  });
  if (!document) return failure('That document no longer exists.', { status: 404 });
  if (document.userId !== userId) return failure('That document does not belong to you.', { status: 403 });

  if (document.kind !== 'PROFILE_PHOTO' && (await hasOpenCase(userId))) {
    return failure('Your documents are with a reviewer. Withdraw the request first.', { status: 409 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      accountType: true,
      verificationStatus: true,
      profile: {
        select: {
          avatarDocumentId: true,
          countryOfBirthCode: true,
          nationalityCode: true,
          countryOfResidenceCode: true,
          declaresNoResidencePermit: true,
        },
      },
    },
  });

  await prisma.$transaction(async (tx) => {
    if (user?.profile?.avatarDocumentId === documentId) {
      await tx.profile.update({ where: { userId }, data: { avatarDocumentId: null } });
    }
    await tx.document.delete({ where: { id: documentId } });
  });

  try {
    await deleteUpload(document.storageKey);
  } catch (error) {
    // The row is gone; an orphaned file is a housekeeping problem, not a user-facing one.
    console.error('[documents] could not remove file from disk', document.storageKey, error);
  }

  if (
    user &&
    document.status === 'APPROVED' &&
    documentRequirementsFor({
      accountType: user.accountType,
      countryOfBirthCode: user.profile?.countryOfBirthCode,
      nationalityCode: user.profile?.nationalityCode,
      countryOfResidenceCode: user.profile?.countryOfResidenceCode,
      declaresNoResidencePermit: user.profile?.declaresNoResidencePermit,
    }).required.includes(document.kind) &&
    user.verificationStatus === 'APPROVED'
  ) {
    await invalidateVerification(userId, `Required document removed: ${document.kind}`, meta.ip ?? null);
  }

  await recordAudit({
    actorUserId: userId,
    action: 'document.deleted',
    entityType: 'document',
    entityId: documentId,
    metadata: { kind: document.kind },
    ip: meta.ip ?? null,
  });

  return success();
}

export async function listOwnDocuments(userId: string) {
  return prisma.document.findMany({
    where: { userId, status: { not: 'SUPERSEDED' } },
    orderBy: [{ kind: 'asc' }, { createdAt: 'desc' }],
  });
}
