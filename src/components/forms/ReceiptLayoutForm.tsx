'use client';

import { useActionState } from 'react';
import {
  resetReceiptTemplateAction,
  saveReceiptTemplateAction,
} from '@/app/actions/receipt-template-actions';
import { initialFormState } from '@/lib/form-state';
import { Alert, buttonClasses, Card, Field, Input, Textarea } from '@/components/ui/primitives';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { Icon } from '@/components/icons';
import { LogoMark } from '@/components/layout/Logo';

/**
 * The letterhead chooser.
 *
 * Two layouts, plainly: the standard Dubai Legal one, or the professional's own.
 * The preview updates as the fields are typed, so what the client will see is
 * on screen while it is being decided rather than discovered afterwards.
 */
export function ReceiptLayoutForm({
  layout,
  brandName,
  headerLine,
  footerNote,
  accentColor,
  logoUrl,
  showLicence,
  showFirm,
  showContact,
  professionalName,
}: {
  layout: 'STANDARD' | 'CUSTOM';
  brandName: string;
  headerLine: string;
  footerNote: string;
  accentColor: string;
  logoUrl: string | null;
  showLicence: boolean;
  showFirm: boolean;
  showContact: boolean;
  professionalName: string;
}) {
  const [state, formAction] = useActionState(saveReceiptTemplateAction, initialFormState);
  const [resetState, resetAction] = useActionState(resetReceiptTemplateAction, initialFormState);

  const chosen = state?.values?.layout ?? layout;
  const accent = (state?.values?.accentColor ?? accentColor) || '#132E4C';

  return (
    <div className="space-y-6">
      {state?.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      {state && !state.ok && state.message ? <Alert tone="error">{state.message}</Alert> : null}

      <Card className="border-brand-200 bg-brand-50/60">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <LogoMark size={40} />
            <div>
              <h2 className="font-semibold text-slate-900">Standard layout</h2>
              <p className="text-sm text-slate-600">
                The Dubai Legal receipt. Nothing to fill in, and nothing that can be wrong.
              </p>
            </div>
          </div>
          <span className="inline-flex rounded-full bg-white px-2.5 py-1 text-xs font-medium text-brand-800 ring-1 ring-inset ring-brand-200">
            Provided by the platform
          </span>
        </div>
      </Card>

      <form action={formAction} className="space-y-6">
        <Card>
          <h2 className="font-semibold text-slate-900">Which layout should your receipts use?</h2>

          <div className="mt-4 space-y-3">
            {(
              [
                {
                  value: 'STANDARD',
                  title: 'The standard Dubai Legal layout',
                  body: 'Carries the Dubai Legal mark, the amount, the reason, the case and the card used. Recommended unless you have your own letterhead.',
                },
                {
                  value: 'CUSTOM',
                  title: 'My own letterhead',
                  body: 'Your name, your mark and your colour, with the Dubai Legal mark kept at the foot of the receipt.',
                },
              ] as const
            ).map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 hover:border-brand-400"
              >
                <input
                  type="radio"
                  name="layout"
                  value={option.value}
                  defaultChecked={chosen === option.value}
                  className="mt-1"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-slate-900">{option.title}</span>
                  <span className="mt-0.5 block text-xs text-slate-600">{option.body}</span>
                </span>
              </label>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold text-slate-900">Your letterhead</h2>
          <p className="mt-1 text-sm text-slate-600">
            Only used when the layout above is your own. Leave the mark empty to keep the Dubai Legal
            one.
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field
              label="Name on the receipt"
              htmlFor="brandName"
              error={state?.fieldErrors?.brandName}
              hint={`Defaults to ${professionalName} when left empty.`}
            >
              <Input
                id="brandName"
                name="brandName"
                maxLength={120}
                defaultValue={state?.values?.brandName ?? brandName}
                error={state?.fieldErrors?.brandName}
                placeholder={professionalName}
              />
            </Field>

            <Field
              label="Strapline"
              htmlFor="headerLine"
              error={state?.fieldErrors?.headerLine}
              hint="For example: Advocates and legal consultants."
            >
              <Input
                id="headerLine"
                name="headerLine"
                maxLength={160}
                defaultValue={state?.values?.headerLine ?? headerLine}
                error={state?.fieldErrors?.headerLine}
              />
            </Field>

            <Field
              label="Accent colour"
              htmlFor="accentColor"
              error={state?.fieldErrors?.accentColor}
              hint="A hex colour, used for the rules and headings."
            >
              <div className="flex items-center gap-2">
                <Input
                  id="accentColor"
                  name="accentColor"
                  maxLength={7}
                  defaultValue={state?.values?.accentColor ?? accentColor}
                  error={state?.fieldErrors?.accentColor}
                  placeholder="#132E4C"
                  className="font-mono"
                />
                <span
                  aria-hidden="true"
                  className="h-9 w-9 shrink-0 rounded-lg border border-slate-300"
                  style={{ backgroundColor: accent }}
                />
              </div>
            </Field>

            <Field
              label="Your mark"
              htmlFor="logo"
              error={state?.fieldErrors?.logo}
              hint="PNG, JPEG or WebP, up to 5 MB. Shown in place of the Dubai Legal mark at the head of the receipt. SVG is not accepted: an uploaded SVG can run script in the browser."
            >
              <input
                id="logo"
                name="logo"
                type="file"
                accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                className="block w-full cursor-pointer rounded-lg border border-slate-300 bg-white text-sm text-slate-700 file:mr-3 file:cursor-pointer file:rounded-l-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-800 hover:file:bg-brand-100"
              />
            </Field>
          </div>

          {logoUrl ? (
            <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" name="removeLogo" />
              Remove the mark I uploaded
            </label>
          ) : null}

          <Field
            label="Footer note"
            htmlFor="footerNote"
            error={state?.fieldErrors?.footerNote}
            hint="Terms, a thank-you, or who to contact about the receipt."
          >
            <Textarea
              id="footerNote"
              name="footerNote"
              rows={3}
              maxLength={600}
              defaultValue={state?.values?.footerNote ?? footerNote}
              error={state?.fieldErrors?.footerNote}
            />
          </Field>

          <fieldset className="mt-4 border-t border-slate-100 pt-4">
            <legend className="text-sm font-medium text-slate-800">What the receipt shows</legend>
            <div className="mt-2 space-y-2">
              {(
                [
                  { name: 'showLicence', label: 'My licence number and authority', checked: showLicence },
                  { name: 'showFirm', label: 'My firm and its trade licence', checked: showFirm },
                  { name: 'showContact', label: 'My contact details', checked: showContact },
                ] as const
              ).map((option) => (
                <label key={option.name} className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" name={option.name} defaultChecked={option.checked} />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <SubmitButton pendingLabel="Saving…">
              <Icon name="check" size={17} />
              Save my receipt layout
            </SubmitButton>
          </div>
        </Card>
      </form>

      <Card>
        <h2 className="font-semibold text-slate-900">Back to the standard layout</h2>
        <p className="mt-1 mb-3 text-sm text-slate-600">
          Removes your letterhead and any mark you uploaded. Receipts you have already issued are not
          changed — they keep the layout they were issued with.
        </p>
        {resetState?.ok && resetState.message ? (
          <p className="mb-2 text-xs font-medium text-green-700">{resetState.message}</p>
        ) : null}
        <form action={resetAction}>
          <SubmitButton
            variant="secondary"
            confirm="Go back to the standard Dubai Legal layout and remove your uploaded mark?"
            pendingLabel="Resetting…"
          >
            Use the standard layout
          </SubmitButton>
        </form>
      </Card>

      <p className="text-xs text-slate-500">
        <a href="/payments" className={buttonClasses('ghost', 'sm')}>
          See the receipts already issued
        </a>
      </p>
    </div>
  );
}
