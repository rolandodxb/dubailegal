import Link from 'next/link';
import { Logo } from '@/components/layout/Logo';
import { buttonClasses, Card } from '@/components/ui/primitives';

/**
 * Shown to everyone except reviewers while maintenance mode is on. It does not
 * pretend the app is fine: it says who turned it off and how it is turned back
 * on.
 */
export function MaintenanceScreen({
  message,
  signedIn,
}: {
  message: string;
  signedIn: boolean;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="dl-container flex h-16 items-center">
          <Logo />
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <Card className="w-full max-w-lg p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
            Maintenance mode
          </p>
          <h1 className="mt-2 text-xl font-semibold text-slate-900">
            Dubai Legal is temporarily unavailable
          </h1>
          <p className="mt-3 whitespace-pre-line text-sm text-slate-700">{message}</p>

          <div className="mt-6 flex flex-wrap gap-3">
            {signedIn ? (
              <Link href="/account" className={buttonClasses('secondary', 'md')}>
                Account and security
              </Link>
            ) : (
              <Link href="/login" className={buttonClasses('secondary', 'md')}>
                Sign in
              </Link>
            )}
          </div>

          <p className="mt-6 border-t border-slate-100 pt-4 text-xs text-slate-500">
            Administrators with reviewer access can still sign in and reach the reviewer console to
            switch maintenance mode back off.
          </p>
        </Card>
      </main>
    </div>
  );
}
