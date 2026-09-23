import { getI18n } from './index';
import { messageTranslator } from './messages';

/**
 * Puts the message a form is about to read into the reader's language.
 *
 * The services and the actions themselves return plain English sentences, because
 * a service has no request context and threading a dictionary through several
 * hundred `failure(...)` calls would touch far more code than it is worth. Instead
 * the catalogue in `lib/i18n/dict/messages` is keyed by the exact English sentence,
 * and every exported action passes what it is about to return through here.
 *
 * English passes through byte for byte, so the English build and the suite that
 * asserts on those sentences are unchanged. A sentence the catalogue does not know
 * is returned as it is: an English sentence in a Spanish form is a visible gap,
 * while a guessed translation would be a wrong word.
 *
 * Field errors are translated too — they are the sentences shown under the input
 * that was rejected, and leaving those in English would be the most conspicuous
 * gap of all.
 */
export async function localiseFormState<T>(state: T): Promise<T> {
  if (state === null || state === undefined || typeof state !== 'object') return state;

  const candidate = state as { message?: unknown; fieldErrors?: unknown };
  const hasMessage = typeof candidate.message === 'string';
  const hasFieldErrors =
    candidate.fieldErrors !== null && typeof candidate.fieldErrors === 'object';

  if (!hasMessage && !hasFieldErrors) return state;

  const { effectiveLocale } = await getI18n();
  const translate = messageTranslator(effectiveLocale);

  const next: Record<string, unknown> = { ...(state as Record<string, unknown>) };

  if (hasMessage) next.message = translate(candidate.message as string);

  if (hasFieldErrors) {
    next.fieldErrors = Object.fromEntries(
      Object.entries(candidate.fieldErrors as Record<string, string>).map(([field, error]) => [
        field,
        translate(error),
      ]),
    );
  }

  return next as T;
}
