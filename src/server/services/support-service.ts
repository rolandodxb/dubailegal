import { z } from 'zod';
import { prisma } from '@/lib/db';
import { recordAudit } from '@/lib/audit';
import { notify, notifyMany } from './notification-service';
import { fromZodError, failure, success, type ServiceResult } from './result';

/**
 * Support.
 *
 * A user, a lawyer or a firm reports a problem here and it goes to platform
 * administrators — nobody else. Not the other side of a case, not the lawyer a
 * client is complaining about, and not another member. A support ticket can
 * contain anything about an account, so it is kept between the person who raised
 * it and the people who run the installation.
 *
 * It is a conversation rather than a one-shot form, because most problems take a
 * reply or two, and it is closed by an administrator marking it solved.
 */

export { SUPPORT_CATEGORIES, SUPPORT_CATEGORY_LABEL, SUPPORT_STATUS_LABEL } from '@/lib/support';

const createSchema = z.object({
  subject: z
    .string()
    .trim()
    .min(4, 'Give the problem a short title.')
    .max(120, 'Keep the title under 120 characters.'),
  category: z.enum(
    ['ACCOUNT_ACCESS', 'VERIFICATION', 'CASE_OR_MEETING', 'PAYMENT', 'TECHNICAL', 'OTHER'],
    { errorMap: () => ({ message: 'Choose what the problem is about.' }) },
  ),
  body: z
    .string()
    .trim()
    .min(10, 'Describe what happened — at least a sentence.')
    .max(4000, 'That is longer than we can accept.'),
  contextPath: z
    .string()
    .trim()
    .max(200)
    .optional()
    .nullable()
    .transform((value) => (value && value.length > 0 ? value : null)),
});

const replySchema = z.object({
  ticketId: z.string().min(1),
  body: z.string().trim().min(1, 'Write a message.').max(4000, 'That is longer than we can accept.'),
});

/** Reference shown to the reporter, derived from the ticket id so it is unique. */
function referenceFor(ticketId: string): string {
  const year = new Date().getUTCFullYear();
  const stem = ticketId.replace(/[^a-z0-9]/gi, '').slice(-6).toUpperCase();
  return `SUP-${year}-${stem}`;
}

async function reviewerIds(): Promise<string[]> {
  const rows = await prisma.user.findMany({
    where: { roles: { has: 'REVIEWER' }, status: 'ACTIVE' },
    select: { id: true },
  });
  return rows.map((row) => row.id);
}

/** Everyone who may read support: the reporter and platform administrators. */
export async function createSupportTicket(
  userId: string,
  rawInput: unknown,
  meta: { ip?: string | null } = {},
): Promise<ServiceResult<{ ticketId: string; reference: string }>> {
  const parsed = createSchema.safeParse(rawInput);
  if (!parsed.success) return fromZodError(parsed.error);

  const reporter = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, accountType: true, profile: { select: { fullName: true } } },
  });
  if (!reporter) return failure('That account no longer exists.', { status: 404 });

  const ticket = await prisma.supportTicket.create({
    data: {
      reference: 'pending',
      userId,
      subject: parsed.data.subject,
      category: parsed.data.category,
      contextPath: parsed.data.contextPath,
      status: 'OPEN',
      ownerReadAt: new Date(),
    },
    select: { id: true },
  });

  const reference = referenceFor(ticket.id);
  await prisma.supportTicket.update({ where: { id: ticket.id }, data: { reference } });

  await prisma.supportMessage.create({
    data: { ticketId: ticket.id, authorId: userId, fromStaff: false, body: parsed.data.body },
  });

  const reporterName = reporter.profile?.fullName?.trim() || reporter.email;
  const staff = await reviewerIds();
  await notifyMany(staff, {
    kind: 'support.opened',
    title: `Support: ${parsed.data.subject}`,
    body: `${reporterName} (${reporter.accountType}) reported a problem. Ticket ${reference}.`,
    link: `/admin/support/${ticket.id}`,
  });

  await recordAudit({
    actorUserId: userId,
    action: 'support.opened',
    entityType: 'support_ticket',
    entityId: ticket.id,
    metadata: { reference, category: parsed.data.category },
    ip: meta.ip ?? null,
  });

  return success({ ticketId: ticket.id, reference });
}

