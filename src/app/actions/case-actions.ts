'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { isAdministrator, requestMeta, requireActiveUser } from '@/lib/auth';
import type { FormState } from '@/lib/form-state';
import { featureDisabledMessage, getAvailability, isEnabled } from '@/lib/availability';
import {
  acceptCase,
  advanceCase,
  createCase,
  declineCase,
  distributeCaseToFirmLawyers,
  passCaseOffer,
  postCaseMessage,
  reviewCase,
} from '@/server/services/case-service';

function revalidateCase(caseId?: string): void {
  for (const path of ['/dashboard', '/cases', '/portfolio', '/pending', '/clients']) {
    revalidatePath(path);
  }
  if (caseId) revalidatePath(`/cases/${caseId}`);
}

function echoValues(formData: FormData, keys: string[]): Record<string, string> {
  const values: Record<string, string> = {};
  for (const key of keys) values[key] = String(formData.get(key) ?? '');
  return values;
}

/** "Get in touch" → the client writes the case and attaches papers. */
export async function createCaseAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireActiveUser();

  if (isAdministrator(user)) {
    return { ok: false, message: 'Administrator accounts cannot send cases.' };
  }

  const availability = await getAvailability();
  if (!isEnabled(availability.settings, 'feature.case_submission')) {
    return { ok: false, message: featureDisabledMessage('feature.case_submission') };
  }
  const meta = await requestMeta();

  const files = formData
    .getAll('files')
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  const result = await createCase(
    user.id,
    {
      listingId: formData.get('listingId'),
      title: formData.get('title'),
      caseType: formData.get('caseType'),
      description: formData.get('description'),
    },
    files,
    meta,
  );

  if (!result.ok) {
    return {
      ok: false,
      message: result.message,
      fieldErrors: result.fieldErrors,
      values: echoValues(formData, ['listingId', 'title', 'caseType', 'description']),
    };
  }

  revalidateCase(result.data.caseId);
  redirect(`/cases/${result.data.caseId}?notice=case-submitted`);
}

export async function reviewCaseAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireActiveUser();
  const meta = await requestMeta();
  const caseId = String(formData.get('caseId') ?? '');

  const result = await reviewCase(caseId, user.id, meta);
  if (!result.ok) return { ok: false, message: result.message };

  revalidateCase(caseId);
  redirect(`/cases/${caseId}?notice=case-under-review`);
}

export async function acceptCaseAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireActiveUser();
  const meta = await requestMeta();
  const caseId = String(formData.get('caseId') ?? '');

  const result = await acceptCase(caseId, user.id, meta);
  if (!result.ok) return { ok: false, message: result.message };

  revalidateCase(caseId);
  redirect(`/cases/${caseId}?notice=case-assigned`);
}

export async function declineCaseAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireActiveUser();
  const meta = await requestMeta();
  const caseId = String(formData.get('caseId') ?? '');

  const result = await declineCase(caseId, user.id, { reason: formData.get('reason') }, meta);
  if (!result.ok) {
    return {
      ok: false,
      message: result.message,
      fieldErrors: result.fieldErrors,
      values: { reason: String(formData.get('reason') ?? '') },
    };
  }

  revalidateCase(caseId);
  redirect(`/cases/${caseId}?notice=case-declined`);
}

export async function advanceCaseAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireActiveUser();
  const meta = await requestMeta();
  const caseId = String(formData.get('caseId') ?? '');
  const target = String(formData.get('toStatus') ?? '');

  if (target !== 'IN_PROGRESS' && target !== 'COMPLETED') {
    return { ok: false, message: 'That is not a valid next step.' };
  }

  const result = await advanceCase(caseId, user.id, target, meta);
  if (!result.ok) return { ok: false, message: result.message };

  revalidateCase(caseId);
  redirect(`/cases/${caseId}?notice=${target === 'COMPLETED' ? 'case-completed' : 'case-in-progress'}`);
}

export async function postCaseMessageAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireActiveUser();
  const caseId = String(formData.get('caseId') ?? '');

  const files = formData
    .getAll('files')
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  const result = await postCaseMessage(caseId, user.id, {
    body: formData.get('body'),
    files,
  });
  if (!result.ok) {
    return {
      ok: false,
      message: result.message,
      fieldErrors: result.fieldErrors,
      values: { body: String(formData.get('body') ?? '') },
    };
  }

  revalidatePath(`/cases/${caseId}`);
  return {
    ok: true,
    message:
      result.data.attachments > 0
        ? `Sent with ${result.data.attachments} file${result.data.attachments === 1 ? '' : 's'}.`
        : 'Message sent.',
  };
}

/**
 * A firm releases a case it is holding to all of its registered lawyers.
 *
 * The firm reviews first and decides the work is a fit; only then does it go out.
 * Each lawyer then answers it themselves.
 */
export async function distributeCaseAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireActiveUser();
  const meta = await requestMeta();
  const caseId = String(formData.get('caseId') ?? '');

  if (user.accountType !== 'FIRM') {
    return { ok: false, message: 'Only a legal-firm account can release a case to its lawyers.' };
  }

  const result = await distributeCaseToFirmLawyers(caseId, user.id, meta);
  if (!result.ok) return { ok: false, message: result.message };

  revalidateCase(caseId);
  revalidatePath('/pending');
  revalidatePath('/firm/oversight');

  return {
    ok: true,
    message: `Released to ${result.data.offers} registered lawyer${result.data.offers === 1 ? '' : 's'}. They have each been asked to take it or pass.`,
  };
}

/**
 * A lawyer passes on a case their firm offered.
 *
 * This is not a refusal of the client: the case stays with the firm and goes to
 * whichever colleague takes it.
 */
export async function passCaseOfferAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireActiveUser();
  const caseId = String(formData.get('caseId') ?? '');

  const result = await passCaseOffer(caseId, user.id, String(formData.get('note') ?? ''));
  if (!result.ok) return { ok: false, message: result.message };

  revalidateCase(caseId);
  revalidatePath('/pending');

  return { ok: true, message: 'Passed. Your colleagues can still take it.' };
}
