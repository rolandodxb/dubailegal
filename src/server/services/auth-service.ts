import { prisma } from '@/lib/db';
import { env } from '@/lib/env';
import { hashPassword, verifyPassword } from '@/lib/password';
import { generateToken, hashToken } from '@/lib/tokens';
import { recordAudit } from '@/lib/audit';
import {
  buildConfirmationEmail,
  buildPasswordResetEmail,
  queueEmail,
} from '@/lib/email';
import { consumeRateLimit, resetRateLimit } from '@/lib/rate-limit';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from '@/lib/validation';
import { ACCOUNT_TYPE_LABEL } from '@/lib/constants';
import { fromZodError, failure, success, type ServiceResult } from './result';
import { createSession, revokeAllSessions, type RequestMeta } from '@/lib/auth';

// Deliberately identical for "no such account" and "wrong password" so the
// response cannot be used to enumerate registered addresses.
const INVALID_CREDENTIALS = 'Email or password is incorrect.';

function tokenExpiry(): Date {
  return new Date(Date.now() + env.tokenTtlMinutes * 60 * 1000);
}

// ── Registration ─────────────────────────────────────────────────────────────

export async function registerAccount(
  rawInput: unknown,
  meta: RequestMeta,
  options: { inviteToken?: string | null } = {},
): Promise<ServiceResult<{ userId: string; token: string; expiresAt: Date; roles: string[] }>> {
  const parsed = registerSchema.safeParse(rawInput);
  if (!parsed.success) return fromZodError(parsed.error);

  const { accountType, email, password } = parsed.data;

  const limit = consumeRateLimit(`register:${meta.ip ?? 'unknown'}`, 10, 60 * 60);
  if (!limit.allowed) {
    return failure('Too many accounts created from this connection. Try again later.', { status: 429 });
  }

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    return failure('An account with that email address already exists.', {
      fieldErrors: { email: 'This email address is already registered. Try signing in instead.' },
    });
  }

  const isBootstrapReviewer = env.bootstrapReviewerEmails.includes(email);
  const passwordHash = await hashPassword(password);

  // A firm invitation carried through registration is held until the lawyer
  // profile exists, which is what the affiliation attaches to.
  const inviteToken = options.inviteToken?.trim();
  let pendingFirmInviteHash: string | null = null;
  if (inviteToken && accountType === 'LAWYER') {
    const invitation = await prisma.firmInvitation.findFirst({
      where: { tokenHash: hashToken(inviteToken), email, status: 'PENDING' },
      select: { id: true },
    });
    if (invitation) pendingFirmInviteHash = hashToken(inviteToken);
  }

  // With no mail provider configured, an account is activated at signup.
  // Requiring a confirmation that cannot be delivered would strand every user.
  const needsConfirmation = env.requireEmailVerification;

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      accountType,
      status: needsConfirmation ? 'PENDING_EMAIL' : 'ACTIVE',
      emailVerifiedAt: needsConfirmation ? null : new Date(),
      roles: isBootstrapReviewer ? ['MEMBER', 'REVIEWER'] : ['MEMBER'],
      pendingFirmInviteHash,
      profile: {
        // A profile row exists from the moment the account does, so the profile
        // form is always an edit rather than a create-or-update branch.
        create: { fullName: '' },
      },
    },
    select: { id: true, email: true, accountType: true, roles: true },
  });

  if (needsConfirmation) {
    await issueEmailVerification(user.id, user.email, null);
  }

  await recordAudit({
    actorUserId: user.id,
    action: 'account.registered',
    entityType: 'user',
    entityId: user.id,
    metadata: {
      accountType,
      bootstrapReviewer: isBootstrapReviewer,
      emailConfirmationRequired: needsConfirmation,
    },
    ip: meta.ip,
  });

  const session = await createSession(user.id, meta);
  return success({
    userId: user.id,
    token: session.token,
    expiresAt: session.expiresAt,
    roles: user.roles,
  });
}

// ── Email confirmation ───────────────────────────────────────────────────────

async function issueEmailVerification(userId: string, email: string, fullName: string | null): Promise<void> {
  // Only one live token per purpose.
  await prisma.emailToken.updateMany({
    where: { userId, purpose: 'EMAIL_VERIFICATION', consumedAt: null },
    data: { consumedAt: new Date() },
  });

  const token = generateToken();
  await prisma.emailToken.create({
    data: {
      userId,
      purpose: 'EMAIL_VERIFICATION',
      tokenHash: hashToken(token),
      expiresAt: tokenExpiry(),
    },
  });

  const link = `${env.appUrl}/verify-email?token=${encodeURIComponent(token)}`;
  const content = buildConfirmationEmail(fullName, link);
  await queueEmail({
    to: email,
    subject: content.subject,
    body: content.body,
    purpose: 'EMAIL_VERIFICATION',
    userId,
  });
}

