'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requestMeta, requireReviewer } from '@/lib/auth';
import type { FormState } from '@/lib/form-state';
import { setReviewerRole, setUserSuspended } from '@/server/services/admin-service';
import { claimCase, decideCase, reviewDocument } from '@/server/services/verification-service';

// ── Verification queue ───────────────────────────────────────────────────────

export async function claimCaseAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const reviewer = await requireReviewer();
  const meta = await requestMeta();
  const caseId = String(formData.get('caseId') ?? '');

  const result = await claimCase(caseId, reviewer.id, meta);
  if (!result.ok) return { ok: false, message: result.message };

  revalidatePath('/admin/verifications');
  revalidatePath(`/admin/verifications/${caseId}`);
  redirect(`/admin/verifications/${caseId}`);
}

export async function reviewDocumentAction(_prev: FormState, formData: FormData): Promise<FormState> {
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

export async function decideCaseAction(_prev: FormState, formData: FormData): Promise<FormState> {
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

export async function suspendUserAction(_prev: FormState, formData: FormData): Promise<FormState> {
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

export async function reinstateUserAction(_prev: FormState, formData: FormData): Promise<FormState> {
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

export async function setReviewerRoleAction(_prev: FormState, formData: FormData): Promise<FormState> {
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
