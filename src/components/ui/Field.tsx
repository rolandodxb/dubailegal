'use client';

import { createContext, useContext, type ReactNode } from 'react';

/**
 * The one word a form cannot reach on its own.
 *
 * `Field` is used from both server and client components, and `(optional)` is
 * appended to the label of every field nobody has to fill in — so the word has to
 * be available wherever a field is drawn. Threading it through as a prop would
 * mean adding it to a hundred and fifty call sites, most of which already receive
 * a `labels` object for their own copy.
 *
 * So it travels out of band instead: the root layout, which already knows the
 * language, puts the word in this context once, and every `Field` underneath reads
 * it. The English default is what applies if a field is ever rendered outside the
 * provider — a unit test, or a story — so the component never renders nothing.
 */
const OptionalLabel = createContext<string>('(optional)');

export function OptionalLabelProvider({
  value,
  children,
}: {
  value: string;
  children: ReactNode;
}) {
  return <OptionalLabel.Provider value={value}>{children}</OptionalLabel.Provider>;
}

export function useOptionalLabel(): string {
  return useContext(OptionalLabel);
}

/**
 * A labelled form control, with its hint and its error message.
 *
 * A required field gets an asterisk; an optional one says so in words, because an
 * asterisk alone only means "something" to somebody who already knows the
 * convention.
 */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  const optionalSuffix = useOptionalLabel();

  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-800">
        {label}
        {required ? (
          <span className="ml-1 text-brand-700" aria-hidden="true">
            *
          </span>
        ) : null}
        {!required ? (
          <span className="ml-1 text-xs font-normal text-slate-500">{optionalSuffix}</span>
        ) : null}
      </label>
      {children}
      {hint && !error ? <p className="text-xs text-slate-500">{hint}</p> : null}
      {error ? (
        <p className="text-xs font-medium text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
