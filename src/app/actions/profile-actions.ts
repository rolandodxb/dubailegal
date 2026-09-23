'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { isAdministrator, requestMeta, requireActiveUser } from '@/lib/auth';
import { formDataToObject, type FormState } from '@/lib/form-state';
import { parseDateInput } from '@/lib/format';
import { updateProfile } from '@/server/services/profile-service';
import { saveFirmCredential, saveLawyerCredential } from '@/server/services/credential-service';
import { saveListing, unpublishListing } from '@/server/services/listing-service';
import { deleteDocument, uploadDocument } from '@/server/services/document-service';
import { submitForVerification, withdrawSubmission } from '@/server/services/verification-service';
import { featureDisabledMessage, getAvailability, isEnabled } from '@/lib/availability';
import { localiseFormState } from '@/lib/i18n/form-messages';

const PROFILE_KEYS = [
  'fullName',
  'dateOfBirth',
  'placeOfBirth',
  'countryOfResidence',
  'nationality',
  'phone',
  'emiratesIdNumber',
  'emiratesIdExpiry',
  'workDescription',
  'educationBackground',
];

function revalidateAppSurfaces(): void {
  for (const path of ['/dashboard', '/profile', '/verification', '/directory']) {
    revalidatePath(path);
  }
}

// ── Profile ──────────────────────────────────────────────────────────────────

async function saveProfileActionImpl(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireActiveUser();
  const meta = await requestMeta();

  const result = await updateProfile(user.id, formDataToObject(formData), meta);
  if (!result.ok) {
    const values: Record<string, string> = {};
    for (const key of PROFILE_KEYS) values[key] = String(formData.get(key) ?? '');
    return { ok: false, message: result.message, fieldErrors: result.fieldErrors, values };
  }

  revalidateAppSurfaces();

  return {
    ok: true,
    message: result.data.verificationReset
      ? 'Profile saved. Because your Emirates ID changed, your verified badge has been withdrawn and your account needs reviewing again.'
      : 'Profile saved.',
  };
}

// ── Legal credentials ────────────────────────────────────────────────────────

async function saveLawyerCredentialActionImpl(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireActiveUser();
  const meta = await requestMeta();

  const result = await saveLawyerCredential(user.id, formDataToObject(formData), meta);
  if (!result.ok) {
    const keys = [
      'licenseNumber',
      'licensingAuthority',
      'licenseIssuedOn',
      'licenseExpiresOn',
      'yearsOfExperience',
      'barAssociationNumber',
    ];
    const values: Record<string, string> = {};
    for (const key of keys) values[key] = String(formData.get(key) ?? '');
    return { ok: false, message: result.message, fieldErrors: result.fieldErrors, values };
  }

  revalidateAppSurfaces();
  revalidatePath('/credentials');

  return {
    ok: true,
    message: result.data.verificationReset
      ? 'Licence saved. Because the licence number changed, your verified badge has been withdrawn and your account needs reviewing again.'
      : 'Licence details saved.',
  };
}

async function saveFirmCredentialActionImpl(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireActiveUser();
  const meta = await requestMeta();

  const result = await saveFirmCredential(user.id, formDataToObject(formData), meta);
  if (!result.ok) {
    const keys = [
      'legalName',
      'tradeLicenseNumber',
      'tradeLicenseAuthority',
      'tradeLicenseIssuedOn',
      'tradeLicenseExpiresOn',
      'legalStructure',
      'registeredEmirate',
      'registeredAddress',
      'website',
      'firmSize',
      'authorisedSignatory',
    ];
    const values: Record<string, string> = {};
    for (const key of keys) values[key] = String(formData.get(key) ?? '');
    return { ok: false, message: result.message, fieldErrors: result.fieldErrors, values };
  }

  revalidateAppSurfaces();
  revalidatePath('/credentials');

  return {
    ok: true,
    message: result.data.verificationReset
      ? 'Firm details saved. Because the trade licence number changed, your verified badge has been withdrawn and your account needs reviewing again.'
      : 'Firm details saved.',
  };
}

// ── Directory listing ────────────────────────────────────────────────────────

async function saveListingActionImpl(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireActiveUser();
  const meta = await requestMeta();

  const raw = formDataToObject(formData, ['emirates', 'areas']);
  const result = await saveListing(user.id, raw, meta);

  if (!result.ok) {
    const values: Record<string, string> = {};
    for (const key of [
      'displayName',
      'headline',
      'bio',
      'primaryEmirate',
      'languages',
      'yearsOfExperience',
      'contactEmail',
      'contactPhone',
      'website',
    ]) {
      values[key] = String(formData.get(key) ?? '');
    }
    values.emirates = formData.getAll('emirates').map(String).join(',');
    values.areas = formData.getAll('areas').map(String).join(',');
    if (formData.get('acceptsNewClients')) values.acceptsNewClients = 'on';
    if (formData.get('published')) values.published = 'on';
    return { ok: false, message: result.message, fieldErrors: result.fieldErrors, values };
  }

  revalidateAppSurfaces();
  revalidatePath('/listing');

  return {
    ok: true,
    message: result.data.published
      ? 'Listing saved and published to the directory.'
      : 'Listing saved as a private draft. It is not visible in the directory yet.',
  };
}

