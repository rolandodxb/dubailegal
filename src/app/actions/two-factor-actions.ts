'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { currentSessionToken, getSessionUser, requestMeta, requireSession } from '@/lib/auth';
import { hashToken } from '@/lib/tokens';
import { prisma } from '@/lib/db';
import { recordAudit } from '@/lib/audit';
import { failure, type ServiceResult } from '@/server/services/result';
import type { FormState } from '@/lib/form-state';
import {
  beginEnrolment,
  confirmEnrolment,
  disableTwoFactor,
  markSessionVerified,
  regenerateRecoveryCodes,
  verifySecondFactor,
} from '@/server/services/two-factor-service';
import { localiseFormState } from '@/lib/i18n/form-messages';

/** Starts an enrolment and hands back everything needed to set the app up. */
async function beginTwoFactorActionImpl(_prev: FormState, _formData: FormData): Promise<FormState> {
  const user = await requireSession();

  const result = await beginEnrolment(user.id);
  if (!result.ok) return { ok: false, message: result.message };

  revalidatePath('/account');
  return {
    ok: true,
    step: 'confirm',
    message: 'Scan the code with your authenticator app, then enter the six digits it shows.',
    data: {
      secret: result.data.secret,
      qrDataUrl: result.data.qrDataUrl,
      otpauthUrl: result.data.otpauthUrl,
    },
  };
}

/** Turns it on. The recovery codes are shown once and never again. */
async function confirmTwoFactorActionImpl(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireSession();
  const meta = await requestMeta();

  const result = await confirmEnrolment(user.id, String(formData.get('code') ?? ''), {
    ...meta,
    keepSessionId: user.sessionId,
  });
  if (!result.ok) {
    return {
      ok: false,
      step: 'confirm',
      message: result.message,
      fieldErrors: result.fieldErrors,
      data: {
        secret: String(formData.get('secret') ?? ''),
        qrDataUrl: String(formData.get('qrDataUrl') ?? ''),
      },
    };
  }

  // Turning it on revoked every session, including this one, so sign in again.
  revalidatePath('/account');
  return {
    ok: true,
    step: 'codes',
    message:
      'Two-factor authentication is on. Save these recovery codes now — they are shown once and each works once.',
    data: { recoveryCodes: result.data.recoveryCodes },
  };
}

async function disableTwoFactorActionImpl(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireSession();
  const meta = await requestMeta();

  const result = await disableTwoFactor(user.id, String(formData.get('password') ?? ''), meta);
  revalidatePath('/account');
  if (!result.ok) {
    return { ok: false, message: result.message, fieldErrors: result.fieldErrors };
  }
  return { ok: true, message: 'Two-factor authentication is off. Your password alone now signs you in.' };
}

async function regenerateRecoveryCodesActionImpl(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireSession();
  const result = await regenerateRecoveryCodes(user.id, String(formData.get('password') ?? ''));
  revalidatePath('/account');

  if (!result.ok) {
    return { ok: false, message: result.message, fieldErrors: result.fieldErrors };
  }
  return {
    ok: true,
    step: 'codes',
    message: 'New recovery codes issued. The previous ones no longer work.',
    data: { recoveryCodes: result.data.recoveryCodes },
  };
}

/**
 * The second step of signing in.
 *
 * The session already exists but can reach nothing; this is what makes it usable.
 * A recovery code works too, and is consumed as it is used.
 */
async function verifyTwoFactorLoginActionImpl(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (user.twoFactorSatisfied) redirect('/dashboard');

  const meta = await requestMeta();
  const code = String(formData.get('code') ?? '');

  const valid = await verifySecondFactor(user.id, code);
  if (!valid) {
    await recordAudit({
      actorUserId: user.id,
      action: 'two_factor.failed',
      entityType: 'user',
      entityId: user.id,
      ip: meta.ip,
    });
    return {
      ok: false,
      message: 'That code is not valid. Codes change every 30 seconds — try the current one.',
      fieldErrors: { code: 'Incorrect or expired code.' },
    };
  }

  await markSessionVerified(user.sessionId);
  await recordAudit({
    actorUserId: user.id,
    action: 'two_factor.satisfied',
    entityType: 'user',
    entityId: user.id,
    ip: meta.ip,
  });

  redirect(user.roles.includes('REVIEWER') ? '/admin/verifications' : '/dashboard');
}

/** Abandons a half-finished sign-in. */
async function abandonTwoFactorLoginActionImpl(): Promise<void> {
  const token = await currentSessionToken();
  if (token) {
    await prisma.session.updateMany({
      where: { tokenHash: hashToken(token) },
      data: { revokedAt: new Date() },
    });
  }
  redirect('/login');
}

/**
 * The actions, localised.
 *
 * Each one is the same function with its result passed through the message
 * catalogue, so a failed form reads in the language the member is using. The
 * implementation keeps its own name with an `Impl` suffix because a `'use
 * server'` module may only export async function declarations — a wrapped
 * constant would be rejected at build time.
 */
export async function beginTwoFactorAction(
  ...args: Parameters<typeof beginTwoFactorActionImpl>
): Promise<Awaited<ReturnType<typeof beginTwoFactorActionImpl>>> {
  return localiseFormState(await beginTwoFactorActionImpl(...args));
}

export async function confirmTwoFactorAction(
  ...args: Parameters<typeof confirmTwoFactorActionImpl>
): Promise<Awaited<ReturnType<typeof confirmTwoFactorActionImpl>>> {
  return localiseFormState(await confirmTwoFactorActionImpl(...args));
}

export async function disableTwoFactorAction(
  ...args: Parameters<typeof disableTwoFactorActionImpl>
): Promise<Awaited<ReturnType<typeof disableTwoFactorActionImpl>>> {
  return localiseFormState(await disableTwoFactorActionImpl(...args));
}

export async function regenerateRecoveryCodesAction(
  ...args: Parameters<typeof regenerateRecoveryCodesActionImpl>
): Promise<Awaited<ReturnType<typeof regenerateRecoveryCodesActionImpl>>> {
  return localiseFormState(await regenerateRecoveryCodesActionImpl(...args));
}

export async function verifyTwoFactorLoginAction(
  ...args: Parameters<typeof verifyTwoFactorLoginActionImpl>
): Promise<Awaited<ReturnType<typeof verifyTwoFactorLoginActionImpl>>> {
  return localiseFormState(await verifyTwoFactorLoginActionImpl(...args));
}

export async function abandonTwoFactorLoginAction(
  ...args: Parameters<typeof abandonTwoFactorLoginActionImpl>
): Promise<Awaited<ReturnType<typeof abandonTwoFactorLoginActionImpl>>> {
  return localiseFormState(await abandonTwoFactorLoginActionImpl(...args));
}
