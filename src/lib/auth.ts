import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { AccountType, Prisma, Role, VerificationStatus } from '@prisma/client';
import { prisma } from './db';
import { env } from './env';
import { generateToken, hashIp, hashToken } from './tokens';

export type SessionUser = Prisma.UserGetPayload<{ include: { profile: true } }> & {
  /**
   * Whether this session has satisfied the second factor. False for a session
   * belonging to a code-protected account that has only given its password.
   */
  twoFactorSatisfied: boolean;
  /** The session row, so a verified code can be recorded against it. */
  sessionId: string;
};

export type RequestMeta = { ip: string | null; userAgent: string | null };

/** Client metadata for session and audit records. */
export async function requestMeta(): Promise<RequestMeta> {
  const headerList = await headers();
  const forwarded = headerList.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0]!.trim() : headerList.get('x-real-ip');
  return {
    ip: ip && ip.length > 0 ? ip : null,
    userAgent: headerList.get('user-agent')?.slice(0, 300) ?? null,
  };
}

// ── Creating and destroying sessions ─────────────────────────────────────────

export async function createSession(
  userId: string,
  meta: RequestMeta,
  options: { twoFactorPassed?: boolean } = {},
): Promise<{ token: string; expiresAt: Date }> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + env.sessionAbsoluteDays * 24 * 60 * 60 * 1000);
  await prisma.session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt,
      ipHash: hashIp(meta.ip),
      userAgent: meta.userAgent,
      // A session starts unverified when the account uses two-factor; it can
      // reach the prompt and nothing else until a code is given.
      twoFactorPassedAt: options.twoFactorPassed === false ? null : new Date(),
    },
  });
  return { token, expiresAt };
}

/** Only callable from a Server Action or Route Handler. */
export async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(env.sessionCookieName, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.isProduction,
    path: '/',
    expires: expiresAt,
  });
}

/** Only callable from a Server Action or Route Handler. */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(env.sessionCookieName, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.isProduction,
    path: '/',
    maxAge: 0,
  });
}

async function readSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(env.sessionCookieName)?.value;
  return value && value.length > 0 ? value : null;
}

/**
 * Resolves the signed-in user, or null.
 *
 * A session is rejected when it is revoked, past its absolute expiry, or idle
 * for longer than SESSION_IDLE_DAYS. `lastSeenAt` is only written when it is
 * more than five minutes stale, so page views do not each cost a write.
 */
export const getSessionUser = cache(async function getSessionUser(): Promise<SessionUser | null> {
  const token = await readSessionToken();
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { include: { profile: true } } },
  });
  if (!session) return null;
  if (session.revokedAt !== null) return null;

  const now = Date.now();
  if (session.expiresAt.getTime() <= now) return null;

  const idleLimitMs = env.sessionIdleDays * 24 * 60 * 60 * 1000;
  if (now - session.lastSeenAt.getTime() > idleLimitMs) {
    await prisma.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
    return null;
  }

  if (now - session.lastSeenAt.getTime() > 5 * 60 * 1000) {
    await prisma.session
      .update({ where: { id: session.id }, data: { lastSeenAt: new Date() } })
      .catch(() => undefined);
  }

  const { user, ...sessionRow } = session;
  return {
    ...user,
    sessionId: session.id,
    twoFactorSatisfied:
      user.twoFactorEnabledAt === null || session.twoFactorPassedAt !== null,
  };
});

export async function revokeSessionByToken(token: string): Promise<void> {
  await prisma.session.updateMany({
    where: { tokenHash: hashToken(token), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllSessions(userId: string, exceptToken?: string | null): Promise<number> {
  const result = await prisma.session.updateMany({
    where: {
      userId,
      revokedAt: null,
      ...(exceptToken ? { tokenHash: { not: hashToken(exceptToken) } } : {}),
    },
    data: { revokedAt: new Date() },
  });
  return result.count;
}

export async function currentSessionToken(): Promise<string | null> {
  return readSessionToken();
}

// ── Guards for pages and actions ─────────────────────────────────────────────

/** Any signed-in user, email confirmed or not, second factor satisfied. */
export async function requireSession(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (!user.twoFactorSatisfied) redirect('/login/two-factor');
  if (user.status === 'SUSPENDED') {
    await clearSessionCookie();
    redirect('/login?notice=suspended');
  }
  return user;
}

/** A signed-in user whose email address is confirmed (or confirmation is off). */
export async function requireActiveUser(): Promise<SessionUser> {
  const user = await requireSession();
  if (env.requireEmailVerification && !user.emailVerifiedAt) redirect('/verify-email');
  return user;
}

/** Where a signed-in account should land: reviewers go straight to the console. */
export function homePathFor(user: Pick<SessionUser, 'roles'> & { accountType: string }): string {
  if (user.roles.includes('REVIEWER')) return '/admin/verifications';
  return '/dashboard';
}

/** A signed-in user with the REVIEWER role. */
export async function requireReviewer(): Promise<SessionUser> {
  const user = await requireActiveUser();
  if (!user.roles.includes('REVIEWER')) redirect('/dashboard?notice=reviewer-only');
  return user;
}

/**
 * True for accounts that hold reviewer access.
 *
 * An administrator runs the platform. They are deliberately not a client and not
 * a professional: they cannot send a case, take one, book a meeting or write a
 * review, and they do not get a member dashboard.
 */
export function isAdministrator(user: Pick<SessionUser, 'roles'> | null | undefined): boolean {
  return Boolean(user?.roles.includes('REVIEWER'));
}

/**
 * A member account — everyone except an administrator.
 *
 * Administrator accounts are sent to the console instead, so the member area is
 * closed to them in both directions: they cannot reach it, and the interface
 * never offers it.
 */
export async function requireMember(): Promise<SessionUser> {
  const user = await requireActiveUser();
  if (isAdministrator(user)) redirect('/admin/verifications?notice=administrators-only');
  return user;
}

/** A signed-in lawyer or legal firm — the accounts that have a practice dashboard. */
export async function requireProfessional(): Promise<SessionUser> {
  const user = await requireMember();
  if (user.accountType !== 'LAWYER' && user.accountType !== 'FIRM') {
    redirect('/dashboard?notice=professionals-only');
  }
  return user;
}

export function isReviewer(user: Pick<SessionUser, 'roles'> | null | undefined): boolean {
  return Boolean(user?.roles.includes('REVIEWER'));
}

export function hasRole(user: Pick<SessionUser, 'roles'>, role: Role): boolean {
  return user.roles.includes(role);
}

/**
 * Presentation state for the verification badge. A badge is only ever returned
 * as verified when a reviewer recorded an approval.
 */
export function badgeState(user: {
  accountType: AccountType;
  verificationStatus: VerificationStatus;
  verifiedAt: Date | null;
}): { verified: boolean; status: VerificationStatus } {
  return {
    verified: user.verificationStatus === 'APPROVED' && user.verifiedAt !== null,
    status: user.verificationStatus,
  };
}
