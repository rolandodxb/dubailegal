import { prisma } from '@/lib/db';
import { recordAudit } from '@/lib/audit';
import { listingSchema } from '@/lib/validation';
import { fromZodError, failure, success, type ServiceResult } from './result';

/**
 * Creates or updates the public directory entry. Lawyers and firms only.
 *
 * Nothing is published implicitly: `published` is set by the owner ticking the
 * box, and a listing stays a private draft until then.
 */
export async function saveListing(
  userId: string,
  rawInput: unknown,
  meta: { ip?: string | null } = {},
): Promise<ServiceResult<{ published: boolean }>> {
  const parsed = listingSchema.safeParse(rawInput);
  if (!parsed.success) return fromZodError(parsed.error);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { accountType: true, verificationStatus: true },
  });
  if (!user) return failure('That account no longer exists.', { status: 404 });
  if (user.accountType !== 'LAWYER' && user.accountType !== 'FIRM') {
    return failure('Only lawyer and legal-firm accounts can appear in the directory.', { status: 403 });
  }

  const data = parsed.data;

  await prisma.listing.upsert({
    where: { userId },
    create: { userId, kind: user.accountType, ...data },
    update: { ...data },
  });

  await recordAudit({
    actorUserId: userId,
    action: data.published ? 'listing.published' : 'listing.saved_draft',
    entityType: 'listing',
    entityId: userId,
    metadata: { areas: data.areas.length, emirates: data.emirates.length },
    ip: meta.ip ?? null,
  });

  return success({ published: data.published });
}

export async function getListingForEdit(userId: string) {
  return prisma.listing.findUnique({ where: { userId } });
}

/** Takes a listing out of the public directory without discarding it. */
export async function unpublishListing(
  userId: string,
  meta: { ip?: string | null } = {},
): Promise<ServiceResult> {
  const existing = await prisma.listing.findUnique({ where: { userId }, select: { id: true } });
  if (!existing) return failure('You do not have a directory listing yet.', { status: 404 });

  await prisma.listing.update({ where: { userId }, data: { published: false } });
  await recordAudit({
    actorUserId: userId,
    action: 'listing.unpublished',
    entityType: 'listing',
    entityId: existing.id,
    ip: meta.ip ?? null,
  });
  return success();
}

/**
 * Note on lapsed verification: the directory reads verification status live
 * from the user record rather than caching it on the listing, so a professional
 * whose approval is withdrawn immediately stops showing a verified badge. There
 * is deliberately no code path here that edits verification state — listings
 * and verification are separate concerns.
 */
