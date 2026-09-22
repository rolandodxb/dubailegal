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

export async function saveProfileAction(_prev: FormState, formData: FormData): Promise<FormState> {
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

export async function saveLawyerCredentialAction(
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

export async function saveFirmCredentialAction(
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

export async function saveListingAction(_prev: FormState, formData: FormData): Promise<FormState> {
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

export async function unpublishListingAction(): Promise<void> {
  const user = await requireActiveUser();
  const meta = await requestMeta();
  await unpublishListing(user.id, meta);
  revalidateAppSurfaces();
  revalidatePath('/listing');
  redirect('/listing?notice=unpublished');
}

// ── Documents ────────────────────────────────────────────────────────────────

export async function uploadDocumentAction(_prev: FormState, formData: FormData): Promise<FormState> {
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

export async function deleteDocumentAction(_prev: FormState, formData: FormData): Promise<FormState> {
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

export async function submitVerificationAction(_prev: FormState, _formData: FormData): Promise<FormState> {
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

export async function withdrawVerificationAction(_prev: FormState, _formData: FormData): Promise<FormState> {
  const user = await requireActiveUser();
  const meta = await requestMeta();

  const result = await withdrawSubmission(user.id, meta);
  if (!result.ok) return { ok: false, message: result.message };

  revalidateAppSurfaces();
  return { ok: true, message: 'Your verification request has been withdrawn. You can now change your documents.' };
}
