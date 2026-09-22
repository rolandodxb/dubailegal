/** Shared shape for `useActionState` forms. Safe to import from client components. */
export type FormState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
  /** Values to keep in the form after a failed submit, keyed by input name. */
  values?: Record<string, string>;
  /**
   * A small amount of structured data a step needs to show next — a two-factor
   * secret and its QR image, or a freshly issued list of recovery codes. Never
   * used for large payloads.
   */
  data?: Record<string, string | string[]>;
  /** Set when a step completed and the next one should be shown. */
  step?: string;
} | null;

export const initialFormState: FormState = null;

/** Collects FormData into a plain object for zod, preserving repeated keys. */
export function formDataToObject(
  formData: FormData,
  multiValueKeys: string[] = [],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (multiValueKeys.includes(key)) continue;
    result[key] = value;
  }
  for (const key of multiValueKeys) {
    result[key] = formData.getAll(key).map((value) => String(value));
  }
  return result;
}

/** Echoes the non-sensitive submitted values back so a failed form keeps them. */
export function echoValues(
  formData: FormData,
  keys: string[],
  multiValueKeys: string[] = [],
): Record<string, string> {
  const values: Record<string, string> = {};
  for (const key of keys) {
    const value = formData.get(key);
    if (typeof value === 'string') values[key] = value;
  }
  for (const key of multiValueKeys) {
    const all = formData.getAll(key).filter((value): value is string => typeof value === 'string');
    if (all.length > 0) values[key] = all.join(',');
  }
  return values;
}
