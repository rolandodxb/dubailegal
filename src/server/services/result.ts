import type { z } from 'zod';
import { fieldErrors } from '@/lib/validation';

/** Uniform result shape returned by every service function. */
export type ServiceResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? { data?: undefined } : { data: T }))
  | { ok: false; message: string; fieldErrors?: Record<string, string>; status?: number };

export function failure(
  message: string,
  options?: { fieldErrors?: Record<string, string>; status?: number },
): { ok: false; message: string; fieldErrors?: Record<string, string>; status?: number } {
  return { ok: false, message, ...options };
}

export function success(): { ok: true };
export function success<T>(data: T): { ok: true; data: T };
export function success<T>(data?: T) {
  return { ok: true, ...(data === undefined ? {} : { data }) } as
    | { ok: true }
    | { ok: true; data: T };
}

/** Turns a Zod failure into a user-facing ServiceResult. */
export function fromZodError(error: z.ZodError, fallbackMessage = 'Please check the highlighted fields.') {
  return failure(fallbackMessage, { fieldErrors: fieldErrors(error) });
}
