import { z } from 'zod';
import { prisma } from '@/lib/db';
import { recordAudit } from '@/lib/audit';
import { generateToken, hashToken } from '@/lib/tokens';
import { env } from '@/lib/env';
import { hashPassword } from '@/lib/password';
import { parseDateInput } from '@/lib/format';
import { MIN_PASSWORD_LENGTH } from '@/lib/constants';
import type { Emirate, LegalArea } from '@prisma/client';
import { notify } from './notification-service';
import { fromZodError, failure, success, type ServiceResult } from './result';

/**
 * A firm's roster of lawyers.
 *
 * Because this installation cannot send email, an invitation produces a
 * shareable link the firm passes on itself. Two things can happen next:
 *   · the address already belongs to a lawyer account, in which case the
 *     invitation appears in that lawyer's dashboard to accept or decline;
 *   · the address has no account, in which case the link leads to lawyer
 *     registration, and completing it links the new account to the firm.
 */

const inviteSchema = z.object({
  email: z
    .string()
    .trim()
    .min(3, 'Enter an email address.')
    .max(254)
    .email('Enter a valid email address.')
    .transform((value) => value.toLowerCase()),
});

async function requireFirm(firmUserId: string) {
  return prisma.firmProfile.findUnique({
    where: { userId: firmUserId },
    select: {
      id: true,
      legalName: true,
      userId: true,
      tradeLicenseNumber: true,
      registeredEmirate: true,
    },
  });
}

export async function listFirmLawyers(firmUserId: string) {
  const firm = await requireFirm(firmUserId);
  if (!firm) return { firm: null, lawyers: [], invitations: [] };

  const [lawyers, invitations] = await Promise.all([
    prisma.lawyerProfile.findMany({
      where: { affiliatedFirmId: firm.id },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        licenseNumber: true,
        licensingAuthority: true,
        licenseExpiresOn: true,
        yearsOfExperience: true,
        createdAt: true,
        createdByFirmId: true,
        isFirmEmergency: true,
        acceptsEmergency: true,
        user: {
          select: {
            id: true,
            email: true,
            verificationStatus: true,
            verifiedAt: true,
            status: true,
            profile: { select: { fullName: true, avatarDocumentId: true, phone: true } },
          },
        },
        _count: { select: { cases: true } },
      },
    }),
    prisma.firmInvitation.findMany({
      where: { firmId: firm.id, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, email: true, createdAt: true, tokenHash: true, invitedBy: { select: { email: true } } },
    }),
  ]);

  return { firm, lawyers, invitations };
}

/**
 * Invites a professional to the firm.
 *
 * Always creates a single-use token. Whether the invitation can be accepted
 * in-app or needs the shareable link depends on whether the address already has
 * a lawyer account, which the caller is told explicitly.
 */
export async function inviteLawyerToFirm(
  firmUserId: string,
  rawInput: unknown,
  meta: { ip?: string | null } = {},
): Promise<ServiceResult<{ invitationId: string; token: string; existingAccount: boolean }>> {
  const parsed = inviteSchema.safeParse(rawInput);
  if (!parsed.success) return fromZodError(parsed.error);

  const firm = await requireFirm(firmUserId);
  if (!firm) return failure('Only a legal-firm account can register professionals.', { status: 403 });

  const { email } = parsed.data;
  if (email === (await prisma.user.findUnique({ where: { id: firmUserId }, select: { email: true } }))?.email) {
    return failure('That is your own firm account.', { fieldErrors: { email: 'Use a different address.' } });
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      accountType: true,
      lawyerProfile: { select: { id: true, affiliatedFirmId: true } },
    },
  });

  if (existingUser && existingUser.accountType !== 'LAWYER') {
    return failure('That email belongs to an account that is not a lawyer.', {
      fieldErrors: { email: 'That account is not a lawyer account.' },
    });
  }
  if (existingUser?.lawyerProfile?.affiliatedFirmId === firm.id) {
    return failure('That lawyer is already registered with your firm.', {
      fieldErrors: { email: 'Already on your roster.' },
    });
  }
  if (existingUser?.lawyerProfile?.affiliatedFirmId && existingUser.lawyerProfile.affiliatedFirmId !== firm.id) {
    return failure('That lawyer is already registered with another firm.', {
      fieldErrors: { email: 'Already affiliated elsewhere.' },
    });
  }

  // Supersede any outstanding invitation for the same address.
  await prisma.firmInvitation.updateMany({
    where: { firmId: firm.id, email, status: 'PENDING' },
    data: { status: 'REVOKED', respondedAt: new Date() },
  });

  const token = generateToken();
  const invitation = await prisma.firmInvitation.create({
    data: {
      firmId: firm.id,
      email,
      tokenHash: hashToken(token),
      invitedByUserId: firmUserId,
      status: 'PENDING',
    },
    select: { id: true },
  });

  // An existing lawyer is alerted in-app; a new address needs the shared link.
  if (existingUser) {
    await notify({
      userId: existingUser.id,
      kind: 'firm.invitation',
      title: `${firm.legalName} invited you to join as a lawyer`,
      body: 'Open your invitations to accept or decline.',
      link: '/invitations',
    });
  }

  await recordAudit({
    actorUserId: firmUserId,
    action: 'firm.invitation_sent',
    entityType: 'firm_invitation',
    entityId: invitation.id,
    metadata: { email, existingAccount: Boolean(existingUser) },
    ip: meta.ip ?? null,
  });

  return success({ invitationId: invitation.id, token, existingAccount: Boolean(existingUser) });
}

