'use server';

import { revalidatePath } from 'next/cache';
import { isAdministrator, requestMeta, requireActiveUser } from '@/lib/auth';
import type { FormState } from '@/lib/form-state';
import { getAvailability, isEnabled, featureDisabledMessage } from '@/lib/availability';
import { createReview } from '@/server/services/review-service';
import { localiseFormState } from '@/lib/i18n/form-messages';

/**
 * Publishes a review.
 *
 * Eligibility is decided by the service, not here: the author must be the client
 * on a case this professional accepted, and each case can carry only one review.
 */
async function createReviewActionImpl(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireActiveUser();
  const meta = await requestMeta();

  if (isAdministrator(user)) {
    return { ok: false, message: 'Administrator accounts cannot write reviews.' };
  }

  const availability = await getAvailability();
  if (!isEnabled(availability.settings, 'feature.reviews')) {
    return { ok: false, message: featureDisabledMessage('feature.reviews') };
  }

  const result = await createReview(
    user.id,
    {
      caseId: formData.get('caseId'),
      rating: formData.get('rating'),
      title: formData.get('title'),
      body: formData.get('body'),
    },
    meta,
  );

  if (!result.ok) {
    return {
      ok: false,
      message: result.message,
      fieldErrors: result.fieldErrors,
      values: {
        caseId: String(formData.get('caseId') ?? ''),
        rating: String(formData.get('rating') ?? ''),
        title: String(formData.get('title') ?? ''),
        body: String(formData.get('body') ?? ''),
      },
    };
  }

  // Published in place: the review appears on the profile the reader is already
  // looking at, rather than bouncing them to another page.
  revalidatePath('/reviews');
  revalidatePath(`/directory/${result.data.listingId}`);

  return {
    ok: true,
    message: 'Your review is published. Thank you — it is shown against the case it relates to.',
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
export async function createReviewAction(
  ...args: Parameters<typeof createReviewActionImpl>
): Promise<Awaited<ReturnType<typeof createReviewActionImpl>>> {
  return localiseFormState(await createReviewActionImpl(...args));
}
