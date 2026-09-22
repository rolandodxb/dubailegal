import { prisma } from './db';
import { hashIp } from './tokens';

export type AuditEntry = {
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  ip?: string | null;
};

/**
 * Appends to the audit log.
 *
 * Written for consequential actions: verification decisions, document reviews,
 * credential changes, role grants, session revocation. Failures are logged and
 * swallowed so that a transient audit-write problem cannot block a user's
 * action mid-flight; the caller's own database write has already succeeded at
 * that point. Deployments that require audit-before-commit should move this
 * into the same transaction as the action it records.
 */
export async function recordAudit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorUserId: entry.actorUserId ?? null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId ?? null,
        metadata: (entry.metadata ?? undefined) as never,
        ipHash: hashIp(entry.ip),
      },
    });
  } catch (error) {
    console.error('[audit] failed to record entry', entry.action, error);
  }
}
