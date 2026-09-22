import type { ReactNode } from 'react';

/* ─────────────────────────────────────────────────────────────────────────────
   Presentational primitives. Server-safe: no hooks, no event handlers, so they
   can be used from Server Components without pulling a client boundary in.
   ───────────────────────────────────────────────────────────────────────────── */

export function cx(...values: (string | false | null | undefined)[]): string {
  return values.filter(Boolean).join(' ');
}

// ── Buttons ──────────────────────────────────────────────────────────────────

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-brand-700 text-white hover:bg-brand-800 active:bg-brand-900 disabled:bg-brand-300',
  secondary:
    'bg-white text-brand-800 ring-1 ring-inset ring-brand-200 hover:bg-brand-50 active:bg-brand-100 disabled:text-brand-300',
  ghost:
    'bg-transparent text-slate-700 hover:bg-slate-100 active:bg-slate-200 disabled:text-slate-300',
  danger:
    'bg-white text-red-700 ring-1 ring-inset ring-red-200 hover:bg-red-50 active:bg-red-100 disabled:text-red-300',
};

const SIZES: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-5 py-3 text-base',
};

export function buttonClasses(variant: Variant = 'primary', size: Size = 'md', extra?: string): string {
  return cx(
    'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors',
    'disabled:cursor-not-allowed',
    VARIANTS[variant],
    SIZES[size],
    extra,
  );
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button className={buttonClasses(variant, size, className)} {...rest}>
      {children}
    </button>
  );
}

// ── Surfaces ─────────────────────────────────────────────────────────────────

export function Card({
  children,
  className,
  as: As = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'article' | 'li';
}) {
  return (
    <As className={cx('rounded-xl border border-slate-200 bg-white p-5 shadow-sm', className)}>
      {children}
    </As>
  );
}

export function SectionTitle({
  title,
  description,
  action,
  level = 2,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  level?: 1 | 2 | 3;
}) {
  const Heading = (level === 1 ? 'h1' : level === 2 ? 'h2' : 'h3') as 'h1';
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <Heading className={cx('font-semibold text-slate-900', level === 1 ? 'text-2xl' : 'text-lg')}>
          {title}
        </Heading>
        {description ? <p className="mt-1 max-w-2xl text-sm text-slate-600">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

// ── Form controls ────────────────────────────────────────────────────────────

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
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-800">
        {label}
        {required ? (
          <span className="ml-1 text-brand-700" aria-hidden="true">
            *
          </span>
        ) : null}
        {!required ? <span className="ml-1 text-xs font-normal text-slate-500">(optional)</span> : null}
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

const CONTROL_BASE =
  'w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 disabled:bg-slate-50 disabled:text-slate-500';

function controlClasses(error?: string, extra?: string): string {
  return cx(CONTROL_BASE, error ? 'border-red-400' : 'border-slate-300', extra);
}

export function Input({
  error,
  className,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { error?: string }) {
  return <input className={controlClasses(error, className)} {...rest} />;
}

export function Textarea({
  error,
  className,
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: string }) {
  return <textarea className={controlClasses(error, cx('min-h-28', className))} {...rest} />;
}

export function Select({
  error,
  className,
  children,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement> & { error?: string }) {
  return (
    <select className={controlClasses(error, className)} {...rest}>
      {children}
    </select>
  );
}

export function Checkbox({
  label,
  description,
  id,
  className,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; description?: ReactNode }) {
  return (
    <label htmlFor={id} className={cx('flex cursor-pointer items-start gap-3', className)}>
      <input
        id={id}
        type="checkbox"
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-brand-700 accent-brand-700"
        {...rest}
      />
      <span>
        <span className="block text-sm font-medium text-slate-800">{label}</span>
        {description ? <span className="mt-0.5 block text-xs text-slate-500">{description}</span> : null}
      </span>
    </label>
  );
}

/** A group of checkboxes for multi-select filters (areas of law, emirates). */
export function CheckboxGroup({
  legend,
  hint,
  children,
}: {
  legend: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-slate-800">{legend}</legend>
      {hint ? <p className="mt-0.5 text-xs text-slate-500">{hint}</p> : null}
      <div className="mt-2 flex flex-wrap gap-2">{children}</div>
    </fieldset>
  );
}

/** A checkbox styled as a selectable chip, used by the directory filters. */
export function ChipCheckbox({
  id,
  name,
  value,
  label,
  sublabel,
  count,
  defaultChecked,
}: {
  id: string;
  name: string;
  value: string;
  label: string;
  sublabel?: string;
  count?: number;
  defaultChecked?: boolean;
}) {
  return (
    <label
      htmlFor={id}
      className="cursor-pointer rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 transition-colors has-checked:border-brand-600 has-checked:bg-brand-50 has-checked:text-brand-800 has-checked:font-medium"
    >
      <input
        id={id}
        type="checkbox"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        className="sr-only"
      />
      <span>{label}</span>
      {sublabel ? <span className="ml-1 text-xs text-slate-400">{sublabel}</span> : null}
      {typeof count === 'number' ? (
        <span className="ml-1.5 text-xs text-slate-500">{count}</span>
      ) : null}
    </label>
  );
}

// ── Feedback ─────────────────────────────────────────────────────────────────

type Tone = 'info' | 'success' | 'warning' | 'error' | 'neutral';

const TONES: Record<Tone, string> = {
  info: 'border-brand-200 bg-brand-50 text-brand-900',
  success: 'border-green-200 bg-green-50 text-green-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  error: 'border-red-200 bg-red-50 text-red-900',
  neutral: 'border-slate-200 bg-slate-50 text-slate-700',
};

export function Alert({
  tone = 'info',
  title,
  children,
  className,
}: {
  tone?: Tone;
  title?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx('rounded-lg border px-4 py-3 text-sm', TONES[tone], className)}
      role={tone === 'error' ? 'alert' : undefined}
    >
      {title ? <p className="font-semibold">{title}</p> : null}
      {children ? <div className={cx(title ? 'mt-1' : '')}>{children}</div> : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
      <p className="font-medium text-slate-800">{title}</p>
      {description ? (
        <div className="mx-auto mt-2 max-w-md text-sm text-slate-600">{description}</div>
      ) : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function Chip({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'brand';
}) {
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
        tone === 'brand' ? 'bg-brand-50 text-brand-800' : 'bg-slate-100 text-slate-700',
      )}
    >
      {children}
    </span>
  );
}

export function DescriptionList({ items }: { items: { term: string; detail: ReactNode }[] }) {
  return (
    <dl className="divide-y divide-slate-100">
      {items.map((item) => (
        <div key={item.term} className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-3 sm:gap-4">
          <dt className="text-sm font-medium text-slate-600">{item.term}</dt>
          <dd className="text-sm text-slate-900 sm:col-span-2">{item.detail}</dd>
        </div>
      ))}
    </dl>
  );
}