/** The reporter's own tickets, newest first. */
export async function listTicketsForUser(userId: string) {
  return prisma.supportTicket.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    take: 50,
    select: {
      id: true,
      reference: true,
      subject: true,
      category: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      solvedAt: true,
      _count: { select: { messages: true } },
    },
  });
}

/**
 * One ticket, for its reporter. Returns null for anybody else — including an
 * administrator, who has their own view with the reporter's account alongside.
 */
export async function getTicketForOwner(ticketId: string, userId: string) {
  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
    include: {
      solvedBy: { select: { id: true, email: true } },
      messages: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          body: true,
          fromStaff: true,
          createdAt: true,
          author: {
            select: {
              id: true,
              email: true,
              profile: { select: { fullName: true, avatarDocumentId: true } },
            },
          },
        },
      },
    },
  });
  if (!ticket) return null;
  if (ticket.userId !== userId) return null;
  return ticket;
}

/** The reporter adds to the conversation. Reopens a ticket an admin had answered. */
export async function replyToTicketAsOwner(
  userId: string,
  rawInput: unknown,
  meta: { ip?: string | null } = {},
): Promise<ServiceResult> {
  const parsed = replySchema.safeParse(rawInput);
  if (!parsed.success) return fromZodError(parsed.error);

  const ticket = await prisma.supportTicket.findUnique({
    where: { id: parsed.data.ticketId },
    select: { id: true, userId: true, status: true, reference: true, subject: true },
  });
  if (!ticket || ticket.userId !== userId) {
    return failure('That ticket is not yours.', { status: 403 });
  }
  if (ticket.status === 'SOLVED') {
    return failure('This ticket was marked solved and closed. Raise a new one if the problem is back.');
  }

  await prisma.supportMessage.create({
    data: { ticketId: ticket.id, authorId: userId, fromStaff: false, body: parsed.data.body },
  });

  await prisma.supportTicket.update({
    where: { id: ticket.id },
    data: { status: 'OPEN', ownerReadAt: new Date() },
  });

  const staff = await reviewerIds();
  await notifyMany(staff, {
    kind: 'support.replied',
    title: `Support reply on ${ticket.reference}`,
    body: ticket.subject,
    link: `/admin/support/${ticket.id}`,
  });

  await recordAudit({
    actorUserId: userId,
    action: 'support.replied',
    entityType: 'support_ticket',
    entityId: ticket.id,
    metadata: { fromStaff: false },
    ip: meta.ip ?? null,
  });

  return success();
}

/** Everything administrators see: the queue and the counts behind it. */
export async function listTicketsForAdmin(status?: 'OPEN' | 'ANSWERED' | 'SOLVED') {
  const [rows, open, answered, solved] = await Promise.all([
    prisma.supportTicket.findMany({
      where: status ? { status } : undefined,
      orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
      take: 100,
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
        _count: { select: { messages: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { body: true, fromStaff: true, createdAt: true },
        },
      },
    }),
    prisma.supportTicket.count({ where: { status: 'OPEN' } }),
    prisma.supportTicket.count({ where: { status: 'ANSWERED' } }),
    prisma.supportTicket.count({ where: { status: 'SOLVED' } }),
  ]);

  return { rows, open, answered, solved };
}