export async function revokeInvitation(
  firmUserId: string,
  invitationId: string,
): Promise<ServiceResult> {
  const firm = await requireFirm(firmUserId);
  if (!firm) return failure('Only a legal-firm account can manage invitations.', { status: 403 });

  const invitation = await prisma.firmInvitation.findFirst({
    where: { id: invitationId, firmId: firm.id, status: 'PENDING' },
    select: { id: true },
  });
  if (!invitation) return failure('That invitation is no longer pending.', { status: 404 });

  await prisma.firmInvitation.update({
    where: { id: invitationId },
    data: { status: 'REVOKED', respondedAt: new Date() },
  });

  await recordAudit({
    actorUserId: firmUserId,
    action: 'firm.invitation_revoked',
    entityType: 'firm_invitation',
    entityId: invitationId,
    ip: null,
  });

  return success();
}

/** Removes a lawyer from the firm's roster without deleting their account. */
export async function removeLawyerFromFirm(
  firmUserId: string,
  lawyerProfileId: string,
): Promise<ServiceResult> {
  const firm = await requireFirm(firmUserId);
  if (!firm) return failure('Only a legal-firm account can manage its lawyers.', { status: 403 });

  const lawyer = await prisma.lawyerProfile.findFirst({
    where: { id: lawyerProfileId, affiliatedFirmId: firm.id },
    select: { id: true, userId: true },
  });
  if (!lawyer) return failure('That lawyer is not registered with your firm.', { status: 404 });

  const openCases = await prisma.legalCase.count({
    where: { firmId: firm.id, lawyerId: lawyer.id, status: { in: ['ASSIGNED', 'IN_PROGRESS'] } },
  });

  await prisma.lawyerProfile.update({
    where: { id: lawyerProfileId },
    data: { affiliatedFirmId: null },
  });

  await notify({
    userId: lawyer.userId,
    kind: 'firm.removed',
    title: `You have been removed from ${firm.legalName}`,
    body:
      openCases > 0
        ? `You still have ${openCases} open case(s) assigned to you. They remain yours to finish.`
        : undefined,
    link: '/dashboard',
  });

  await recordAudit({
    actorUserId: firmUserId,
    action: 'firm.lawyer_removed',
    entityType: 'lawyer_profile',
    entityId: lawyerProfileId,
    metadata: { openCases },
    ip: null,
  });

  return success();
}

// ── The invited lawyer's side ────────────────────────────────────────────────

export async function listInvitationsForLawyer(lawyerUserId: string) {
  return prisma.firmInvitation.findMany({
    where: { email: (await prisma.user.findUnique({ where: { id: lawyerUserId }, select: { email: true } }))?.email ?? '', status: 'PENDING' },
    orderBy: { createdAt: 'desc' },
    include: { firm: { select: { legalName: true, tradeLicenseNumber: true, registeredEmirate: true, user: { select: { email: true } } } } },
  });
}

