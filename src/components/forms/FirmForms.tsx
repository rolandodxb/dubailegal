'use client';

import { useActionState } from 'react';
import {
  createLawyerAction,
  inviteLawyerAction,
  removeLawyerAction,
  respondToInvitationAction,
  revokeInvitationAction,
} from '@/app/actions/firm-actions';
import { initialFormState } from '@/lib/form-state';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { MIN_PASSWORD_LENGTH } from '@/lib/constants';
import { Alert, Checkbox, Field, Input } from '@/components/ui/primitives';

/** The words the invite form shows, in the reader's language. */
export type InviteLawyerFormLabels = {
  lawyerEmail: string;
  inviting: string;
  registerProfessional: string;
};

/** Invites a professional to the firm by email address. */
export function InviteLawyerForm({ labels }: { labels: InviteLawyerFormLabels }) {
  const [state, formAction] = useActionState(inviteLawyerAction, initialFormState);

  return (
    <form action={formAction} className="space-y-4">
      {state?.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      {state && !state.ok && state.message ? <Alert tone="error">{state.message}</Alert> : null}

      <Field
        label={labels.lawyerEmail}
        htmlFor="invite-email"
        required
        error={state?.fieldErrors?.email}
      >
        <Input
          id="invite-email"
          name="email"
          type="email"
          required
          placeholder="lawyer@example.ae"
          defaultValue={state?.values?.email ?? ''}
          error={state?.fieldErrors?.email}
        />
      </Field>

      <SubmitButton pendingLabel={labels.inviting}>{labels.registerProfessional}</SubmitButton>
    </form>
  );
}

export function RevokeInvitationButton({
  invitationId,
  labels,
}: {
  invitationId: string;
  labels: { withdraw: string };
}) {
  const [state, formAction] = useActionState(revokeInvitationAction, initialFormState);

  return (
    <form action={formAction} className="inline">
      {state && !state.ok && state.message ? (
        <span className="mr-2 text-xs text-red-700">{state.message}</span>
      ) : null}
      {state?.ok && state.message ? (
        <span className="mr-2 text-xs text-green-700">{state.message}</span>
      ) : null}
      <input type="hidden" name="invitationId" value={invitationId} />
      <SubmitButton variant="ghost" size="sm" pendingLabel="…">
        {labels.withdraw}
      </SubmitButton>
    </form>
  );
}

export function RemoveLawyerButton({
  lawyerProfileId,
  name,
  labels,
}: {
  lawyerProfileId: string;
  name: string;
  labels: { confirm: string; removeFromFirm: string; removing: string };
}) {
  const [state, formAction] = useActionState(removeLawyerAction, initialFormState);

  return (
    <form action={formAction} className="inline">
      {state && !state.ok && state.message ? (
        <span className="mr-2 text-xs text-red-700">{state.message}</span>
      ) : null}
      {state?.ok && state.message ? (
        <span className="mr-2 text-xs text-green-700">{state.message}</span>
      ) : null}
      <input type="hidden" name="lawyerProfileId" value={lawyerProfileId} />
      <SubmitButton
        variant="ghost"
        size="sm"
        className="text-red-700 hover:bg-red-50"
        confirm={labels.confirm.replace('{name}', name)}
        pendingLabel={labels.removing}
      >
        {labels.removeFromFirm}
      </SubmitButton>
    </form>
  );
}

/** The words the invitation response shows, in the reader's language. */
export type InvitationResponseFormLabels = {
  joining: string;
  acceptAndJoin: string;
  declining: string;
  decline: string;
};

/** Accept or decline a firm's invitation, from the lawyer's own dashboard. */
export function InvitationResponseForm({
  invitationId,
  firmName,
  labels,
}: {
  invitationId: string;
  firmName: string;
  labels: InvitationResponseFormLabels;
}) {
  const [state, formAction] = useActionState(respondToInvitationAction, initialFormState);

  return (
    <div>
      {state?.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      {state && !state.ok && state.message ? <Alert tone="error">{state.message}</Alert> : null}

      <div className="flex flex-wrap gap-3">
        <form action={formAction}>
          <input type="hidden" name="invitationId" value={invitationId} />
          <input type="hidden" name="accept" value="true" />
          <SubmitButton pendingLabel={labels.joining}>
            {labels.acceptAndJoin.replace('{firm}', firmName)}
          </SubmitButton>
        </form>
        <form action={formAction}>
          <input type="hidden" name="invitationId" value={invitationId} />
          <input type="hidden" name="accept" value="false" />
          <SubmitButton variant="secondary" pendingLabel={labels.declining}>
            {labels.decline}
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}

/** The words the create-lawyer form shows, in the reader's language. */
export type CreateLawyerFormLabels = {
  createdTitle: string;
  notCreatedTitle: string;
  fullName: string;
  emailAddress: string;
  emailHint: string;
  tempPassword: string;
  tempPasswordHint: string;
  phone: string;
  licenceNumber: string;
  licensingAuthority: string;
  licenceExpires: string;
  yearsOfExperience: string;
  whereAppearsTitle: string;
  whereAppearsBefore: string;
  lawyersAtThisFirm: string;
  whereAppearsAfter: string;
  creatingAccount: string;
  createLawyerAccount: string;
  createLawyerNote: string;
};

/**
 * Creates a lawyer account directly from the firm's roster.
 *
 * The firm knows who it is hiring, so it should not have to wait for an emailed
 * invitation. The credentials are shown once on success, because this
 * installation has no mail provider and the firm is the delivery channel.
 */
export function CreateLawyerForm({ labels }: { labels: CreateLawyerFormLabels }) {
  const [state, formAction] = useActionState(createLawyerAction, initialFormState);

  const text = (key: string) => state?.values?.[key] ?? '';

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state?.ok && state.message ? (
        <Alert tone="success" title={labels.createdTitle}>
          {state.message}
        </Alert>
      ) : null}
      {state && !state.ok && state.message ? (
        <Alert tone="error" title={labels.notCreatedTitle}>
          {state.message}
        </Alert>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={labels.fullName} htmlFor="cl-fullName" required error={state?.fieldErrors?.fullName}>
          <Input
            id="cl-fullName"
            name="fullName"
            required
            maxLength={120}
            defaultValue={text('fullName')}
            error={state?.fieldErrors?.fullName}
          />
        </Field>

        <Field
          label={labels.emailAddress}
          htmlFor="cl-email"
          required
          error={state?.fieldErrors?.email}
          hint={labels.emailHint}
        >
          <Input
            id="cl-email"
            name="email"
            type="email"
            required
            defaultValue={text('email')}
            error={state?.fieldErrors?.email}
          />
        </Field>

        <Field
          label={labels.tempPassword}
          htmlFor="cl-password"
          required
          error={state?.fieldErrors?.password}
          hint={labels.tempPasswordHint}
        >
          <Input
            id="cl-password"
            name="password"
            type="text"
            required
            minLength={MIN_PASSWORD_LENGTH}
            autoComplete="off"
            defaultValue={text('password')}
            error={state?.fieldErrors?.password}
          />
        </Field>

        <Field label={labels.phone} htmlFor="cl-phone" error={state?.fieldErrors?.phone}>
          <Input
            id="cl-phone"
            name="phone"
            type="tel"
            defaultValue={text('phone')}
            error={state?.fieldErrors?.phone}
          />
        </Field>

        <Field
          label={labels.licenceNumber}
          htmlFor="cl-licence"
          required
          error={state?.fieldErrors?.licenseNumber}
        >
          <Input
            id="cl-licence"
            name="licenseNumber"
            required
            maxLength={80}
            defaultValue={text('licenseNumber')}
            error={state?.fieldErrors?.licenseNumber}
          />
        </Field>

        <Field
          label={labels.licensingAuthority}
          htmlFor="cl-authority"
          required
          error={state?.fieldErrors?.licensingAuthority}
        >
          <Input
            id="cl-authority"
            name="licensingAuthority"
            required
            maxLength={160}
            defaultValue={text('licensingAuthority')}
            error={state?.fieldErrors?.licensingAuthority}
          />
        </Field>

        <Field label={labels.licenceExpires} htmlFor="cl-expiry" error={state?.fieldErrors?.licenseExpiresOn}>
          <Input
            id="cl-expiry"
            name="licenseExpiresOn"
            type="date"
            defaultValue={text('licenseExpiresOn')}
            error={state?.fieldErrors?.licenseExpiresOn}
          />
        </Field>

        <Field
          label={labels.yearsOfExperience}
          htmlFor="cl-years"
          error={state?.fieldErrors?.yearsOfExperience}
        >
          <Input
            id="cl-years"
            name="yearsOfExperience"
            type="number"
            min={0}
            max={80}
            defaultValue={text('yearsOfExperience')}
            error={state?.fieldErrors?.yearsOfExperience}
          />
        </Field>
      </div>

      <Alert tone="info" title={labels.whereAppearsTitle}>
        {labels.whereAppearsBefore}
        <strong>{labels.lawyersAtThisFirm}</strong>
        {labels.whereAppearsAfter}
      </Alert>

      <SubmitButton size="lg" pendingLabel={labels.creatingAccount}>
        {labels.createLawyerAccount}
      </SubmitButton>

      <p className="text-xs text-slate-500">{labels.createLawyerNote}</p>
    </form>
  );
}
