'use server';

import { revalidatePath } from 'next/cache';
import { requestMeta, requireReviewer } from '@/lib/auth';
import type { FormState } from '@/lib/form-state';
import { recordAudit } from '@/lib/audit';
import {
  SETTING_DEFAULTS,
  setSetting,
  type SettingKey,
} from '@/server/services/settings-service';
import { clearAllTraffic, deleteAccount, deleteAllSampleData } from '@/server/services/admin-service';
import { setReviewVisibility } from '@/server/services/review-service';
import { localiseFormState } from '@/lib/i18n/form-messages';

const BOOLEAN_SETTINGS: SettingKey[] = [
  'maintenance.enabled',
  'feature.registration',
  'feature.directory',
  'feature.case_submission',
  'feature.inquiries',
  'feature.appointments',
  'feature.reviews',
  'feature.verification_submission',
];

function isSettingKey(value: string): value is SettingKey {
  return Object.prototype.hasOwnProperty.call(SETTING_DEFAULTS, value);
}

/**
 * Turns a single function on or off.
 *
 * The value is derived from whether the checkbox was submitted, so an unchecked
 * box means "off" rather than "missing" — the opposite of the usual form trap.
 */
async function toggleFeatureActionImpl(formData: FormData): Promise<void> {
  const reviewer = await requireReviewer();
  const meta = await requestMeta();

  const key = String(formData.get('key') ?? '');
  if (!isSettingKey(key) || !BOOLEAN_SETTINGS.includes(key)) return;

  const enabled = formData.get('enabled') === 'on' || formData.get('enabled') === 'true';
  await setSetting(reviewer.id, key, enabled ? 'true' : 'false', meta);

  revalidatePath('/admin/settings');
  revalidatePath('/directory');
  revalidatePath('/register');
}

/** Sets the maintenance message shown while maintenance mode is on. */
async function setMaintenanceMessageActionImpl(_prev: FormState, formData: FormData): Promise<FormState> {
  const reviewer = await requireReviewer();
  const meta = await requestMeta();

  const message = String(formData.get('message') ?? '').trim();
  if (message.length < 10) {
    return {
      ok: false,
      message: 'Write at least 10 characters so people know what is happening.',
      fieldErrors: { message: 'Too short.' },
      values: { message },
    };
  }

  await setSetting(reviewer.id, 'maintenance.message', message.slice(0, 500), meta);
  revalidatePath('/admin/settings');
  return { ok: true, message: 'Maintenance message saved.' };
}

/** Empties the traffic register. Records that it happened. */
async function clearTrafficActionImpl(_prev: FormState, _formData: FormData): Promise<FormState> {
  const reviewer = await requireReviewer();
  const meta = await requestMeta();

  const removed = await clearAllTraffic(reviewer.id, meta);
  revalidatePath('/admin/traffic');
  return { ok: true, message: `Cleared ${removed} activity record${removed === 1 ? '' : 's'}.` };
}

/** Hides or restores a review after moderation. */
async function moderateReviewActionImpl(_prev: FormState, formData: FormData): Promise<FormState> {
  const reviewer = await requireReviewer();
  const meta = await requestMeta();

  const reviewId = String(formData.get('reviewId') ?? '');
  const hidden = String(formData.get('hidden') ?? '') === 'true';
  const reason = String(formData.get('reason') ?? '');

  const result = await setReviewVisibility(reviewer.id, reviewId, hidden, reason, meta);
  revalidatePath('/admin/reviews');
  revalidatePath('/directory');
  if (!result.ok) return { ok: false, message: result.message };

  return { ok: true, message: hidden ? 'Review hidden.' : 'Review restored.' };
}

/**
 * Stops the application process.
 *
 * This is deliberately hard to trigger by accident: the operator must type the
 * confirmation phrase, the request is audited, and the response is allowed to
 * flush before the process exits. Afterwards the app must be started again from
 * a terminal — there is no way to bring it back up from the browser, which the
 * screen says before the button is pressed.
 */
async function shutdownServerActionImpl(_prev: FormState, formData: FormData): Promise<FormState> {
  const reviewer = await requireReviewer();
  const meta = await requestMeta();

  const confirmation = String(formData.get('confirm') ?? '').trim().toUpperCase();
  if (confirmation !== 'SHUT DOWN') {
    return {
      ok: false,
      message: 'Type SHUT DOWN exactly to confirm.',
      fieldErrors: { confirm: 'The phrase did not match.' },
    };
  }

  await recordAudit({
    actorUserId: reviewer.id,
    action: 'system.shutdown',
    entityType: 'system',
    entityId: 'server',
    metadata: { requestedBy: reviewer.email },
    ip: meta.ip ?? null,
  });

  // Let this response reach the browser before the process goes away.
  setTimeout(() => {
    console.info('[system] shutdown requested from the reviewer console');
    process.exit(0);
  }, 1500);

  return {
    ok: true,
    message:
      'The server is shutting down. This page will stop responding. Start it again from a terminal with “npm start” (or “npm run dev”).',
  };
}

