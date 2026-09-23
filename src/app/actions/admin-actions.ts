'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requestMeta, requireReviewer } from '@/lib/auth';
import type { FormState } from '@/lib/form-state';
import { setReviewerRole, setUserSuspended } from '@/server/services/admin-service';
import { claimCase, decideCase, reviewDocument } from '@/server/services/verification-service';
import { localiseFormState } from '@/lib/i18n/form-messages';

// ── Verification queue ───────────────────────────────────────────────────────

async function claimCaseActionImpl(_prev: FormState, formData: FormData): Promise<FormState> {
  const reviewer = await requireReviewer();
  const meta = await requestMeta();
  const caseId = String(formData.get('caseId') ?? '');

  const result = await claimCase(caseId, reviewer.id, meta);
  if (!result.ok) return { ok: false, message: result.message };

  revalidatePath('/admin/verifications');
  revalidatePath(`/admin/verifications/${caseId}`);
  redirect(`/admin/verifications/${caseId}`);
}

async function reviewDocumentActionImpl(_prev: FormState, formData: FormData): Promise<FormState> {
  const reviewer = await requireReviewer();
  const meta = await requestMeta();

  const documentId = String(formData.get('documentId') ?? '');
  const caseId = String(formData.get('caseId') ?? '');
  const decision = String(formData.get('decision') ?? '');
  const notes = String(formData.get('notes') ?? '');

  if (decision !== 'APPROVED' && decision !== 'REJECTED') {
    return { ok: false, message: 'Choose whether to accept or reject this document.' };
  }

  const result = await reviewDocument(documentId, reviewer.id, decision, notes, meta);
  if (!result.ok) {
    return { ok: false, message: result.message, fieldErrors: result.fieldErrors };
  }

  revalidatePath(`/admin/verifications/${caseId}`);
  return {
    ok: true,
    message:
      decision === 'APPROVED'
        ? 'Document accepted.'
        : 'Document rejected. The applicant will see your reason.',
  };
}

async function decideCaseActionImpl(_prev: FormState, formData: FormData): Promise<FormState> {
  const reviewer = await requireReviewer();
  const meta = await requestMeta();

  const caseId = String(formData.get('caseId') ?? '');
  const result = await decideCase(
    caseId,
    reviewer.id,
    {
      caseId,
      decision: formData.get('decision'),
      notes: formData.get('notes'),
    },
    meta,
  );

  if (!result.ok) {
    return { ok: false, message: result.message, fieldErrors: result.fieldErrors };
  }

  revalidatePath('/admin/verifications');
  revalidatePath(`/admin/verifications/${caseId}`);
  revalidatePath('/directory');

  redirect(`/admin/verifications/${caseId}?notice=decided-${result.data.decision.toLowerCase()}`);
}

// ── Account administration ───────────────────────────────────────────────────

async function suspendUserActionImpl(_prev: FormState, formData: FormData): Promise<FormState> {
  const reviewer = await requireReviewer();
  const meta = await requestMeta();

  const result = await setUserSuspended(
    reviewer.id,
    String(formData.get('userId') ?? ''),
    true,
    String(formData.get('reason') ?? ''),
    meta,
  );
  if (!result.ok) return { ok: false, message: result.message };

  revalidatePath('/admin/users');
  return { ok: true, message: 'Account suspended and all its sessions signed out.' };
}

async function reinstateUserActionImpl(_prev: FormState, formData: FormData): Promise<FormState> {
  const reviewer = await requireReviewer();
  const meta = await requestMeta();

  const result = await setUserSuspended(
    reviewer.id,
    String(formData.get('userId') ?? ''),
    false,
    null,
    meta,
  );
  if (!result.ok) return { ok: false, message: result.message };

  revalidatePath('/admin/users');
  return { ok: true, message: 'Account reinstated.' };
}

async function setReviewerRoleActionImpl(_prev: FormState, formData: FormData): Promise<FormState> {
  const reviewer = await requireReviewer();
  const meta = await requestMeta();

  const grant = String(formData.get('grant') ?? '') === 'true';
  const result = await setReviewerRole(reviewer.id, String(formData.get('userId') ?? ''), grant, meta);
  if (!result.ok) return { ok: false, message: result.message };

  revalidatePath('/admin/users');
  return {
    ok: true,
    message: grant ? 'Reviewer access granted.' : 'Reviewer access removed.',
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
export async function claimCaseAction(
  ...args: Parameters<typeof claimCaseActionImpl>
): Promise<Awaited<ReturnType<typeof claimCaseActionImpl>>> {
  return localiseFormState(await claimCaseActionImpl(...args));
}

export async function reviewDocumentAction(
  ...args: Parameters<typeof reviewDocumentActionImpl>
): Promise<Awaited<ReturnType<typeof reviewDocumentActionImpl>>> {
  return localiseFormState(await reviewDocumentActionImpl(...args));
}

export async function decideCaseAction(
  ...args: Parameters<typeof decideCaseActionImpl>
): Promise<Awaited<ReturnType<typeof decideCaseActionImpl>>> {
  return localiseFormState(await decideCaseActionImpl(...args));
}

export async function suspendUserAction(
  ...args: Parameters<typeof suspendUserActionImpl>
): Promise<Awaited<ReturnType<typeof suspendUserActionImpl>>> {
  return localiseFormState(await suspendUserActionImpl(...args));
}

export async function reinstateUserAction(
  ...args: Parameters<typeof reinstateUserActionImpl>
): Promise<Awaited<ReturnType<typeof reinstateUserActionImpl>>> {
  return localiseFormState(await reinstateUserActionImpl(...args));
}

export async function setReviewerRoleAction(
  ...args: Parameters<typeof setReviewerRoleActionImpl>
): Promise<Awaited<ReturnType<typeof setReviewerRoleActionImpl>>> {
  return localiseFormState(await setReviewerRoleActionImpl(...args));
}
