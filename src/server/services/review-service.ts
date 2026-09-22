import { z } from 'zod';
import { prisma } from '@/lib/db';
import { invalidate } from '@/lib/ttl-cache';
import { cached } from '@/lib/ttl-cache';
import { recordAudit } from '@/lib/audit';
import { notify } from './notification-service';
import { fromZodError, failure, success, type ServiceResult } from './result';

/**
 * Reviews.
 *
 * The point of a review here is that it cannot be fabricated: it may only be
 * written against a case the professional actually accepted, and the case can
 * carry exactly one review (enforced by a unique constraint on caseId). That is
 * the whole integrity argument for showing a rating at all.
 *
 * Nothing in the directory is ordered by rating, so a score cannot be gamed to
 * buy position.
 */

export const reviewSchema = z.object({
  caseId: z.string().min(1, 'Choose the case you are reviewing.'),
  rating: z.coerce
    .number()
    .int()
    .min(1, 'Choose a rating from 1 to 5.')
    .max(5, 'Choose a rating from 1 to 5.'),
  title: z
    .string()
    .trim()
    .max(120, 'Keep the title under 120 characters.')
    .optional()
    .nullable()
    .transform((value) => (value && value.length > 0 ? value : null)),
  body: z
    .string()
    .trim()
    .min(20, 'Write at least 20 characters so the review is useful to others.')
    .max(4000, 'Keep the review under 4000 characters.'),
});

/** Cases that entitle a client to review the professional. */
const REVIEWABLE_STATUSES = ['ASSIGNED', 'IN_PROGRESS', 'COMPLETED'] as const;

/**
 * The cases this client may still review, with the professional they were with.
 * Used to populate the review form.
 */
export async function listReviewableCases(authorId: string) {
  return prisma.legalCase.findMany({
    where: {
      clientId: authorId,
      status: { in: [...REVIEWABLE_STATUSES] },
      lawyerId: { not: null },
      review: null,
      listingId: { not: null },
    },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      reference: true,
      title: true,
      listingId: true,
      lawyer: { select: { user: { select: { id: true, profile: { select: { fullName: true } } } } } },
      firm: { select: { legalName: true } },
    },
  });
}

export async function createReview(
  authorId: string,
  rawInput: unknown,
  meta: { ip?: string | null } = {},
): Promise<ServiceResult<{ reviewId: string; listingId: string }>> {
  const parsed = reviewSchema.safeParse(rawInput);
  if (!parsed.success) return fromZodError(parsed.error);

  const legalCase = await prisma.legalCase.findUnique({
    where: { id: parsed.data.caseId },
    select: {
      id: true,
      reference: true,
      title: true,
      clientId: true,
      listingId: true,
      lawyerId: true,
      status: true,
      lawyer: { select: { userId: true, user: { select: { profile: { select: { fullName: true } } } } } },
      firm: { select: { userId: true, legalName: true } },
      review: { select: { id: true } },
    },
  });

  if (!legalCase) return failure('That case no longer exists.', { status: 404 });
  if (legalCase.clientId !== authorId) {
    return failure('Only the client on a case can review the professional who handled it.', {
      status: 403,
    });
  }
  if (!legalCase.listingId || (!legalCase.lawyerId && !legalCase.firm)) {
    return failure('There is no professional to review on that case.');
  }
  if (!(REVIEWABLE_STATUSES as readonly string[]).includes(legalCase.status)) {
    return failure('You can review a professional once they have accepted your case.');
  }
  if (legalCase.review) {
    return failure('You have already reviewed this case.');
  }

  // A case addressed to a firm is reviewed against the firm; a case sent to a
  // named lawyer is reviewed against that lawyer.
  const targetUserId = legalCase.firm?.userId ?? legalCase.lawyer?.userId ?? null;
  if (!targetUserId) return failure('There is no professional to review on that case.');

  const review = await prisma.review.create({
    data: {
      listingId: legalCase.listingId,
      targetUserId,
      authorId,
      caseId: legalCase.id,
      rating: parsed.data.rating,
      title: parsed.data.title,
      body: parsed.data.body,
      status: 'PUBLISHED',
    },
    select: { id: true },
  });

  const targetName =
    legalCase.firm?.legalName ??
    legalCase.lawyer?.user.profile?.fullName?.trim() ??
    'your professional';

  await notify({
    userId: targetUserId,
    kind: 'review.received',
    title: `You received a ${parsed.data.rating}-star review`,
    body: `${targetName} was reviewed on case ${legalCase.reference}.`,
    link: '/reviews',
  });

  await recordAudit({
    actorUserId: authorId,
    action: 'review.published',
    entityType: 'review',
    entityId: review.id,
    metadata: { caseId: legalCase.id, targetUserId, rating: parsed.data.rating },
    ip: meta.ip ?? null,
  });

  // Published data is cached, so a change clears it rather than waiting out the TTL.
  invalidate('directory:');
  invalidate('reviews:');
  invalidate('community:');

  return success({ reviewId: review.id, listingId: legalCase.listingId });
}

