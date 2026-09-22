/**
 * The kinds of post the community accepts, and how they read.
 *
 * Kept out of the service because the composer is a client component and the
 * service reaches for the database.
 */
export const BLOG_KINDS = [
  { value: 'RECOMMENDATION', label: 'Recommend a lawyer or firm' },
  { value: 'QUESTION', label: 'Ask a question' },
  { value: 'NOTE', label: 'Share an experience' },
] as const;

export const BLOG_KIND_LABEL: Record<string, string> = Object.fromEntries(
  BLOG_KINDS.map((entry) => [entry.value, entry.label]),
);
