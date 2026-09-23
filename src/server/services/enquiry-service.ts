import { z } from 'zod';
import { LegalArea } from '@prisma/client';
import { prisma } from '@/lib/db';
import { recordAudit } from '@/lib/audit';
import { hashIp } from '@/lib/tokens';
import { env } from '@/lib/env';
import { queueEmail } from '@/lib/email';
import { consumeRateLimit } from '@/lib/rate-limit';
import { notifyMany } from './notification-service';
import { fromZodError, failure, success, type ServiceResult } from './result';

/**
 * The general enquiry pool.
 *
 * A public enquiry needs no account, which also means it is not addressed to
 * anybody: it goes into a shared pool that every registered lawyer and firm can
 * see, and whoever claims it takes it on. Contact details are held back until
 * somebody does, so a pool of them is not a list of phone numbers to scrape.
 *
 * The form itself points out that an account is the better route, because a case
 * carries attachments, a conversation and a record — an enquiry carries none of
 * that and is answered more slowly.
 */

export const enquirySchema = z.object({
  name: z.string().trim().min(2, 'Tell us your name.').max(120),
  email: z
    .string()
    .trim()
    .min(3, 'Enter an email address so a lawyer can reply.')
    .max(254)
    .email('Enter a valid email address.')
    .transform((value) => value.toLowerCase()),
  phone: z
    .string()
    .trim()
    .min(7, 'Give a number a lawyer can call.')
    .max(25)
    .regex(/^\+?[\d\s()-]{7,25}$/, 'Enter a valid phone number.'),
  caseType: z
    .union([z.nativeEnum(LegalArea), z.literal(''), z.null(), z.undefined()])
    .transform((value) => (value === '' || value === null || value === undefined ? null : value)),
  subject: z.string().trim().min(4, 'Give it a short subject.').max(160),
  message: z
    .string()
    .trim()
    .min(20, 'Describe the matter in at least 20 characters.')
    .max(4000),
});

export async function createEnquiry(
  rawInput: unknown,
  meta: { ip?: string | null } = {},
): Promise<ServiceResult<{ enquiryId: string; notified: number }>> {
  const parsed = enquirySchema.safeParse(rawInput);
  if (!parsed.success) return fromZodError(parsed.error);

  const limit = consumeRateLimit(`enquiry:${meta.ip ?? 'unknown'}`, 5, 60 * 60);
  if (!limit.allowed) {
    return failure('Too many enquiries from this connection. Try again later.', { status: 429 });
  }

  const enquiry = await prisma.publicEnquiry.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      caseType: parsed.data.caseType,
      subject: parsed.data.subject,
      message: parsed.data.message,
      status: 'OPEN',
      ipHash: hashIp(meta.ip),
    },
    select: { id: true },
  });

  // Every registered professional sees it in the pool and is alerted once.
  const [lawyers, firms] = await Promise.all([
    prisma.lawyerProfile.findMany({ where: { user: { status: 'ACTIVE' } }, select: { userId: true } }),
    prisma.firmProfile.findMany({ where: { user: { status: 'ACTIVE' } }, select: { userId: true } }),
  ]);
  const recipients = [...new Set([...lawyers, ...firms].map((row) => row.userId))];

  await notifyMany(recipients, {
    kind: 'enquiry.received',
    title: `New enquiry: ${parsed.data.subject}`,
    body: 'A general enquiry has arrived in the pool. Open it to see the details and claim it.',
    link: '/enquiries',
  });

  await recordAudit({
    action: 'enquiry.created',
    entityType: 'public_enquiry',
    entityId: enquiry.id,
    metadata: { caseType: parsed.data.caseType, notified: recipients.length },
    ip: meta.ip ?? null,
  });

  return success({ enquiryId: enquiry.id, notified: recipients.length });
}

/** The open pool, for professionals. Contact details are shown: claiming is the
 *  point, and hiding them would make it impossible to judge the work. */
