'use client';

import type { ReactNode } from 'react';
import { useOptionalSuffix } from '@/components/layout/ClientLocale';

/**
 * A labelled form control, with its hint and its error message.
 *
 * A required field gets an asterisk; an optional one says so in words, because an
 * asterisk alone only means "something" to somebody who already knows the
 * convention. The word comes from the shared client context, because a component
 * drawn from both server and client code cannot look it up for itself.
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
  const optionalSuffix = useOptionalSuffix();

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
