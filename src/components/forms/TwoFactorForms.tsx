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

/** The words the two-factor forms show, threaded down from the server page. */
export type TwoFactorLabels = {
  codeLabel: string;
  codeHint: string;
  verifyPending: string;
  verifySubmit: string;
  cancelSignOut: string;
  settingsTitle: string;
  on: string;
  off: string;
  enabledOne: string;
  enabledOther: string;
  disabledBody: string;
  turnOn: string;
  preparing: string;
  setUpHeading: string;
  qrAlt: string;
  scanHint: string;
  confirmCodeLabel: string;
  confirmCodeHint: string;
  verifying: string;
  recoveryHeading: string;
  recoveryBody: string;
  issueHeading: string;
  issueHint: string;
  issuing: string;
  issueSubmit: string;
  disableHeading: string;
  disableHint: string;
  disableConfirm: string;
  turningOff: string;
  disableSubmit: string;
};

/** The single-use codes issued when two-factor is turned on. */
function RecoveryCodes({ codes, labels }: { codes: string[]; labels: TwoFactorLabels }) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <p className="text-sm font-semibold text-amber-900">{labels.recoveryHeading}</p>
      <p className="mt-1 text-xs text-amber-900">{labels.recoveryBody}</p>
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
export function TwoFactorLoginForm({ labels }: { labels: TwoFactorLabels }) {
  const [state, formAction] = useActionState(verifyTwoFactorLoginAction, initialFormState);

  return (
    <div className="space-y-5">
      <form action={formAction} className="space-y-5" noValidate>
        {state && !state.ok && state.message ? <Alert tone="error">{state.message}</Alert> : null}

        <Field
          label={labels.codeLabel}
          htmlFor="code"
          required
          error={state?.fieldErrors?.code}
          hint={labels.codeHint}
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

        <SubmitButton className="w-full" size="lg" pendingLabel={labels.verifyPending}>
          {labels.verifySubmit}
        </SubmitButton>
      </form>

      <form action={abandonTwoFactorLoginAction}>
        <button type="submit" className={buttonClasses('ghost', 'sm', 'w-full')}>
          {labels.cancelSignOut}
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
  labels,
}: {
  enabled: boolean;
  recoveryCodesLeft: number;
  labels: TwoFactorLabels;
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
            <p className="text-sm font-medium text-slate-900">{labels.settingsTitle}</p>
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                enabled
                  ? 'bg-green-50 text-green-800 ring-green-200'
                  : 'bg-slate-100 text-slate-700 ring-slate-200'
              }`}
            >
              {enabled ? labels.on : labels.off}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            {enabled
              ? (recoveryCodesLeft === 1 ? labels.enabledOne : labels.enabledOther).replace(
                  '{count}',
                  String(recoveryCodesLeft),
                )
              : labels.disabledBody}
          </p>
        </div>

        {!enabled && !showEnrolment ? (
          <form action={beginAction}>
            <SubmitButton pendingLabel={labels.preparing}>{labels.turnOn}</SubmitButton>
          </form>
        ) : null}
      </div>

      {beginState && !beginState.ok && beginState.message ? (
        <Alert tone="error">{beginState.message}</Alert>
      ) : null}

      {/* ── Enrolment ─────────────────────────────────────────────────── */}
      {!enabled && showEnrolment ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-sm font-semibold text-slate-900">{labels.setUpHeading}</h3>
          <div className="mt-3 flex flex-wrap gap-6">
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrDataUrl}
                alt={labels.qrAlt}
                width={180}
                height={180}
                className="rounded-lg bg-white p-2 ring-1 ring-slate-200"
              />
            ) : null}
            <div className="min-w-56 flex-1">
              <p className="text-xs text-slate-600">{labels.scanHint}</p>
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
              label={labels.confirmCodeLabel}
              htmlFor="confirm-code"
              required
              error={confirmState?.fieldErrors?.code}
              hint={labels.confirmCodeHint}
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

            <SubmitButton pendingLabel={labels.verifying}>{labels.turnOn}</SubmitButton>
          </form>
        </div>
      ) : null}

      {justEnabled && codes.length > 0 ? <RecoveryCodes codes={codes} labels={labels} /> : null}

      {/* ── Managing it once on ───────────────────────────────────────── */}
      {enabled ? (
        <div className="space-y-5 border-t border-slate-100 pt-5">
          {regenState?.ok && regenState.step === 'codes' && codes.length > 0 ? (
            <RecoveryCodes codes={codes} labels={labels} />
          ) : null}

          <form action={regenAction} className="space-y-3">
            {regenState && !regenState.ok && regenState.message ? (
              <Alert tone="error">{regenState.message}</Alert>
            ) : null}
            <Field
              label={labels.issueHeading}
              htmlFor="regen-password"
              required
              error={regenState?.fieldErrors?.password}
              hint={labels.issueHint}
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
            <SubmitButton variant="secondary" pendingLabel={labels.issuing}>
              {labels.issueSubmit}
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
              label={labels.disableHeading}
              htmlFor="disable-password"
              required
              error={disableState?.fieldErrors?.password}
              hint={labels.disableHint}
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
              confirm={labels.disableConfirm}
              pendingLabel={labels.turningOff}
            >
              {labels.disableSubmit}
            </SubmitButton>
          </form>
        </div>
      ) : null}
    </div>
  );
}
