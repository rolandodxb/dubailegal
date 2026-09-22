'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { LOCALE_COOKIE, isLocale } from '@/lib/i18n';

/**
 * Remembers the language somebody chose.
 *
 * A cookie rather than a URL prefix: every link already shared keeps working, and
 * nothing has to be rewritten to carry a locale. The choice lasts a year, and
 * `lax` means it travels on ordinary navigation but not on cross-site requests.
 */
export async function setLocaleAction(formData: FormData): Promise<void> {
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
