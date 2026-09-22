'use client';

import { useActionState } from 'react';
import {
  abandonTwoFactorLoginAction,
  beginTwoFactorAction,
  confirmTwoFactorAction,
  disableTwoFactorAction,
  regenerateRecoveryCodesAction,
  verifyTwoFactorLoginAction,
} from '@/app/actions/two-factor-actions';
import { initialFormState } from '@/lib/form-state';
import { Alert, Field, Input, buttonClasses } from '@/components/ui/primitives';
import { SubmitButton } from '@/components/ui/SubmitButton';

/** The single-use codes issued when two-factor is turned on. */
function RecoveryCodes({ codes }: { codes: string[] }) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <p className="text-sm font-semibold text-amber-900">Save these recovery codes</p>
      <p className="mt-1 text-xs text-amber-900">
        Each works once, if you lose your phone. They are shown only now and cannot be retrieved
        later — store them somewhere safe and offline.
      </p>
      <ul className="mt-3 grid grid-cols-2 gap-2">
        {codes.map((code) => (
          <li
            key={code}
            className="rounded bg-white px-2 py-1 font-mono text-sm tracking-wider text-slate-900 ring-1 ring-amber-200"
          >
            {code}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The second step of signing in. */
export function TwoFactorLoginForm() {
  const [state, formAction] = useActionState(verifyTwoFactorLoginAction, initialFormState);

  return (
    <div className="space-y-5">
      <form action={formAction} className="space-y-5" noValidate>
        {state && !state.ok && state.message ? <Alert tone="error">{state.message}</Alert> : null}

        <Field
          label="Authentication code"
          htmlFor="code"
          required
          error={state?.fieldErrors?.code}
          hint="The six digits from your authenticator app, or one of your recovery codes."
        >
          <Input
            id="code"
            name="code"
            required
            autoFocus
            autoComplete="one-time-code"
            inputMode="text"
            placeholder="123456"
            error={state?.fieldErrors?.code}
          />
        </Field>

        <SubmitButton className="w-full" size="lg" pendingLabel="Checking…">
          Verify and sign in
        </SubmitButton>
      </form>

      <form action={abandonTwoFactorLoginAction}>
        <button type="submit" className={buttonClasses('ghost', 'sm', 'w-full')}>
          Cancel and sign out
        </button>
      </form>
    </div>
  );
}

/**
 * Setting two-factor up, from Account and security.
 *
 * Two steps: show the code to scan, then require a working code before it is
 * switched on. That order is what makes it impossible to lock yourself out with a
 * secret you never managed to scan.
 */
export function TwoFactorSettings({
  enabled,
  recoveryCodesLeft,
}: {
  enabled: boolean;
  recoveryCodesLeft: number;
}) {
  const [beginState, beginAction] = useActionState(beginTwoFactorAction, initialFormState);
  const [confirmState, confirmAction] = useActionState(confirmTwoFactorAction, initialFormState);
  const [disableState, disableAction] = useActionState(disableTwoFactorAction, initialFormState);
  const [regenState, regenAction] = useActionState(regenerateRecoveryCodesAction, initialFormState);

  const justEnabled = confirmState?.ok && confirmState.step === 'codes';
  const showEnrolment = beginState?.ok || (confirmState && !confirmState.ok && confirmState.step === 'confirm');

  const secret = (confirmState?.data?.secret as string) ?? (beginState?.data?.secret as string) ?? '';
  const qrDataUrl =
    (confirmState?.data?.qrDataUrl as string) ?? (beginState?.data?.qrDataUrl as string) ?? '';
  const codes = (confirmState?.data?.recoveryCodes as string[]) ?? (regenState?.data?.recoveryCodes as string[]) ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-64 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-slate-900">Two-factor authentication</p>
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                enabled
                  ? 'bg-green-50 text-green-800 ring-green-200'
                  : 'bg-slate-100 text-slate-700 ring-slate-200'
              }`}
            >
              {enabled ? 'On' : 'Off'}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            {enabled
              ? `A code from your authenticator app is required every time you sign in. ${recoveryCodesLeft} recovery code${recoveryCodesLeft === 1 ? '' : 's'} left.`
              : 'Add a second step to signing in. Any authenticator app works — Google Authenticator, Authy, 1Password.'}
          </p>
        </div>

        {!enabled && !showEnrolment ? (
          <form action={beginAction}>
            <SubmitButton pendingLabel="Preparing…">Turn on two-factor</SubmitButton>
          </form>
        ) : null}
      </div>

      {beginState && !beginState.ok && beginState.message ? (
        <Alert tone="error">{beginState.message}</Alert>
      ) : null}

      {/* ── Enrolment ─────────────────────────────────────────────────── */}
      {!enabled && showEnrolment ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-sm font-semibold text-slate-900">Set up your authenticator app</h3>
          <div className="mt-3 flex flex-wrap gap-6">
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrDataUrl}
                alt="Two-factor setup QR code"
                width={180}
                height={180}
                className="rounded-lg bg-white p-2 ring-1 ring-slate-200"
              />
            ) : null}
            <div className="min-w-56 flex-1">
              <p className="text-xs text-slate-600">
                Scan the code, or type this key into your app if you cannot scan:
              </p>
              <p className="mt-2 rounded bg-white px-3 py-2 font-mono text-sm tracking-wider text-slate-900 ring-1 ring-slate-200">
                {secret}
              </p>
            </div>
          </div>

          <form action={confirmAction} className="mt-4 space-y-3">
            {confirmState && !confirmState.ok && confirmState.message ? (
              <Alert tone="error">{confirmState.message}</Alert>
            ) : null}

            <input type="hidden" name="secret" value={secret} />
            <input type="hidden" name="qrDataUrl" value={qrDataUrl} />

            <Field
              label="Enter the six-digit code from your app"
              htmlFor="confirm-code"
              required
              error={confirmState?.fieldErrors?.code}
              hint="This proves the app is set up before two-factor is switched on."
            >
              <Input
                id="confirm-code"
                name="code"
                required
                autoComplete="one-time-code"
                placeholder="123456"
                error={confirmState?.fieldErrors?.code}
              />
            </Field>

            <SubmitButton pendingLabel="Verifying…">Turn on two-factor</SubmitButton>
          </form>
        </div>
      ) : null}

      {justEnabled && codes.length > 0 ? <RecoveryCodes codes={codes} /> : null}

      {/* ── Managing it once on ───────────────────────────────────────── */}
      {enabled ? (
        <div className="space-y-5 border-t border-slate-100 pt-5">
          {regenState?.ok && regenState.step === 'codes' && codes.length > 0 ? (
            <RecoveryCodes codes={codes} />
          ) : null}

          <form action={regenAction} className="space-y-3">
            {regenState && !regenState.ok && regenState.message ? (
              <Alert tone="error">{regenState.message}</Alert>
            ) : null}
            <Field
              label="Issue new recovery codes"
              htmlFor="regen-password"
              required
              error={regenState?.fieldErrors?.password}
              hint="Your password is required. This invalidates the codes you already have."
            >
              <Input
                id="regen-password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                error={regenState?.fieldErrors?.password}
              />
            </Field>
            <SubmitButton variant="secondary" pendingLabel="Issuing…">
              Issue new recovery codes
            </SubmitButton>
          </form>

          <form action={disableAction} className="space-y-3 border-t border-slate-100 pt-5">
            {disableState?.ok && disableState.message ? (
              <Alert tone="success">{disableState.message}</Alert>
            ) : null}
            {disableState && !disableState.ok && disableState.message ? (
              <Alert tone="error">{disableState.message}</Alert>
            ) : null}
            <Field
              label="Turn two-factor off"
              htmlFor="disable-password"
              required
              error={disableState?.fieldErrors?.password}
              hint="Your password is required, so a borrowed session cannot remove it."
            >
              <Input
                id="disable-password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                error={disableState?.fieldErrors?.password}
              />
            </Field>
            <SubmitButton
              variant="danger"
              confirm="Turn off two-factor authentication? Your password alone will sign you in."
              pendingLabel="Turning off…"
            >
              Turn off two-factor
            </SubmitButton>
          </form>
        </div>
      ) : null}
    </div>
  );
}
