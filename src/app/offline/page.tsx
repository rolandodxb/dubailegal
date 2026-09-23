import type { Metadata } from 'next';
import Link from 'next/link';
import { getI18n } from '@/lib/i18n';
import { Logo } from '@/components/layout/Logo';
import { buttonClasses } from '@/components/ui/primitives';
import { Icon } from '@/components/icons';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: t.publicPages.offline.metaTitle,
    // The offline page must never be cached by anything but the service worker.
    robots: { index: false, follow: false },
  };
}

/**
 * What an installed app shows when it cannot reach the server.
 *
 * Deliberately outside the route groups: it renders no session, reads no
 * settings and touches no database, because the whole point is that it works
 * when nothing can be reached. It offers the two things that might still be
 * useful — the pages already stored on the device, and another try.
 */
export default async function OfflinePage() {
  const { t } = await getI18n();

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-md text-center">
        <div className="flex justify-center">
          <Logo />
        </div>
        <span className="mt-8 inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
          <Icon name="globe" size={22} />
        </span>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">
          {t.publicPages.offline.title}
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-slate-600">
          {t.publicPages.offline.body}
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <Link href="/" className={buttonClasses('primary', 'lg')}>
            <Icon name="home" size={18} />
            {t.publicPages.offline.tryAgain}
          </Link>
          <Link href="/?tab=community" className={buttonClasses('secondary', 'lg')}>
            <Icon name="community" size={18} />
            {t.publicPages.offline.openCommunity}
          </Link>
        </div>
      </div>
    </div>
  );
}