export async function respondToInvitation(
  lawyerUserId: string,
  invitationId: string,
  accept: boolean,
): Promise<ServiceResult> {
  const user = await prisma.user.findUnique({
    where: { id: lawyerUserId },
    select: { id: true, email: true, accountType: true, profile: { select: { fullName: true } }, lawyerProfile: { select: { id: true } } },
  });
  if (!user) return failure('That account no longer exists.', { status: 404 });
  if (user.accountType !== 'LAWYER' || !user.lawyerProfile) {
    return failure('Only a lawyer account can join a firm.', { status: 403 });
  }

  const invitation = await prisma.firmInvitation.findFirst({
    where: { id: invitationId, email: user.email, status: 'PENDING' },
    include: { firm: { select: { id: true, legalName: true, userId: true } } },
  });
  if (!invitation) return failure('That invitation is no longer available.', { status: 404 });

  if (accept) {
    await prisma.$transaction([
      prisma.lawyerProfile.update({
        where: { id: user.lawyerProfile.id },
        data: { affiliatedFirmId: invitation.firm.id },
      }),
      prisma.firmInvitation.update({
        where: { id: invitation.id },
        data: { status: 'ACCEPTED', respondedAt: new Date(), lawyerUserId: user.id },
      }),
    ]);

    await notify({
      userId: invitation.firm.userId,
      kind: 'firm.invitation_accepted',
      title: `${user.profile?.fullName?.trim() || user.email} joined your firm`,
      body: 'They are now listed under Lawyers registered and can accept cases submitted to the firm.',
      link: '/firm/lawyers',
    });
  } else {
    await prisma.firmInvitation.update({
      where: { id: invitation.id },
      data: { status: 'DECLINED', respondedAt: new Date(), lawyerUserId: user.id },
    });
  }

  await recordAudit({
    actorUserId: lawyerUserId,
    action: accept ? 'firm.invitation_accepted' : 'firm.invitation_declined',
    entityType: 'firm_invitation',
    entityId: invitation.id,
    metadata: { firmId: invitation.firm.id },
    ip: null,
  });

  return success();
}

/**
 * Links a newly registered lawyer to the firm that invited them, when they
 * registered through a shared invitation link.
 */
export async function claimInvitationOnRegistration(
  userId: string,
  email: string,
  rawToken: string,
): Promise<boolean> {
  const token = rawToken.trim();
  if (token.length === 0) return false;

  const invitation = await prisma.firmInvitation.findFirst({
    where: { tokenHash: hashToken(token), email: email.toLowerCase(), status: 'PENDING' },
    include: { firm: { select: { id: true, legalName: true, userId: true } } },
  });
  if (!invitation) return false;

  const lawyer = await prisma.lawyerProfile.findUnique({ where: { userId }, select: { id: true } });

  await prisma.$transaction(async (tx) => {
    if (lawyer) {
      await tx.lawyerProfile.update({
        where: { id: lawyer.id },
        data: { affiliatedFirmId: invitation.firm.id },
      });
    }
    await tx.firmInvitation.update({
      where: { id: invitation.id },
      data: { status: 'ACCEPTED', respondedAt: new Date(), lawyerUserId: userId },
    });
  });

  await notify({
    userId: invitation.firm.userId,
    kind: 'firm.invitation_accepted',
    title: `A lawyer joined ${invitation.firm.legalName} through your invitation link`,
    body: `${email} registered and is now linked to your firm.`,
    link: '/firm/lawyers',
  });

  return true;
}

/** Resolves an invitation token so the registration page can name the firm. */
export async function describeInvitationToken(rawToken: string) {
  const token = rawToken.trim();
  if (token.length === 0) return null;

  const invitation = await prisma.firmInvitation.findFirst({
    where: { tokenHash: hashToken(token), status: 'PENDING' },
    select: {
      email: true,
      firm: { select: { legalName: true } },
    },
  });
  return invitation;
}

/** The registration link a firm passes on, since email is not configured. */
export function invitationLink(token: string): string {
  return `${env.appUrl}/register?type=LAWYER&invite=${encodeURIComponent(token)}`;
}

/**
 * Firm oversight: every case the firm holds, which lawyer is on it, how far each
 * has got, and what is in the lawyers' diaries.
 *
 * A firm administrator supervises the practice, so this is deliberately broader
 * than a single lawyer's own dashboard — but it is a view, not a control:
 * accepting and progressing cases stays with the lawyer who took them.
 */
