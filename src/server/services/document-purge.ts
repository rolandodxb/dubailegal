import { prisma } from '@/lib/db';
import { deleteUpload } from '@/lib/storage';
import { recordAudit } from '@/lib/audit';

/**
 * Evidence is destroyed the moment it has done its job.
 *
 * A reviewer approves an account by looking at an Emirates ID, a practising
 * certificate or a trade licence. Once that decision is recorded, the image of
 * the document has no further purpose — and keeping it is a liability, not an
 * asset: an identity document is the most sensitive thing this application ever
 * holds, and a copy that nobody needs is a copy that can only leak.
 *
 * So on approval the bytes are deleted from storage and the row is reduced to
 * the fact that a document of that kind was reviewed and accepted. What remains
 * proves the decision without holding the evidence:
 *
 *   · the kind, when it was reviewed, who reviewed it and the notes;
 *   · the SHA-256 of the file that was reviewed, so a dispute can still be
 *     answered without the file itself;
 *   · the Emirates ID fingerprint on the profile, which is what keeps one
 *     identity from backing two accounts.
 *
 * The profile photo and a firm's own billing mark are deliberately **not**
 * destroyed: they are not evidence, they are things the member uses every day,
 * and deleting them would take their face off their own profile.
 */
const KINDS_KEPT_ON_APPROVAL: string[] = ['PROFILE_PHOTO', 'BRAND_LOGO'];

export type PurgeSummary = { purged: number; kept: number; failed: number };

/** Replaces a file name with a marker that says the file is gone on purpose. */
const PURGED_NAME = 'purged after verification';

export async function purgeCaseEvidence(
  caseId: string,
  actorUserId: string,
  meta: { ip?: string | null } = {},
): Promise<PurgeSummary> {
  const documents = await prisma.document.findMany({
    where: { caseId },
    select: { id: true, kind: true, storageKey: true, userId: true, sha256: true },
  });

  const summary: PurgeSummary = { purged: 0, kept: 0, failed: 0 };

  for (const document of documents) {
    if (KINDS_KEPT_ON_APPROVAL.includes(document.kind)) {
      summary.kept += 1;
      continue;
    }

    // The bytes first: a row without a file is recoverable, a file without a row
    // is not, and the point is that the file goes.
    try {
      await deleteUpload(document.storageKey);
    } catch {
      summary.failed += 1;
      continue;
    }

    await prisma.document.update({
      where: { id: document.id },
      data: {
        storageKey: `purged:${document.id}`,
        fileName: PURGED_NAME,
        mimeType: 'application/octet-stream',
        sizeBytes: 0,
        purgedAt: new Date(),
      },
    });

    summary.purged += 1;
  }

  if (summary.purged > 0) {
    await recordAudit({
      actorUserId,
      action: 'verification.evidence_purged',
      entityType: 'verification_case',
      entityId: caseId,
      metadata: { purged: summary.purged, kept: summary.kept, failed: summary.failed },
      ip: meta.ip ?? null,
    });
  }

  return summary;
}

/** Whether a document has already had its bytes destroyed. */
export function isPurged(storageKey: string): boolean {
  return storageKey.startsWith('purged:');
}