/** One ticket, for an administrator. */
export async function getTicketForAdmin(ticketId: string) {
  return prisma.supportTicket.findUnique({
    where: { id: ticketId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          accountType: true,
          verificationStatus: true,
          isDemo: true,
          createdAt: true,
          profile: { select: { fullName: true, avatarDocumentId: true } },
        },
      },
      solvedBy: { select: { id: true, email: true } },
      messages: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          body: true,
          fromStaff: true,
          createdAt: true,
          author: {
            select: {
              id: true,
              email: true,
              accountType: true,
              profile: { select: { fullName: true, avatarDocumentId: true } },
            },
          },
        },
      },
    },
  });
}

/**
 * An administrator answers.
 *
 * The reply is stamped as staff at the moment it is written, so a later change to
 * somebody's roles cannot rewrite who said what.
 */
export async function replyToTicketAsAdmin(
  adminId: string,
  rawInput: unknown,
  meta: { ip?: string | null } = {},
): Promise<ServiceResult> {
  const parsed = replySchema.safeParse(rawInput);
  if (!parsed.success) return fromZodError(parsed.error);

  const ticket = await prisma.supportTicket.findUnique({
    where: { id: parsed.data.ticketId },
    select: { id: true, userId: true, status: true, reference: true, subject: true },
  });
  if (!ticket) return failure('That ticket no longer exists.', { status: 404 });
  if (ticket.status === 'SOLVED') {
    return failure('This ticket is closed. Reopen it by asking the reporter to raise a new one.');
  }

  await prisma.supportMessage.create({
    data: { ticketId: ticket.id, authorId: adminId, fromStaff: true, body: parsed.data.body },
  });

  await prisma.supportTicket.update({
    where: { id: ticket.id },
    data: { status: 'ANSWERED', ownerReadAt: null },
  });

  await notify({
    userId: ticket.userId,
    kind: 'support.answered',
    title: `Support replied about “${ticket.subject}”`,
    body: `Ticket ${ticket.reference}. Open support to read the answer and reply.`,
    link: `/support?ticket=${ticket.id}`,
  });

  await recordAudit({
    actorUserId: adminId,
    action: 'support.replied',
    entityType: 'support_ticket',
    entityId: ticket.id,
    metadata: { fromStaff: true, reference: ticket.reference },
    ip: meta.ip ?? null,
  });

  return success();
}

/**
 * Marks a ticket solved and closes it.
 *
 * Closed means closed: neither side can post to it afterwards, and the reporter
 * is told who solved it and when. If the problem comes back, it is a new ticket
 * with its own record — which is the point of having the button at all.
 */
export async function solveSupportTicket(
  adminId: string,
  ticketId: string,
  meta: { ip?: string | null } = {},
): Promise<ServiceResult<{ reference: string }>> {
  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
    select: { id: true, userId: true, status: true, reference: true, subject: true },
  });
  if (!ticket) return failure('That ticket no longer exists.', { status: 404 });
  if (ticket.status === 'SOLVED') return failure('That ticket is already closed.');

  const solvedAt = new Date();
  await prisma.supportTicket.update({
    where: { id: ticket.id },
    data: { status: 'SOLVED', solvedAt, solvedById: adminId },
  });

  await notify({
    userId: ticket.userId,
    kind: 'support.solved',
    title: `Support marked “${ticket.subject}” solved`,
    body: `Ticket ${ticket.reference} is closed. If the problem comes back, raise a new ticket and quote this reference.`,
    link: `/support?ticket=${ticket.id}`,
  });

  await recordAudit({
    actorUserId: adminId,
    action: 'support.solved',
    entityType: 'support_ticket',
    entityId: ticket.id,
    metadata: { reference: ticket.reference },
    ip: meta.ip ?? null,
  });

  return success({ reference: ticket.reference });
}

/**
 * The support counters: what an administrator still has to answer, and what a
 * reporter has been answered but not read.
 */
export async function supportBadge(
  userId: string,
  roles: string[],
): Promise<number> {
  if (roles.includes('REVIEWER')) {
    return prisma.supportTicket.count({ where: { status: 'OPEN' } });
  }
  return prisma.supportTicket.count({ where: { userId, status: 'ANSWERED' } });
}
