import Link from 'next/link';
import { getSessionUser } from '@/lib/auth';
import { getAvailability, mayBypassMaintenance } from '@/lib/availability';
import { logLayoutView } from '@/lib/traffic';
import { MaintenanceScreen } from '@/components/layout/MaintenanceScreen';
import { Logo } from '@/components/layout/Logo';
import { getI18n } from '@/lib/i18n';
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  // Independent questions, asked together: one round trip instead of two.
  const [{ t, locale }, sessionUser, availability] = await Promise.all([
    getI18n(),
    getSessionUser(),
    getAvailability(),
  ]);
  if (availability.maintenance && !(await mayBypassMaintenance(sessionUser?.id ?? null))) {
    return <MaintenanceScreen message={availability.message} signedIn={Boolean(sessionUser)} />;
  }

  await logLayoutView('/(auth)', sessionUser?.id ?? null);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="dl-container flex h-16 items-center justify-between">
          <Logo />
          <LanguageSwitcher current={locale} label={t.language.change} variant="compact" />
        </div>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 py-8 sm:items-center sm:py-12">
        <div className="w-full max-w-lg">{children}</div>
      </main>

      <footer className="dl-container py-6 text-center text-xs text-slate-500">
        Dubai Legal is not a law firm and does not give legal advice.{' '}
        <Link href="/directory" className="text-brand-700 hover:underline">
          Browse the directory
        </Link>
      </footer>
    </div>
  );
}
