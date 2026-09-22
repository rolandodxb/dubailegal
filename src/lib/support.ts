/**
 * What a support ticket can be about, and how its states read.
 *
 * Kept free of server imports because the reporting form and the administrator's
 * queue both render these labels.
 */
export const SUPPORT_CATEGORIES = [
  { value: 'ACCOUNT_ACCESS', label: 'Signing in or my account' },
  { value: 'VERIFICATION', label: 'Verification and documents' },
  { value: 'CASE_OR_MEETING', label: 'A case or a meeting' },
  { value: 'PAYMENT', label: 'A fee or a payment' },
  { value: 'TECHNICAL', label: 'Something is broken' },
  { value: 'OTHER', label: 'Something else' },
] as const;

export const SUPPORT_CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  SUPPORT_CATEGORIES.map((entry) => [entry.value, entry.label]),
);

export const SUPPORT_STATUS_LABEL: Record<string, string> = {
  OPEN: 'Waiting for support',
  ANSWERED: 'Support has replied',
  SOLVED: 'Solved and closed',
};