export async function resendVerificationEmail(userId: string): Promise<ServiceResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, emailVerifiedAt: true, status: true, profile: { select: { fullName: true } } },
  });
  if (!user) return failure('That account no longer exists.', { status: 404 });
  if (user.emailVerifiedAt) return failure('This email address is already confirmed.');
  if (user.status === 'SUSPENDED') return failure('This account is suspended.');

  const limit = consumeRateLimit(`resend:${userId}`, 5, 15 * 60);
  if (!limit.allowed) {
    return failure(
      `Please wait ${limit.retryAfterSeconds} seconds before requesting another email.`,
      { status: 429 },
    );
  }

  const fullName = user.profile?.fullName && user.profile.fullName.length > 0 ? user.profile.fullName : null;
  await issueEmailVerification(user.id, user.email, fullName);
  return success();
}

export async function confirmEmailAddress(rawToken: string, meta: RequestMeta): Promise<ServiceResult> {
  const token = rawToken.trim();
  if (token.length === 0) return failure('This confirmation link is not valid.');

  const record = await prisma.emailToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { select: { id: true, emailVerifiedAt: true, status: true } } },
  });

  if (!record || record.purpose !== 'EMAIL_VERIFICATION') {
    return failure('This confirmation link is not valid.');
  }
  if (record.consumedAt) {
    return failure('This confirmation link has already been used. Sign in to continue.');
  }
  if (record.expiresAt.getTime() <= Date.now()) {
    return failure('This confirmation link has expired. Request a new one from the confirmation page.');
  }
  if (record.user.status === 'SUSPENDED') {
    return failure('This account is suspended.');
  }

  await prisma.$transaction([
    prisma.emailToken.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: record.userId },
      data: {
        emailVerifiedAt: record.user.emailVerifiedAt ?? new Date(),
        status: record.user.status === 'PENDING_EMAIL' ? 'ACTIVE' : record.user.status,
      },
    }),
  ]);

  await recordAudit({
    actorUserId: record.userId,
    action: 'account.email_confirmed',
    entityType: 'user',
    entityId: record.userId,
    ip: meta.ip,
  });

  return success();
}

// ── Sign in ──────────────────────────────────────────────────────────────────

export async function signIn(
  rawInput: unknown,
  meta: RequestMeta,
): Promise<
  ServiceResult<{
    userId: string;
    token: string;
    expiresAt: Date;
    emailVerified: boolean;
    roles: string[];
    /** True when the account uses two-factor and this session must still give a code. */
    twoFactorRequired: boolean;
  }>
> {
  const parsed = loginSchema.safeParse(rawInput);
  if (!parsed.success) return fromZodError(parsed.error);

  const { email, password } = parsed.data;
  const throttleKey = `login:${email}:${meta.ip ?? 'unknown'}`;
  const limit = consumeRateLimit(throttleKey, 8, 15 * 60);
  if (!limit.allowed) {
    return failure(
      `Too many failed attempts. Try again in ${Math.ceil(limit.retryAfterSeconds / 60)} minute(s).`,
      { status: 429 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      passwordHash: true,
      status: true,
      emailVerifiedAt: true,
      roles: true,
      twoFactorEnabledAt: true,
    },
  });

  // Verify against a dummy hash when the account is missing so the response
  // time does not reveal whether the address is registered.
  const DUMMY_HASH =
    'scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==';
  const passwordMatches = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);

  if (!user || !passwordMatches) {
    await recordAudit({
      action: 'account.login_failed',
      entityType: 'user',
      entityId: user?.id ?? null,
      metadata: { email },
      ip: meta.ip,
    });
    return failure(INVALID_CREDENTIALS);
  }

  if (user.status === 'SUSPENDED') {
    return failure('This account is suspended. Contact a reviewer for details.');
  }

  resetRateLimit(throttleKey);

  // A code-protected account gets a session that can reach the prompt and
  // nothing else until the second factor is given.
  const twoFactorRequired = user.twoFactorEnabledAt !== null;
  const session = await createSession(user.id, meta, {
    twoFactorPassed: !twoFactorRequired,
  });
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  await recordAudit({
    actorUserId: user.id,
    action: 'account.signed_in',
    entityType: 'user',
    entityId: user.id,
    ip: meta.ip,
  });

  return success({
    userId: user.id,
    token: session.token,
    expiresAt: session.expiresAt,
    emailVerified: user.emailVerifiedAt !== null,
    roles: user.roles,
    twoFactorRequired,
  });
}

// ── Password reset ───────────────────────────────────────────────────────────

