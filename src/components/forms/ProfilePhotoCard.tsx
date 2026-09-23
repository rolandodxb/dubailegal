'use client';

import { useActionState } from 'react';
import { deleteDocumentAction, uploadDocumentAction } from '@/app/actions/profile-actions';
import { initialFormState } from '@/lib/form-state';
import { Avatar } from '@/components/Avatar';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { Alert, Field } from '@/components/ui/primitives';

/**
 * Profile picture.
 *
 * Available to every account type: an individual, a lawyer and a firm. The photo
 * is stored in the same private place as identity documents and served through
 * /api/avatar/[userId], which decides who may see it — the owner, a reviewer, a
 * member you share a case with, and the public only when you have published a
 * directory listing.
 */
export function ProfilePhotoCard({
  userId,
  name,
  hasPhoto,
  documentId,
  labels,
}: {
  userId: string;
  name: string;
  hasPhoto: boolean;
  documentId: string | null;
  labels: {
    replaceYourPhoto: string;
    addAPhoto: string;
    hint: string;
    uploading: string;
    replacePhoto: string;
    uploadPhoto: string;
    removeConfirm: string;
    removing: string;
    removePhoto: string;
    privacyNote: string;
  };
}) {
  const [uploadState, uploadAction] = useActionState(uploadDocumentAction, initialFormState);
  const [deleteState, deleteAction] = useActionState(deleteDocumentAction, initialFormState);

  return (
    <div className="space-y-4">
      {uploadState?.ok && uploadState.message ? (
        <Alert tone="success">{uploadState.message}</Alert>
      ) : null}
      {uploadState && !uploadState.ok && uploadState.message ? (
        <Alert tone="error">{uploadState.message}</Alert>
      ) : null}
      {deleteState?.ok && deleteState.message ? (
        <Alert tone="success">{deleteState.message}</Alert>
      ) : null}
      {deleteState && !deleteState.ok && deleteState.message ? (
        <Alert tone="error">{deleteState.message}</Alert>
      ) : null}

      <div className="flex flex-wrap items-center gap-5">
        <Avatar userId={userId} name={name} hasPhoto={hasPhoto} size={88} />

        <div className="min-w-56 flex-1 space-y-4">
          <form action={uploadAction} className="space-y-3">
            <input type="hidden" name="kind" value="PROFILE_PHOTO" />
            <Field
              label={hasPhoto ? labels.replaceYourPhoto : labels.addAPhoto}
              htmlFor="profile-photo"
              error={uploadState?.fieldErrors?.file}
              hint={labels.hint}
            >
              <input
                id="profile-photo"
                name="file"
                type="file"
                required
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                className="block w-full cursor-pointer rounded-lg border border-slate-300 bg-white text-sm text-slate-700 file:mr-3 file:cursor-pointer file:rounded-l-lg file:border-0 file:bg-brand-50 file:px-4 file:py-2.5 file:text-sm file:font-medium file:text-brand-800 hover:file:bg-brand-100"
              />
            </Field>
            <SubmitButton variant="secondary" pendingLabel={labels.uploading}>
              {hasPhoto ? labels.replacePhoto : labels.uploadPhoto}
            </SubmitButton>
          </form>

          {hasPhoto && documentId ? (
            <form action={deleteAction} className="border-t border-slate-100 pt-3">
              <input type="hidden" name="documentId" value={documentId} />
              <SubmitButton
                variant="ghost"
                size="sm"
                className="text-red-700 hover:bg-red-50"
                confirm={labels.removeConfirm}
                pendingLabel={labels.removing}
              >
                {labels.removePhoto}
              </SubmitButton>
            </form>
          ) : null}
        </div>
      </div>

      <p className="text-xs text-slate-500">{labels.privacyNote}</p>
    </div>
  );
}
