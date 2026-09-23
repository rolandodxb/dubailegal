import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { randomBytes } from 'node:crypto';
import { prisma } from '@/lib/db';
import { recordAudit } from '@/lib/audit';
import { keyedDigest } from '@/lib/tokens';
import { verifyPassword } from '@/lib/password';
import { env } from '@/lib/env';
import { failure, success, type ServiceResult } from './result';

/**
 * Two-factor authentication.
 *
 * Time-based codes (RFC 6238) from any authenticator app, plus single-use
 * recovery codes for the day the phone is lost. The shared secret is only
 * *enabled* once a code has been proven to work, so a half-finished enrolment
 * can never lock anybody out, and recovery codes are stored as keyed digests so a
 * database read cannot use them.
 *
 * Two-factor is genuinely optional: every account may turn it on, and nothing
 * breaks for the accounts that do not.
 */

const ISSUER = 'Legal Dash';
const RECOVERY_CODE_COUNT = 8;

/** One step of drift either side, which covers a slightly wrong device clock. */
authenticator.options = { window: 1 };

export function twoFactorEnabled(user: { twoFactorEnabledAt: Date | null }): boolean {
  return user.twoFactorEnabledAt !== null;
}

function normaliseCode(input: string): string {
  return input.replace(/[\s-]/g, '').trim();
}

/**
 * The digest a recovery code is stored and checked under.
 *
 * Both sides must normalise the same way. Storing the digest of the dashed form
 * and checking the digest of the stripped form made every recovery code fail —
 * which is exactly the kind of bug that only shows up when somebody has lost
 * their phone.
 */
function recoveryDigest(code: string): string {
  return keyedDigest(`recovery:${normaliseCode(code).toUpperCase()}`);
}

function generateRecoveryCodes(): string[] {
  return Array.from({ length: RECOVERY_CODE_COUNT }, () => {
    const raw = randomBytes(5).toString('hex').toUpperCase();
    return `${raw.slice(0, 5)}-${raw.slice(5, 10)}`;
  });
}

/**
 * Starts an enrolment.
 *
 * The secret is stored but not enabled; it becomes active only once the member
 * proves their app produces the right code. Everything needed to set the app up
 * is returned once, and never shown again.
 */
export async function beginEnrolment(userId: string): Promise<
  ServiceResult<{ secret: string; otpauthUrl: string; qrDataUrl: string }>
> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, twoFactorEnabledAt: true },
  });
  if (!user) return failure('That account no longer exists.', { status: 404 });

  if (user.twoFactorEnabledAt !== null) {
    return failure('Two-factor authentication is already on. Turn it off first to set it up again.');
  }

  const secret = authenticator.generateSecret();
  await prisma.user.update({ where: { id: userId }, data: { twoFactorSecret: secret } });

  const otpauthUrl = authenticator.keyuri(user.email, ISSUER, secret);
  const qrDataUrl = await QRCode.toDataURL(otpauthUrl, { margin: 1, width: 220 });

  return success({ secret, otpauthUrl, qrDataUrl });
}

/**
 * Confirms an enrolment.
 *
 * Only a correct code turns it on, so nobody can be locked out by a secret they
 * never managed to scan. The recovery codes are returned in clear exactly once.
 */
export async function confirmEnrolment(
  userId: string,
  code: string,
  meta: { ip?: string | null; keepSessionId?: string | null } = {},
): Promise<ServiceResult<{ recoveryCodes: string[] }>> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFactorSecret: true, twoFactorEnabledAt: true },
  });
  if (!user?.twoFactorSecret) {
    return failure('Start setting up two-factor authentication first.');
  }
  if (user.twoFactorEnabledAt !== null) return failure('Two-factor authentication is already on.');

  const token = normaliseCode(code);
  if (!authenticator.verify({ token, secret: user.twoFactorSecret })) {
    return failure('That code is not right. Check the app and try the current one.', {
      fieldErrors: { code: 'Incorrect or expired code.' },
    });
  }

  const recoveryCodes = generateRecoveryCodes();

  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorEnabledAt: new Date(),
      twoFactorRecoveryCodes: recoveryCodes.map(recoveryDigest),
    },
  });

  // Every OTHER session is revoked, so a stolen one cannot outlive the second
  // factor. The session reading these recovery codes is kept, because signing the
  // member out before they can save them would be a trap.
  await prisma.session.updateMany({
    where: {
      userId,
      revokedAt: null,
      ...(meta.keepSessionId ? { id: { not: meta.keepSessionId } } : {}),
    },
    data: { revokedAt: new Date() },
  });

  await recordAudit({
    actorUserId: userId,
    action: 'two_factor.enabled',
    entityType: 'user',
    entityId: userId,
    ip: meta.ip ?? null,
  });

  return success({ recoveryCodes });
}