export async function firmCaseOversight(firmUserId: string) {
  const firm = await requireFirm(firmUserId);
  if (!firm) return null;

  const [lawyers, cases, upcoming] = await Promise.all([
    prisma.lawyerProfile.findMany({
      where: { affiliatedFirmId: firm.id },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        licenseNumber: true,
        licenseExpiresOn: true,
        user: {
          select: {
            id: true,
            email: true,
            verificationStatus: true,
            status: true,
            profile: { select: { fullName: true, avatarDocumentId: true } },
          },
        },
      },
    }),
    prisma.legalCase.findMany({
      where: { firmId: firm.id },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        reference: true,
        title: true,
        caseType: true,
        status: true,
        submittedAt: true,
        updatedAt: true,
        assignedAt: true,
        client: { select: { id: true, email: true, profile: { select: { fullName: true } } } },
        lawyer: {
          select: { id: true, user: { select: { id: true, email: true, profile: { select: { fullName: true } } } } },
        },
        _count: { select: { files: true, messages: true } },
        events: { orderBy: { createdAt: 'desc' }, take: 1, select: { toStatus: true, createdAt: true } },
      },
    }),
    prisma.appointment.findMany({
      where: { firmId: firm.id, status: 'BOOKED', startsAt: { gte: new Date() } },
      orderBy: { startsAt: 'asc' },
      take: 25,
      select: {
        id: true,
        startsAt: true,
        client: { select: { id: true, email: true, profile: { select: { fullName: true } } } },
        lawyer: { select: { id: true, user: { select: { profile: { select: { fullName: true } } } } } },
        case: { select: { reference: true } },
      },
    }),
  ]);

  const perLawyer = lawyers.map((lawyer) => {
    const theirs = cases.filter((item) => item.lawyer?.id === lawyer.id);
    return {
      lawyer,
      open: theirs.filter((item) => item.status === 'ASSIGNED' || item.status === 'IN_PROGRESS'),
      completed: theirs.filter((item) => item.status === 'COMPLETED'),
      total: theirs.length,
      meetings: upcoming.filter((appointment) => appointment.lawyer.id === lawyer.id).length,
    };
  });

  return {
    firm,
    lawyers,
    cases,
    upcoming,
    perLawyer,
    unassigned: cases.filter((item) => item.status === 'SUBMITTED' || item.lawyer === null),
  };
}

// ── Creating a lawyer directly from the firm's roster ────────────────────────

const createLawyerSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter the lawyer\u2019s full name.').max(120),
  email: z
    .string()
    .trim()
    .min(3, 'Enter an email address.')
    .max(254)
    .email('Enter a valid email address.')
    .transform((value) => value.toLowerCase()),
  password: z
    .string()
    .min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters.`)
    .max(200)
    .refine((value) => /[A-Za-z]/.test(value), 'Include at least one letter.')
    .refine((value) => /\d/.test(value), 'Include at least one number.'),
  phone: z
    .union([z.string(), z.null(), z.undefined()])
    .transform((value) => (typeof value === 'string' && value.trim().length > 0 ? value.trim() : null))
    .refine(
      (value) => value === null || /^\+?[\d\s()-]{7,20}$/.test(value),
      'Enter a valid phone number, e.g. +971 50 123 4567.',
    ),
  licenseNumber: z.string().trim().min(2, 'Enter the licence number.').max(80),
  licensingAuthority: z.string().trim().min(2, 'Enter the licensing authority.').max(160),
  licenseExpiresOn: z
    .union([z.string(), z.null(), z.undefined()])
    .transform((value, ctx) => {
      if (typeof value !== 'string' || value.trim().length === 0) return null;
      const parsed = parseDateInput(value);
      if (!parsed) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Enter a valid date.' });
        return z.NEVER;
      }
      return parsed;
    }),
  yearsOfExperience: z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .transform((value, ctx) => {
      if (value === null || value === undefined || value === '') return null;
      const parsed = typeof value === 'number' ? value : Number.parseInt(String(value), 10);
      if (Number.isNaN(parsed) || parsed < 0 || parsed > 80) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Enter a number between 0 and 80.' });
        return z.NEVER;
      }
      return parsed;
    }),
});

export type FirmCreatedLawyer = {
  userId: string;
  email: string;
  /** Shown once so the firm can pass it on; never stored in the clear. */
  password: string;
};

/**
 * Creates a complete lawyer account on behalf of a firm.
 *
 * The alternative — inviting by email and waiting — is kept, but a firm often
 * already knows who it is hiring and wants them on the roster now. The account
 * is created active and immediately affiliated, with the firm recorded as its
 * creator so that whoever set the initial password is visible.
 *
 * The new lawyer is **not** verified by this: verification still requires their
 * own Emirates ID and documents to be examined by a reviewer.
 */
export async function createLawyerForFirm(
  firmUserId: string,
  rawInput: unknown,
  meta: { ip?: string | null } = {},
): Promise<ServiceResult<FirmCreatedLawyer>> {
  const parsed = createLawyerSchema.safeParse(rawInput);
  if (!parsed.success) return fromZodError(parsed.error);

  const firm = await prisma.firmProfile.findUnique({
    where: { userId: firmUserId },
    select: { id: true, legalName: true, userId: true },
  });
  if (!firm) return failure('Only a legal-firm account can create lawyers.', { status: 403 });

  // The firm's own listing supplies sensible defaults for the new lawyer's
  // practice areas and emirates. A listing belongs to a User, not a firm.
  const firmListing = await prisma.listing.findUnique({
    where: { userId: firmUserId },
    select: {
      areas: true,
      emirates: true,
      primaryEmirate: true,
      languages: true,
      addressLine: true,
    },
  });

  const data = parsed.data;
  if (data.email === (await prisma.user.findUnique({ where: { id: firmUserId }, select: { email: true } }))?.email) {
    return failure('That is your own firm account.', { fieldErrors: { email: 'Use a different address.' } });
  }

  const existing = await prisma.user.findUnique({ where: { email: data.email }, select: { id: true } });
  if (existing) {
    return failure('An account already exists for that email address.', {
      fieldErrors: {
        email: 'That address is already registered. Invite it instead so the lawyer can accept.',
      },
    });
  }

  const passwordHash = await hashPassword(data.password);
  const now = new Date();

  const created = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: data.email,
        passwordHash,
        accountType: 'LAWYER',
        status: 'ACTIVE',
        emailVerifiedAt: now,
        roles: ['MEMBER'],
        profile: {
          create: {
            fullName: data.fullName,
            phone: data.phone,
          },
        },
      },
      select: { id: true },
    });

    await tx.lawyerProfile.create({
      data: {
        userId: user.id,
        licenseNumber: data.licenseNumber,
        licensingAuthority: data.licensingAuthority,
        licenseExpiresOn: data.licenseExpiresOn,
        yearsOfExperience: data.yearsOfExperience,
        affiliatedFirmId: firm.id,
        createdByFirmId: firm.id,
      },
    });

    // A draft listing is prepared from the firm's own practice details, but it
    // is deliberately NOT published: a lawyer created inside a firm is shown
    // under "Lawyers at this firm" on the firm's profile, not as a separate
    // entry in the directory. The draft exists so that if they ever leave the
    // firm they can publish it in one step.
    const areas: LegalArea[] =
      firmListing && firmListing.areas.length > 0 ? firmListing.areas : ['COMMERCIAL'];
    const emirates: Emirate[] =
      firmListing && firmListing.emirates.length > 0 ? firmListing.emirates : ['DUBAI'];
    await tx.listing.create({
      data: {
        userId: user.id,
        kind: 'LAWYER',
        displayName: data.fullName,
        headline: `Lawyer at ${firm.legalName}`,
        primaryEmirate: firmListing?.primaryEmirate ?? emirates[0]!,
        emirates,
        areas,
        languages:
          firmListing && firmListing.languages.length > 0
            ? firmListing.languages
            : ['Arabic', 'English'],
        yearsOfExperience: data.yearsOfExperience,
        acceptsNewClients: true,
        published: false,
        addressLine: firmListing?.addressLine ?? null,
        contactPhone: data.phone,
      },
    });


    return user;
  });

  await recordAudit({
    actorUserId: firmUserId,
    action: 'firm.lawyer_created',
    entityType: 'user',
    entityId: created.id,
    metadata: { email: data.email, licence: data.licenseNumber, firmId: firm.id },
    ip: meta.ip ?? null,
  });

  return success({ userId: created.id, email: data.email, password: data.password });
}
