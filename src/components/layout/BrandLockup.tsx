import { getI18n } from '@/lib/i18n';
import { LogoMark } from './Logo';

/**
 * The full lockup, for a document rather than a page: the mark, the name, and the
 * line that says what this is. Used on receipts, on a room waiting screen and on
 * anything the browser prints.
 *
 * It lives apart from the rest of the mark because it reads the dictionary, which
 * means it reaches `next/headers` — and that must never end up in a client bundle.
 * `LogoMark` alone is imported by client components such as the case chat, so the
 * pure drawing stays in `Logo.tsx` and only the sentence-bearing part is here.
 */
export async function BrandLockup({
  className,
  markSize = 44,
  invert = false,
}: {
  className?: string;
  markSize?: number;
  /** White text, for a dark surface. The mark itself is unchanged. */
  invert?: boolean;
}) {
  // The line under the name is copy, not a logo: it says what the platform is,
  // so it is read from the dictionary like any other sentence.
  const { t } = await getI18n();

  return (
    <div className={className ?? 'flex items-center gap-3'}>
      <LogoMark size={markSize} />
      <div className="min-w-0">
        <p className={invert ? 'font-semibold text-white' : 'font-semibold text-slate-900'}>
          Legal Dash
        </p>
        <p className={invert ? 'text-xs text-brand-100' : 'text-xs text-slate-500'}>
          {t.brand.tagline}
        </p>
      </div>
    </div>
  );
}

/**
 * The brand on anything printed.
 *
 * Laid out in the print stylesheet above the page content, and hidden on screen.
 * A page printed from this application — a case, a receipt, a meeting — should
 * come off the printer on letterhead, not as a loose sheet of text.
 */
export async function PrintBrand({ context }: { context?: string }) {
  const { t } = await getI18n();

  return (
    <div className="mb-6 hidden items-center justify-between border-b border-slate-300 pb-3 print:flex">
      <BrandLockup markSize={40} />
      <p className="text-xs text-slate-500">{context ?? t.common.printedFrom}</p>
    </div>
  );
}
