'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { LOCALE_COOKIE, isLocale } from '@/lib/i18n';
import { localiseFormState } from '@/lib/i18n/form-messages';

/**
 * Remembers the language somebody chose.
 *
 * A cookie rather than a URL prefix: every link already shared keeps working, and
 * nothing has to be rewritten to carry a locale. The choice lasts a year, and
 * `lax` means it travels on ordinary navigation but not on cross-site requests.
 */
async function setLocaleActionImpl(formData: FormData): Promise<void> {
  const value = formData.get('locale');
  if (!isLocale(value)) return;

  const store = await cookies();
  store.set(LOCALE_COOKIE, value, {
    path: '/',
    sameSite: 'lax',
    httpOnly: false, // the client may want to read it, and it is not a secret
    maxAge: 60 * 60 * 24 * 365,
  });

  // Everything on the page is language-dependent, so the whole tree is rebuilt.
  revalidatePath('/', 'layout');
}

/**
 * The actions, localised.
 *
 * Each one is the same function with its result passed through the message
 * catalogue, so a failed form reads in the language the member is using. The
 * implementation keeps its own name with an `Impl` suffix because a `'use
 * server'` module may only export async function declarations — a wrapped
 * constant would be rejected at build time.
 */
export async function setLocaleAction(
  ...args: Parameters<typeof setLocaleActionImpl>
): Promise<Awaited<ReturnType<typeof setLocaleActionImpl>>> {
  return localiseFormState(await setLocaleActionImpl(...args));
}
