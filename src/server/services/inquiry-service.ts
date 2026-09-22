import { prisma } from '@/lib/db';
import { recordAudit } from '@/lib/audit';
import { inquiryReplySchema, inquirySchema } from '@/lib/validation';
import { buildInquiryReplyEmail } from '@/lib/email-templates';
import { env } from '@/lib/env';
import { queueEmail } from '@/lib/email';
import { fromZodError, failure, success, type ServiceResult } from './result';

/**
 * Sends an inquiry from a member to a listed professional or firm.
 *
 * The message is stored against the listing and delivered in-app to the
 * recipient's dashboard. An outbox copy is recorded for the recipient's email
 * address, subject to the same "recorded, not sent" honesty as all other mail
 * on this installation.
 */
export async function createInquiry(
  fromUserId: string,
  rawInput: unknown,
  meta: { ip?: string | null } = {},
): Promise<ServiceResult<{ inquiryId: string }>> {
  const parsed = inquirySchema.safeParse(rawInput);
  if (!parsed.success) return fromZodError(parsed.error);

  const listing = await prisma.listing.findFirst({
    where: { id: parsed.data.listingId, published: true },
    select: {
      id: true,
      userId: true,
      displayName: true,
      user: { select: { email: true, profile: { select: { fullName: true } } } },
    },
  });
  if (!listing) return failure('That profile is no longer listed in the directory.', { status: 404 });
  if (listing.userId === fromUserId) return failure('You cannot send an inquiry to your own listing.');

  const sender = await prisma.user.findUnique({
    where: { id: fromUserId },
    select: { email: true, profile: { select: { fullName: true } } },
  });
  if (!sender) return failure('That account no longer exists.', { status: 404 });

  const created = await prisma.inquiry.create({
    data: {
      listingId: listing.id,
      fromUserId,
      toUserId: listing.userId,
      subject: parsed.data.subject,
      message: parsed.data.message,
      status: 'NEW',
    },
    select: { id: true },
  });

  const content = buildInquiryReplyEmail({
    recipientName: listing.user.profile?.fullName ?? listing.displayName,
    senderName: sender.profile?.fullName ?? sender.email,
    subject: parsed.data.subject,
    body: parsed.data.message,
    dashboardUrl: `${env.appUrl}/inquiries`,
  });

  await queueEmail({
    to: listing.user.email,
    subject: content.subject,
    body: content.body,
    purpose: 'INQUIRY_RECEIVED',
    userId: listing.userId,
  });

  await recordAudit({
    actorUserId: fromUserId,
    action: 'inquiry.created',
    entityType: 'inquiry',
    entityId: created.id,
    metadata: { listingId: listing.id },
    ip: meta.ip ?? null,
  });

  return success({ inquiryId: created.id });
}

export async function listInquiriesReceived(userId: string) {
  return prisma.inquiry.findMany({
    where: { toUserId: userId },
    orderBy: { createdAt: 'desc' },
    include: {
      fromUser: { select: { id: true, email: true, accountType: true, profile: { select: { fullName: true, phone: true } } } },
      listing: { select: { id: true, displayName: true } },
    },
  });
}

export async function listInquiriesSent(userId: string) {
  return prisma.inquiry.findMany({
    where: { fromUserId: userId },
    orderBy: { createdAt: 'desc' },
    include: {
      toUser: { select: { id: true, email: true, accountType: true, profile: { select: { fullName: true } } } },
      listing: { select: { id: true, displayName: true } },
    },
  });
}

/** Marks a received inquiry as read. Only the recipient may do so. */
export async function markInquiryRead(
  inquiryId: string,
  userId: string,
): Promise<ServiceResult> {
  const inquiry = await prisma.inquiry.findUnique({
    where: { id: inquiryId },
    select: { id: true, toUserId: true, status: true },
  });
  if (!inquiry) return failure('That inquiry no longer exists.', { status: 404 });
  if (inquiry.toUserId !== userId) return failure('That inquiry is not addressed to you.', { status: 403 });
  if (inquiry.status === 'NEW') {
    await prisma.inquiry.update({ where: { id: inquiryId }, data: { status: 'READ' } });
  }
  return success();
}

export async function replyToInquiry(
  userId: string,
  rawInput: unknown,
  meta: { ip?: string | null } = {},
): Promise<ServiceResult> {
  const parsed = inquiryReplySchema.safeParse(rawInput);
  if (!parsed.success) return fromZodError(parsed.error);

  const inquiry = await prisma.inquiry.findUnique({
    where: { id: parsed.data.inquiryId },
    include: {
      fromUser: { select: { id: true, email: true, profile: { select: { fullName: true } } } },
      listing: { select: { displayName: true } },
      toUser: { select: { profile: { select: { fullName: true } } } },
    },
  });
  if (!inquiry) return failure('That inquiry no longer exists.', { status: 404 });
  if (inquiry.toUserId !== userId) return failure('That inquiry is not addressed to you.', { status: 403 });

  await prisma.inquiry.update({
    where: { id: inquiry.id },
    data: {
      replyBody: parsed.data.replyBody,
      repliedAt: new Date(),
      status: 'RESPONDED',
    },
  });

  const content = buildInquiryReplyEmail({
    recipientName: inquiry.fromUser.profile?.fullName ?? inquiry.fromUser.email,
    senderName: inquiry.toUser.profile?.fullName ?? inquiry.listing.displayName,
    subject: `Re: ${inquiry.subject}`,
    body: parsed.data.replyBody,
    dashboardUrl: `${env.appUrl}/inquiries`,
  });

  await queueEmail({
    to: inquiry.fromUser.email,
    subject: content.subject,
    body: content.body,
    purpose: 'INQUIRY_REPLIED',
    userId: inquiry.fromUser.id,
  });

  await recordAudit({
    actorUserId: userId,
    action: 'inquiry.replied',
    entityType: 'inquiry',
    entityId: inquiry.id,
    ip: meta.ip ?? null,
  });

  return success();
}

export async function closeInquiry(inquiryId: string, userId: string): Promise<ServiceResult> {
  const inquiry = await prisma.inquiry.findUnique({
    where: { id: inquiryId },
    select: { id: true, toUserId: true, fromUserId: true },
  });
  if (!inquiry) return failure('That inquiry no longer exists.', { status: 404 });
  if (inquiry.toUserId !== userId && inquiry.fromUserId !== userId) {
    return failure('That inquiry does not involve you.', { status: 403 });
  }
  await prisma.inquiry.update({ where: { id: inquiryId }, data: { status: 'CLOSED' } });
  return success();
}
