'use server';

import { redirect } from 'next/navigation';
import type { Role } from '@prisma/client';
import {
  changePassword,
  confirmEmailAddress,
  registerAccount,
  requestPasswordReset,
  resendVerificationEmail,
  resetPassword,
  signIn,
  signOut,
} from '@/server/services/auth-service';
import {
  clearSessionCookie,
  currentSessionToken,
  homePathFor,
  requestMeta,
  requireSession,
  revokeAllSessions,
  setSessionCookie,
} from '@/lib/auth';
import { emailDeliveryNotice } from '@/lib/email';
import { featureDisabledMessage, getAvailability, isEnabled } from '@/lib/availability';
import { formDataToObject, type FormState } from '@/lib/form-state';
import { safeNextPath } from '@/lib/redirect';
import { localiseFormState } from '@/lib/i18n/form-messages';

async function registerActionImpl(_prev: FormState, formData: FormData): Promise<FormState> {
  // A disabled function must refuse the submission, not merely hide the form.
  const availability = await getAvailability();
  if (!isEnabled(availability.settings, 'feature.registration')) {
    return { ok: false, message: featureDisabledMessage('feature.registration') };
  }

  const meta = await requestMeta();
  const inviteToken = formData.get('inviteToken');
  const result = await registerAccount(formDataToObject(formData), meta, {
    inviteToken: typeof inviteToken === 'string' ? inviteToken : null,
  });

  if (!result.ok) {
    return {
      ok: false,
      message: result.message,
      fieldErrors: result.fieldErrors,
      values: {
        accountType: String(formData.get('accountType') ?? ''),
        fullName: String(formData.get('fullName') ?? ''),
        phone: String(formData.get('phone') ?? ''),
        email: String(formData.get('email') ?? ''),
        inviteToken: String(formData.get('inviteToken') ?? ''),
      },
    };
  }

  await setSessionCookie(result.data.token, result.data.expiresAt);

  // Reviewers land in the console; everyone else gets their dashboard.
  redirect(homePathFor({ roles: result.data.roles as Role[], accountType: '' }));
}

async function loginActionImpl(_prev: FormState, formData: FormData): Promise<FormState> {
  const meta = await requestMeta();
  const result = await signIn(
    { email: formData.get('email'), password: formData.get('password') },
    meta,
  );

  if (!result.ok) {
    return {
      ok: false,
      message: result.message,
      fieldErrors: result.fieldErrors,
      values: { email: String(formData.get('email') ?? '') },
    };
  }

  await setSessionCookie(result.data.token, result.data.expiresAt);

  // Somebody who was sent to sign in from a page goes back to that page — the
  // community, most often — rather than being dropped on their dashboard.
  const next = safeNextPath(formData.get('next'), '');

  // A code-protected account goes to the prompt; the session can reach nothing
  // else until the second factor is given.
  if (result.data.twoFactorRequired) {
    redirect(next ? `/login/two-factor?next=${encodeURIComponent(next)}` : '/login/two-factor');
  }

  if (!result.data.emailVerified) {
    redirect(next ? `/verify-email?next=${encodeURIComponent(next)}` : '/verify-email');
  }
  redirect(next || homePathFor({ roles: result.data.roles as Role[], accountType: '' }));
}

async function logoutActionImpl(): Promise<void> {
  const user = await requireSession();
  const meta = await requestMeta();
  const token = await currentSessionToken();
  await signOut(user.id, token, meta);
  await clearSessionCookie();
  redirect('/login?notice=signed-out');
}

/**
 * Confirms an email address. Deliberately driven by a button rather than by
 * loading the page, so that a mail client or security scanner prefetching the
 * link cannot silently consume the one-time token.
 */
async function verifyEmailActionImpl(_prev: FormState, formData: FormData): Promise<FormState> {
  const token = String(formData.get('token') ?? '');
  const meta = await requestMeta();
  const result = await confirmEmailAddress(token, meta);

  if (!result.ok) return { ok: false, message: result.message };

  redirect('/dashboard?notice=email-confirmed');
}

async function resendVerificationActionImpl(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireSession();
  const result = await resendVerificationEmail(user.id);
  if (!result.ok) return { ok: false, message: result.message };

  return {
    ok: true,
    message: `A new confirmation message has been recorded. ${emailDeliveryNotice()}`,
  };
}

