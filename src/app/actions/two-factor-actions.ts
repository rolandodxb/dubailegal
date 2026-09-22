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

/** Starts an enrolment and hands back everything needed to set the app up. */
export async function beginTwoFactorAction(_prev: FormState, _formData: FormData): Promise<FormState> {
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
export async function confirmTwoFactorAction(_prev: FormState, formData: FormData): Promise<FormState> {
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

export async function disableTwoFactorAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireSession();
  const meta = await requestMeta();

  const result = await disableTwoFactor(user.id, String(formData.get('password') ?? ''), meta);
  revalidatePath('/account');
  if (!result.ok) {
    return { ok: false, message: result.message, fieldErrors: result.fieldErrors };
  }
  return { ok: true, message: 'Two-factor authentication is off. Your password alone now signs you in.' };
}

export async function regenerateRecoveryCodesAction(
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
export async function verifyTwoFactorLoginAction(
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
export async function abandonTwoFactorLoginAction(): Promise<void> {
  const token = await currentSessionToken();
  if (token) {
    await prisma.session.updateMany({
      where: { tokenHash: hashToken(token) },
      data: { revokedAt: new Date() },
    });
  }
  redirect('/login');
}
