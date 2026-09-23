'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { Locale } from '@/lib/i18n/locales';

/**
 * The two things a client component cannot look up for itself: the language, and
 * the one word a shared primitive appends to a label.
 *
 * Client components cannot await `getI18n()` — that reaches `next/headers`. Most of
 * them take the strings they need as a `labels` prop, which is the cheapest thing
 * to send and is what most of this codebase does. But two things are needed too
 * widely for that to be practical: a date formatter needs to know the language to
 * name a month, and `Field` needs the word "(optional)" on every field it draws.
 *
 * So those two travel out of band. The payload is two short strings, set once by
 * the root layout, which already knows both.
 */
type ClientLocale = {
  locale: Locale;
  /** The English or Spanish word for a field nobody has to fill in. */
  optionalSuffix: string;
};

const Context = createContext<ClientLocale>({ locale: 'en', optionalSuffix: '(optional)' });

export function ClientLocaleProvider({
  locale,
  optionalSuffix,
  children,
}: ClientLocale & { children: ReactNode }) {
  return <Context.Provider value={{ locale, optionalSuffix }}>{children}</Context.Provider>;
}

/** The reader's language, for formatting a date or a number on the client. */
export function useLocale(): Locale {
  return useContext(Context).locale;
}

/** The word appended to an optional field's label. */
export function useOptionalSuffix(): string {
  return useContext(Context).optionalSuffix;
}
