'use client';

import { useFormStatus } from 'react-dom';
import { buttonClasses } from './primitives';

/**
 * Submit button that reflects the enclosing form's pending state. Uses
 * useFormStatus so it works with Server Actions without any client-side state.
 */
export function SubmitButton({
  children,
  pendingLabel = 'Working…',
  variant = 'primary',
  size = 'md',
  className,
  confirm,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  pendingLabel?: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  confirm?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending || rest.disabled}
      aria-busy={pending}
      className={buttonClasses(variant, size, className)}
      {...(confirm
        ? {
            onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
              if (!window.confirm(confirm)) event.preventDefault();
            },
          }
        : {})}
      {...rest}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