/**
 * Deletes an account outright.
 *
 * Guarded by typing the account's email address, so a mistyped id cannot delete
 * the wrong person. The account's role is refused if it is the last reviewer, to
 * prevent an operator locking themselves out of the console.
 */
async function deleteAccountActionImpl(_prev: FormState, formData: FormData): Promise<FormState> {
  const reviewer = await requireReviewer();
  const meta = await requestMeta();

  const targetUserId = String(formData.get('userId') ?? '');
  const confirmation = String(formData.get('confirm') ?? '');

  const result = await deleteAccount(reviewer.id, targetUserId, confirmation, meta);

  if (!result.ok) {
    return {
      ok: false,
      message: result.message,
      fieldErrors: result.fieldErrors,
      values: { confirm: confirmation },
    };
  }

  revalidatePath('/admin/users');
  revalidatePath('/admin/cases');
  revalidatePath('/directory');

  return {
    ok: true,
    message: `${result.data.deletedEmail} and its ${result.data.documents} stored document(s) were deleted. The deletion is recorded in the audit trail.`,
  };
}

/**
 * Deletes every seeded sample account in one action.
 *
 * This installation never fabricates records, with one deliberate exception: the
 * accounts created by `npm run seed:demo` are flagged `isDemo`. This is the button
 * that undoes it, so nobody has to remember which addresses were seeded.
 */
async function deleteSampleDataActionImpl(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const reviewer = await requireReviewer();
  const meta = await requestMeta();

  const result = await deleteAllSampleData(
    reviewer.id,
    String(formData.get('confirm') ?? ''),
    meta,
  );

  if (!result.ok) {
    return {
      ok: false,
      message: result.message,
      fieldErrors: result.fieldErrors,
      values: { confirm: String(formData.get('confirm') ?? '') },
    };
  }

  revalidatePath('/admin/settings');
  revalidatePath('/admin/users');
  revalidatePath('/admin/cases');
  revalidatePath('/directory');

  const { accounts, documents, cases, emails } = result.data;
  if (accounts === 0) {
    return { ok: true, message: 'There was no sample data left to delete.' };
  }

  return {
    ok: true,
    message: `Deleted ${accounts} sample account${accounts === 1 ? '' : 's'}, ${documents} stored document${documents === 1 ? '' : 's'} and ${cases} case${cases === 1 ? '' : 's'} (${emails.join(', ')}). The deletion is recorded in the audit trail.`,
  };
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
export async function toggleFeatureAction(
  ...args: Parameters<typeof toggleFeatureActionImpl>
): Promise<Awaited<ReturnType<typeof toggleFeatureActionImpl>>> {
  return localiseFormState(await toggleFeatureActionImpl(...args));
}

export async function setMaintenanceMessageAction(
  ...args: Parameters<typeof setMaintenanceMessageActionImpl>
): Promise<Awaited<ReturnType<typeof setMaintenanceMessageActionImpl>>> {
  return localiseFormState(await setMaintenanceMessageActionImpl(...args));
}

export async function clearTrafficAction(
  ...args: Parameters<typeof clearTrafficActionImpl>
): Promise<Awaited<ReturnType<typeof clearTrafficActionImpl>>> {
  return localiseFormState(await clearTrafficActionImpl(...args));
}

export async function moderateReviewAction(
  ...args: Parameters<typeof moderateReviewActionImpl>
): Promise<Awaited<ReturnType<typeof moderateReviewActionImpl>>> {
  return localiseFormState(await moderateReviewActionImpl(...args));
}

export async function shutdownServerAction(
  ...args: Parameters<typeof shutdownServerActionImpl>
): Promise<Awaited<ReturnType<typeof shutdownServerActionImpl>>> {
  return localiseFormState(await shutdownServerActionImpl(...args));
}

export async function deleteAccountAction(
  ...args: Parameters<typeof deleteAccountActionImpl>
): Promise<Awaited<ReturnType<typeof deleteAccountActionImpl>>> {
  return localiseFormState(await deleteAccountActionImpl(...args));
}

export async function deleteSampleDataAction(
  ...args: Parameters<typeof deleteSampleDataActionImpl>
): Promise<Awaited<ReturnType<typeof deleteSampleDataActionImpl>>> {
  return localiseFormState(await deleteSampleDataActionImpl(...args));
}
