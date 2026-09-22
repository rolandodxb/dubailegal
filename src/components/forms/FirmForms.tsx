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

/** Invites a professional to the firm by email address. */
export function InviteLawyerForm() {
  const [state, formAction] = useActionState(inviteLawyerAction, initialFormState);

  return (
    <form action={formAction} className="space-y-4">
      {state?.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      {state && !state.ok && state.message ? <Alert tone="error">{state.message}</Alert> : null}

      <Field
        label="Lawyer's email address"
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

      <SubmitButton pendingLabel="Inviting…">Register professional</SubmitButton>
    </form>
  );
}

export function RevokeInvitationButton({ invitationId }: { invitationId: string }) {
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
        Withdraw
      </SubmitButton>
    </form>
  );
}

export function RemoveLawyerButton({
  lawyerProfileId,
  name,
}: {
  lawyerProfileId: string;
  name: string;
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
        confirm={`Remove ${name} from your firm? Their account and any open cases assigned to them are untouched.`}
        pendingLabel="Removing…"
      >
        Remove from firm
      </SubmitButton>
    </form>
  );
}

/** Accept or decline a firm's invitation, from the lawyer's own dashboard. */
export function InvitationResponseForm({
  invitationId,
  firmName,
}: {
  invitationId: string;
  firmName: string;
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
          <SubmitButton pendingLabel="Joining…">Accept and join {firmName}</SubmitButton>
        </form>
        <form action={formAction}>
          <input type="hidden" name="invitationId" value={invitationId} />
          <input type="hidden" name="accept" value="false" />
          <SubmitButton variant="secondary" pendingLabel="Declining…">
            Decline
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}

/**
 * Creates a lawyer account directly from the firm's roster.
 *
 * The firm knows who it is hiring, so it should not have to wait for an emailed
 * invitation. The credentials are shown once on success, because this
 * installation has no mail provider and the firm is the delivery channel.
 */
export function CreateLawyerForm() {
  const [state, formAction] = useActionState(createLawyerAction, initialFormState);

  const text = (key: string) => state?.values?.[key] ?? '';

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state?.ok && state.message ? (
        <Alert tone="success" title="Lawyer account created">
          {state.message}
        </Alert>
      ) : null}
      {state && !state.ok && state.message ? (
        <Alert tone="error" title="The account was not created">
          {state.message}
        </Alert>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Full name" htmlFor="cl-fullName" required error={state?.fieldErrors?.fullName}>
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
          label="Email address"
          htmlFor="cl-email"
          required
          error={state?.fieldErrors?.email}
          hint="They will use this to sign in."
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
          label="Temporary password"
          htmlFor="cl-password"
          required
          error={state?.fieldErrors?.password}
          hint={`At least ${MIN_PASSWORD_LENGTH} characters with a letter and a number. Shown once on creation.`}
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

        <Field label="Phone" htmlFor="cl-phone" error={state?.fieldErrors?.phone}>
          <Input
            id="cl-phone"
            name="phone"
            type="tel"
            defaultValue={text('phone')}
            error={state?.fieldErrors?.phone}
          />
        </Field>

        <Field
          label="Licence number"
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
          label="Licensing authority"
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

        <Field label="Licence expires" htmlFor="cl-expiry" error={state?.fieldErrors?.licenseExpiresOn}>
          <Input
            id="cl-expiry"
            name="licenseExpiresOn"
            type="date"
            defaultValue={text('licenseExpiresOn')}
            error={state?.fieldErrors?.licenseExpiresOn}
          />
        </Field>

        <Field
          label="Years of experience"
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

      <Alert tone="info" title="Where this lawyer will appear">
        Under <strong>Lawyers at this firm</strong> on your firm&rsquo;s public profile, alongside
        your other lawyers — not as a separate entry in the directory. Only lawyers who register
        themselves through the public signup form are listed on their own.
      </Alert>

      <SubmitButton size="lg" pendingLabel="Creating account…">
        Create lawyer account
      </SubmitButton>

      <p className="text-xs text-slate-500">
        The account is created active and affiliated to your firm immediately. Verification is
        separate: a reviewer must still examine the lawyer&rsquo;s own Emirates ID and licence.
      </p>
    </form>
  );
}