export async function requestPasswordReset(rawInput: unknown, meta: RequestMeta): Promise<ServiceResult<{ delivered: boolean }>> {
  const parsed = forgotPasswordSchema.safeParse(rawInput);
  if (!parsed.success) return fromZodError(parsed.error);

  const limit = consumeRateLimit(`reset:${meta.ip ?? 'unknown'}`, 6, 60 * 60);
  if (!limit.allowed) {
    return failure('Too many reset requests. Try again later.', { status: 429 });
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, email: true, status: true, profile: { select: { fullName: true } } },
  });

  // Always report the same outcome, whether or not the address exists.
  if (!user || user.status === 'SUSPENDED') {
    return success({ delivered: false });
  }

  await prisma.emailToken.updateMany({
    where: { userId: user.id, purpose: 'PASSWORD_RESET', consumedAt: null },
    data: { consumedAt: new Date() },
  });

  const token = generateToken();
  await prisma.emailToken.create({
    data: {
      userId: user.id,
      purpose: 'PASSWORD_RESET',
      tokenHash: hashToken(token),
      expiresAt: tokenExpiry(),
    },
  });

  const link = `${env.appUrl}/reset-password?token=${encodeURIComponent(token)}`;
  const content = buildPasswordResetEmail(user.profile?.fullName || null, link);
  await queueEmail({
    to: user.email,
    subject: content.subject,
    body: content.body,
    purpose: 'PASSWORD_RESET',
    userId: user.id,
  });

  await recordAudit({
    actorUserId: user.id,
    action: 'account.password_reset_requested',
    entityType: 'user',
    entityId: user.id,
    ip: meta.ip,
  });

  return success({ delivered: true });
}

export async function resetPassword(rawInput: unknown, meta: RequestMeta): Promise<ServiceResult> {
  const parsed = resetPasswordSchema.safeParse(rawInput);
  if (!parsed.success) return fromZodError(parsed.error);

  const record = await prisma.emailToken.findUnique({
    where: { tokenHash: hashToken(parsed.data.token) },
    select: { id: true, userId: true, purpose: true, consumedAt: true, expiresAt: true },
  });

  if (!record || record.purpose !== 'PASSWORD_RESET') {
    return failure('This password reset link is not valid.');
  }
  if (record.consumedAt) {
    return failure('This password reset link has already been used.');
  }
  if (record.expiresAt.getTime() <= Date.now()) {
    return failure('This password reset link has expired. Request a new one.');
  }

  const passwordHash = await hashPassword(parsed.data.password);

  await prisma.$transaction([
    prisma.emailToken.update({ where: { id: record.id }, data: { consumedAt: new Date() } }),
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
  ]);

  // A password reset invalidates every existing session, including any the
  // attacker may hold.
  await revokeAllSessions(record.userId);

  await recordAudit({
    actorUserId: record.userId,
    action: 'account.password_reset_completed',
    entityType: 'user',
    entityId: record.userId,
    ip: meta.ip,
  });

  return success();
}

export async function changePassword(
  userId: string,
  rawInput: unknown,
  meta: RequestMeta,
  currentToken: string | null,
): Promise<ServiceResult> {
  const parsed = changePasswordSchema.safeParse(rawInput);
  if (!parsed.success) return fromZodError(parsed.error);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, passwordHash: true },
  });
  if (!user) return failure('That account no longer exists.', { status: 404 });

  const matches = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
  if (!matches) {
    return failure('Your current password is incorrect.', {
      fieldErrors: { currentPassword: 'Your current password is incorrect.' },
    });
  }

  const sameAsOld = await verifyPassword(parsed.data.password, user.passwordHash);
  if (sameAsOld) {
    return failure('Choose a password you have not used before.', {
      fieldErrors: { password: 'This is your current password.' },
    });
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

  const revoked = await revokeAllSessions(userId, currentToken);

  await recordAudit({
    actorUserId: userId,
    action: 'account.password_changed',
    entityType: 'user',
    entityId: userId,
    metadata: { otherSessionsRevoked: revoked },
    ip: meta.ip,
  });

  return success();
}

// ── Sign out ─────────────────────────────────────────────────────────────────

export async function signOut(userId: string, token: string | null, meta: RequestMeta): Promise<void> {
  if (token) {
    await prisma.session.updateMany({
      where: { tokenHash: hashToken(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  await recordAudit({
    actorUserId: userId,
    action: 'account.signed_out',
    entityType: 'user',
    entityId: userId,
    ip: meta.ip,
  });
}

export function accountTypeName(accountType: keyof typeof ACCOUNT_TYPE_LABEL): string {
  return ACCOUNT_TYPE_LABEL[accountType];
}