export type ReviewSummary = {
  count: number;
  average: number | null;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
};

/** Published reviews for one professional, newest first. */
export async function listReviewsForTarget(targetUserId: string) {
  return prisma.review.findMany({
    where: { targetUserId, status: 'PUBLISHED' },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      rating: true,
      title: true,
      body: true,
      createdAt: true,
      author: {
        select: {
          id: true,
          accountType: true,
          verificationStatus: true,
          profile: { select: { fullName: true, avatarDocumentId: true } },
        },
      },
      case: { select: { reference: true, caseType: true } },
    },
  });
}

/** Reviews this professional has received, including ones hidden from the public. */
export async function listReviewsForProfessional(targetUserId: string) {
  return prisma.review.findMany({
    where: { targetUserId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      rating: true,
      title: true,
      body: true,
      status: true,
      hiddenReason: true,
      createdAt: true,
      author: { select: { id: true, profile: { select: { fullName: true } } } },
      case: { select: { id: true, reference: true, title: true } },
    },
  });
}

export function summariseReviews(ratings: number[]): ReviewSummary {
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as ReviewSummary['distribution'];
  let total = 0;
  for (const rating of ratings) {
    const clamped = Math.min(5, Math.max(1, Math.round(rating))) as 1 | 2 | 3 | 4 | 5;
    distribution[clamped] += 1;
    total += clamped;
  }
  return {
    count: ratings.length,
    average: ratings.length === 0 ? null : Math.round((total / ratings.length) * 10) / 10,
    distribution,
  };
}

/** Rating summaries for a set of professionals, for directory cards. */
export async function reviewSummariesFor(targetUserIds: string[]): Promise<Map<string, ReviewSummary>> {
  if (targetUserIds.length === 0) return new Map();

  // Published averages, the same for every visitor: cached briefly so a directory
  // page does not recompute them on every load.
  return cached(`reviews:${[...targetUserIds].sort().join(',')}`, 30_000, () =>
    loadReviewSummaries(targetUserIds),
  );
}

async function loadReviewSummaries(
  targetUserIds: string[],
): Promise<Map<string, ReviewSummary>> {

  const rows = await prisma.review.groupBy({
    by: ['targetUserId'],
    where: { targetUserId: { in: targetUserIds }, status: 'PUBLISHED' },
    _avg: { rating: true },
    _count: { _all: true },
  });

  const result = new Map<string, ReviewSummary>();
  for (const row of rows) {
    result.set(row.targetUserId, {
      count: row._count._all,
      average: row._avg.rating === null ? null : Math.round(row._avg.rating * 10) / 10,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    });
  }
  return result;
}

// ── Moderation ───────────────────────────────────────────────────────────────

export async function setReviewVisibility(
  reviewerId: string,
  reviewId: string,
  hidden: boolean,
  reason: string | null,
  meta: { ip?: string | null } = {},
): Promise<ServiceResult> {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { id: true, targetUserId: true, authorId: true, rating: true },
  });
  if (!review) return failure('That review no longer exists.', { status: 404 });

  await prisma.review.update({
    where: { id: reviewId },
    data: {
      status: hidden ? 'HIDDEN' : 'PUBLISHED',
      hiddenReason: hidden ? (reason?.trim() || 'Hidden by an administrator.') : null,
      moderatedById: reviewerId,
    },
  });

  await recordAudit({
    actorUserId: reviewerId,
    action: hidden ? 'review.hidden' : 'review.restored',
    entityType: 'review',
    entityId: reviewId,
    metadata: { targetUserId: review.targetUserId, reason: reason ?? null },
    ip: meta.ip ?? null,
  });

  await notify({
    userId: review.authorId,
    kind: hidden ? 'review.hidden' : 'review.restored',
    title: hidden ? 'Your review was hidden' : 'Your review was restored',
    body: hidden
      ? `An administrator hid your review. Reason: ${reason?.trim() || 'not stated'}`
      : 'Your review is visible again.',
    link: '/reviews',
  });

  // Published data is cached, so a change clears it rather than waiting out the TTL.
  invalidate('directory:');
  invalidate('reviews:');
  invalidate('community:');

  return success();
}

export async function listAllReviewsForAdmin(limit = 100) {
  return prisma.review.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      rating: true,
      title: true,
      body: true,
      status: true,
      hiddenReason: true,
      createdAt: true,
      author: { select: { id: true, email: true, profile: { select: { fullName: true } } } },
      target: { select: { id: true, email: true, accountType: true, profile: { select: { fullName: true } } } },
      case: { select: { id: true, reference: true, title: true } },
    },
  });
}

/** Reviews this member has written. */
export async function listReviewsByAuthor(authorId: string) {
  return prisma.review.findMany({
    where: { authorId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      rating: true,
      title: true,
      body: true,
      status: true,
      hiddenReason: true,
      createdAt: true,
      target: {
        select: {
          id: true,
          email: true,
          accountType: true,
          profile: { select: { fullName: true } },
        },
      },
      case: { select: { id: true, reference: true, title: true, caseType: true } },
    },
  });
}