/**
 * Verifies a code, from the authenticator app or from a recovery code.
 *
 * A recovery code is consumed as it is used, so a leaked list is worth one sign-in
 * rather than many.
 */
export async function verifySecondFactor(userId: string, code: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFactorSecret: true, twoFactorEnabledAt: true, twoFactorRecoveryCodes: true },
  });
  if (!user?.twoFactorSecret || user.twoFactorEnabledAt === null) return false;

  const token = normaliseCode(code);

  if (authenticator.verify({ token, secret: user.twoFactorSecret })) return true;

  const digest = recoveryDigest(token);
  if (!user.twoFactorRecoveryCodes.includes(digest)) return false;

  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorRecoveryCodes: user.twoFactorRecoveryCodes.filter((value) => value !== digest),
    },
  });

  await recordAudit({
    actorUserId: userId,
    action: 'two_factor.recovery_code_used',
    entityType: 'user',
    entityId: userId,
    metadata: { remaining: user.twoFactorRecoveryCodes.length - 1 },
  });

  return true;
}

/** Marks this session as having satisfied the second factor. */
export async function markSessionVerified(sessionId: string): Promise<void> {
  await prisma.session.update({
    where: { id: sessionId },
    data: { twoFactorPassedAt: new Date() },
  });
}

/**
 * Turns two-factor off. The password is required, so a borrowed session cannot
 * quietly remove the protection.
 */
export async function disableTwoFactor(
  userId: string,
  password: string,
  meta: { ip?: string | null } = {},
): Promise<ServiceResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true, twoFactorEnabledAt: true },
  });
  if (!user) return failure('That account no longer exists.', { status: 404 });
  if (user.twoFactorEnabledAt === null) return failure('Two-factor authentication is not on.');

  if (!(await verifyPassword(password, user.passwordHash))) {
    return failure('That password is not correct.', {
      fieldErrors: { password: 'Incorrect password.' },
    });
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorEnabledAt: null,
      twoFactorSecret: null,
      twoFactorRecoveryCodes: [],
    },
  });

  await recordAudit({
    actorUserId: userId,
    action: 'two_factor.disabled',
    entityType: 'user',
    entityId: userId,
    ip: meta.ip ?? null,
  });

  return success();
}

/** Issues a fresh set of recovery codes, invalidating the old ones. */
export async function regenerateRecoveryCodes(
  userId: string,
  password: string,
): Promise<ServiceResult<{ recoveryCodes: string[] }>> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true, twoFactorEnabledAt: true },
  });
  if (!user) return failure('That account no longer exists.', { status: 404 });
  if (user.twoFactorEnabledAt === null) return failure('Two-factor authentication is not on.');

  if (!(await verifyPassword(password, user.passwordHash))) {
    return failure('That password is not correct.', {
      fieldErrors: { password: 'Incorrect password.' },
    });
  }

  const recoveryCodes = generateRecoveryCodes();
  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorRecoveryCodes: recoveryCodes.map(recoveryDigest) },
  });

  await recordAudit({
    actorUserId: userId,
    action: 'two_factor.recovery_codes_regenerated',
    entityType: 'user',
    entityId: userId,
  });

  return success({ recoveryCodes });
}

/** How many recovery codes remain, for the account page. */
export async function recoveryCodeCount(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFactorRecoveryCodes: true },
  });
  return user?.twoFactorRecoveryCodes.length ?? 0;
}

/** The installation's own advice about what protects an account. */
export function issuerName(): string {
  return ISSUER;
}

export function appUrl(): string {
  return env.appUrl;
}