async function forgotPasswordActionImpl(_prev: FormState, formData: FormData): Promise<FormState> {
  const meta = await requestMeta();
  const result = await requestPasswordReset({ email: formData.get('email') }, meta);

  if (!result.ok) {
    return {
      ok: false,
      message: result.message,
      fieldErrors: result.fieldErrors,
      values: { email: String(formData.get('email') ?? '') },
    };
  }

  // The same wording is returned whether or not the address is registered.
  return {
    ok: true,
    message: `If that email address has an account, a reset link has been recorded. ${emailDeliveryNotice()}`,
  };
}

async function resetPasswordActionImpl(_prev: FormState, formData: FormData): Promise<FormState> {
  const meta = await requestMeta();
  const result = await resetPassword(
    {
      token: formData.get('token'),
      password: formData.get('password'),
      confirmPassword: formData.get('confirmPassword'),
    },
    meta,
  );

  if (!result.ok) return { ok: false, message: result.message, fieldErrors: result.fieldErrors };

  redirect('/login?notice=password-reset');
}

async function changePasswordActionImpl(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireSession();
  const meta = await requestMeta();
  const token = await currentSessionToken();

  const result = await changePassword(
    user.id,
    {
      currentPassword: formData.get('currentPassword'),
      password: formData.get('password'),
      confirmPassword: formData.get('confirmPassword'),
    },
    meta,
    token,
  );

  if (!result.ok) return { ok: false, message: result.message, fieldErrors: result.fieldErrors };

  return {
    ok: true,
    message: 'Your password has been changed. Every other signed-in device has been signed out.',
  };
}

async function revokeOtherSessionsActionImpl(): Promise<void> {
  const user = await requireSession();
  const token = await currentSessionToken();
  await revokeAllSessions(user.id, token);
  redirect('/account?notice=sessions-revoked');
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
export async function registerAction(
  ...args: Parameters<typeof registerActionImpl>
): Promise<Awaited<ReturnType<typeof registerActionImpl>>> {
  return localiseFormState(await registerActionImpl(...args));
}

export async function loginAction(
  ...args: Parameters<typeof loginActionImpl>
): Promise<Awaited<ReturnType<typeof loginActionImpl>>> {
  return localiseFormState(await loginActionImpl(...args));
}

export async function logoutAction(
  ...args: Parameters<typeof logoutActionImpl>
): Promise<Awaited<ReturnType<typeof logoutActionImpl>>> {
  return localiseFormState(await logoutActionImpl(...args));
}

export async function verifyEmailAction(
  ...args: Parameters<typeof verifyEmailActionImpl>
): Promise<Awaited<ReturnType<typeof verifyEmailActionImpl>>> {
  return localiseFormState(await verifyEmailActionImpl(...args));
}

export async function resendVerificationAction(
  ...args: Parameters<typeof resendVerificationActionImpl>
): Promise<Awaited<ReturnType<typeof resendVerificationActionImpl>>> {
  return localiseFormState(await resendVerificationActionImpl(...args));
}

export async function forgotPasswordAction(
  ...args: Parameters<typeof forgotPasswordActionImpl>
): Promise<Awaited<ReturnType<typeof forgotPasswordActionImpl>>> {
  return localiseFormState(await forgotPasswordActionImpl(...args));
}

export async function resetPasswordAction(
  ...args: Parameters<typeof resetPasswordActionImpl>
): Promise<Awaited<ReturnType<typeof resetPasswordActionImpl>>> {
  return localiseFormState(await resetPasswordActionImpl(...args));
}

export async function changePasswordAction(
  ...args: Parameters<typeof changePasswordActionImpl>
): Promise<Awaited<ReturnType<typeof changePasswordActionImpl>>> {
  return localiseFormState(await changePasswordActionImpl(...args));
}

export async function revokeOtherSessionsAction(
  ...args: Parameters<typeof revokeOtherSessionsActionImpl>
): Promise<Awaited<ReturnType<typeof revokeOtherSessionsActionImpl>>> {
  return localiseFormState(await revokeOtherSessionsActionImpl(...args));
}