async function unpublishListingActionImpl(): Promise<void> {
  const user = await requireActiveUser();
  const meta = await requestMeta();
  await unpublishListing(user.id, meta);
  revalidateAppSurfaces();
  revalidatePath('/listing');
  redirect('/listing?notice=unpublished');
}

// ── Documents ────────────────────────────────────────────────────────────────

async function uploadDocumentActionImpl(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireActiveUser();
  const meta = await requestMeta();

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return { ok: false, message: 'Choose a file to upload.', fieldErrors: { file: 'Choose a file.' } };
  }

  const expiresRaw = formData.get('expiresOn');
  const expiresOn = typeof expiresRaw === 'string' ? parseDateInput(expiresRaw) : null;

  const result = await uploadDocument(
    user.id,
    {
      kind: String(formData.get('kind') ?? ''),
      file,
      documentNumber: typeof formData.get('documentNumber') === 'string' ? String(formData.get('documentNumber')) : null,
      expiresOn,
    },
    meta,
  );

  if (!result.ok) return { ok: false, message: result.message, fieldErrors: result.fieldErrors };

  revalidateAppSurfaces();
  return { ok: true, message: 'Document uploaded. It is waiting to be reviewed.' };
}

async function deleteDocumentActionImpl(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireActiveUser();
  const meta = await requestMeta();

  const documentId = String(formData.get('documentId') ?? '');
  if (documentId.length === 0) return { ok: false, message: 'Missing document reference.' };

  const result = await deleteDocument(user.id, documentId, meta);
  if (!result.ok) return { ok: false, message: result.message };

  revalidateAppSurfaces();
  return { ok: true, message: 'Document removed.' };
}

// ── Verification requests ────────────────────────────────────────────────────

async function submitVerificationActionImpl(_prev: FormState, _formData: FormData): Promise<FormState> {
  const user = await requireActiveUser();

  if (isAdministrator(user)) {
    return {
      ok: false,
      message:
        'Administrator accounts cannot submit verification for themselves: a reviewer must never approve their own account.',
    };
  }

  const availability = await getAvailability();
  if (!isEnabled(availability.settings, 'feature.verification_submission')) {
    return { ok: false, message: featureDisabledMessage('feature.verification_submission') };
  }
  const meta = await requestMeta();

  const result = await submitForVerification(user.id, meta);
  if (!result.ok) return { ok: false, message: result.message };

  revalidateAppSurfaces();

  return {
    ok: true,
    message: `Your verification request has been submitted (round ${result.data.round}). A reviewer will examine your documents.`,
  };
}

async function withdrawVerificationActionImpl(_prev: FormState, _formData: FormData): Promise<FormState> {
  const user = await requireActiveUser();
  const meta = await requestMeta();

  const result = await withdrawSubmission(user.id, meta);
  if (!result.ok) return { ok: false, message: result.message };

  revalidateAppSurfaces();
  return { ok: true, message: 'Your verification request has been withdrawn. You can now change your documents.' };
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
export async function saveProfileAction(
  ...args: Parameters<typeof saveProfileActionImpl>
): Promise<Awaited<ReturnType<typeof saveProfileActionImpl>>> {
  return localiseFormState(await saveProfileActionImpl(...args));
}

export async function saveLawyerCredentialAction(
  ...args: Parameters<typeof saveLawyerCredentialActionImpl>
): Promise<Awaited<ReturnType<typeof saveLawyerCredentialActionImpl>>> {
  return localiseFormState(await saveLawyerCredentialActionImpl(...args));
}

export async function saveFirmCredentialAction(
  ...args: Parameters<typeof saveFirmCredentialActionImpl>
): Promise<Awaited<ReturnType<typeof saveFirmCredentialActionImpl>>> {
  return localiseFormState(await saveFirmCredentialActionImpl(...args));
}

export async function saveListingAction(
  ...args: Parameters<typeof saveListingActionImpl>
): Promise<Awaited<ReturnType<typeof saveListingActionImpl>>> {
  return localiseFormState(await saveListingActionImpl(...args));
}

export async function unpublishListingAction(
  ...args: Parameters<typeof unpublishListingActionImpl>
): Promise<Awaited<ReturnType<typeof unpublishListingActionImpl>>> {
  return localiseFormState(await unpublishListingActionImpl(...args));
}

export async function uploadDocumentAction(
  ...args: Parameters<typeof uploadDocumentActionImpl>
): Promise<Awaited<ReturnType<typeof uploadDocumentActionImpl>>> {
  return localiseFormState(await uploadDocumentActionImpl(...args));
}

export async function deleteDocumentAction(
  ...args: Parameters<typeof deleteDocumentActionImpl>
): Promise<Awaited<ReturnType<typeof deleteDocumentActionImpl>>> {
  return localiseFormState(await deleteDocumentActionImpl(...args));
}

export async function submitVerificationAction(
  ...args: Parameters<typeof submitVerificationActionImpl>
): Promise<Awaited<ReturnType<typeof submitVerificationActionImpl>>> {
  return localiseFormState(await submitVerificationActionImpl(...args));
}

export async function withdrawVerificationAction(
  ...args: Parameters<typeof withdrawVerificationActionImpl>
): Promise<Awaited<ReturnType<typeof withdrawVerificationActionImpl>>> {
  return localiseFormState(await withdrawVerificationActionImpl(...args));
}