export async function listOpenEnquiries() {
  return prisma.publicEnquiry.findMany({
    where: { status: 'OPEN' },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
}

export async function listClaimedEnquiries(userId: string) {
  return prisma.publicEnquiry.findMany({
    where: { claimedById: userId },
    orderBy: { claimedAt: 'desc' },
    take: 100,
  });
}

export async function countOpenEnquiries(): Promise<number> {
  return prisma.publicEnquiry.count({ where: { status: 'OPEN' } });
}

/**
 * Claims an enquiry.
 *
 * The first professional to claim it takes it on; everybody else stops seeing it
 * in the pool. The enquirer is told who has picked it up — they have no account,
 * so the outbox (and whatever the professional does next) is the only channel
 * there is, and the message says so rather than implying an email was delivered.
 */
export async function claimEnquiry(
  enquiryId: string,
  claimantUserId: string,
  meta: { ip?: string | null } = {},
): Promise<ServiceResult<{ alreadyClaimed: boolean }>> {
  const enquiry = await prisma.publicEnquiry.findUnique({
    where: { id: enquiryId },
    select: { id: true, status: true, subject: true, name: true, email: true, claimedById: true },
  });
  if (!enquiry) return failure('That enquiry no longer exists.', { status: 404 });
  if (enquiry.status !== 'OPEN') {
    return failure('Another professional has already claimed this enquiry.', { status: 409 });
  }

  const claimant = await prisma.user.findUnique({
    where: { id: claimantUserId },
    select: {
      email: true,
      accountType: true,
      profile: { select: { fullName: true, phone: true } },
      firmProfile: { select: { legalName: true, userId: true } },
      lawyerProfile: { select: { licensingAuthority: true } },
    },
  });
  if (!claimant) return failure('That account no longer exists.', { status: 404 });

  const claimed = await prisma.publicEnquiry.updateMany({
    where: { id: enquiryId, status: 'OPEN' },
    data: { status: 'CLAIMED', claimedById: claimantUserId, claimedAt: new Date() },
  });

  // updateMany with a status guard makes this safe against two people claiming
  // the same enquiry at the same moment.
  if (claimed.count === 0) {
    return failure('Another professional claimed this enquiry first.', { status: 409 });
  }

  const firmName = claimant.firmProfile?.legalName ?? null;
  const professionalName =
    firmName ?? claimant.profile?.fullName?.trim() ?? claimant.email;

  await queueEmail({
    to: enquiry.email,
    subject: `Your enquiry has been picked up — ${enquiry.subject}`,
    body: [
      `Hello ${enquiry.name},`,
      '',
      `Your enquiry to Legal Dash has been claimed by ${professionalName}.`,
      '',
      'They will contact you using the details you gave. If you would rather manage this properly —',
      'with your documents, the conversation and every fee in one place — create a free account and',
      'send it to them as a case:',
      '',
      `${env.appUrl}/register`,
      '',
      '— Legal Dash',
    ].join('\n'),
    purpose: 'ENQUIRY_CLAIMED',
    userId: claimantUserId,
  });

  await recordAudit({
    actorUserId: claimantUserId,
    action: 'enquiry.claimed',
    entityType: 'public_enquiry',
    entityId: enquiryId,
    metadata: { subject: enquiry.subject, firmName },
    ip: meta.ip ?? null,
  });

  return success({ alreadyClaimed: false });
}

export async function closeEnquiry(
  enquiryId: string,
  userId: string,
): Promise<ServiceResult> {
  const enquiry = await prisma.publicEnquiry.findUnique({
    where: { id: enquiryId },
    select: { id: true, claimedById: true, status: true },
  });
  if (!enquiry) return failure('That enquiry no longer exists.', { status: 404 });
  if (enquiry.claimedById !== userId) {
    return failure('That enquiry is not yours to close.', { status: 403 });
  }

  await prisma.publicEnquiry.update({
    where: { id: enquiryId },
    data: { status: 'CLOSED', closedAt: new Date() },
  });

  await recordAudit({
    actorUserId: userId,
    action: 'enquiry.closed',
    entityType: 'public_enquiry',
    entityId: enquiryId,
  });

  return success();
}

/** The administrator's view: is the pool being worked, or filling up? */
export async function enquiryOverview() {
  const [open, claimed, closed, recent] = await Promise.all([
    prisma.publicEnquiry.count({ where: { status: 'OPEN' } }),
    prisma.publicEnquiry.count({ where: { status: 'CLAIMED' } }),
    prisma.publicEnquiry.count({ where: { status: 'CLOSED' } }),
    prisma.publicEnquiry.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        subject: true,
        caseType: true,
        status: true,
        createdAt: true,
        claimedAt: true,
        claimedBy: { select: { id: true, email: true, accountType: true, profile: { select: { fullName: true } } } },
      },
    }),
  ]);

  const claimedCount = claimed + closed;
  const total = open + claimedCount;

  return {
    open,
    claimed,
    closed,
    recent,
    claimRate: total === 0 ? null : Math.round((claimedCount / total) * 100),
  };
}
