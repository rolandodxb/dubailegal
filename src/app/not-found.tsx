import Link from 'next/link';
import { getI18n } from '@/lib/i18n';
import { buttonClasses } from '@/components/ui/primitives';

export default async function NotFound() {
  const { t } = await getI18n();

  return (
    <div className="dl-container flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <p className="text-sm font-medium text-brand-700">404</p>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900">{t.publicPages.notFound.title}</h1>
      <p className="mt-2 max-w-md text-sm text-slate-600">{t.publicPages.notFound.body}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/directory" className={buttonClasses('primary', 'md')}>
          {t.publicPages.shell.browseDirectory}
        </Link>
        <Link href="/" className={buttonClasses('secondary', 'md')}>
          {t.publicPages.notFound.goHome}
        </Link>
      </div>
    </div>
  );
}
