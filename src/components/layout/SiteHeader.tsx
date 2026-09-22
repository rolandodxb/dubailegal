import Link from 'next/link';
import type { AccountType, Role, VerificationStatus } from '@prisma/client';
import { logoutAction } from '@/app/actions/auth-actions';
import { ACCOUNT_TYPE_LABEL } from '@/lib/constants';
import { Avatar } from '@/components/Avatar';
import { VerificationBadge } from '@/components/VerificationBadge';
import { buttonClasses } from '@/components/ui/primitives';
import { Icon } from '@/components/icons';
import { Logo } from './Logo';

export type HeaderUser = {
  id: string;
  email: string;
  accountType: AccountType;
  roles: Role[];
  verificationStatus: VerificationStatus;
  profile: { fullName: string; avatarDocumentId: string | null } | null;
} | null;

/**
 * Public header. Shows the signed-in identity when there is one, and the
 * sign-in / create-account pair when there is not. The reviewer console is only
 * linked for accounts that hold the REVIEWER role.
 */
export function SiteHeader({
  user,
  alertCount = 0,
}: {
  user: HeaderUser;
  /** Unread in-app alerts, shown as a bell badge for a signed-in member. */
  alertCount?: number;
}) {
  const displayName = user?.profile?.fullName?.trim() || user?.email || '';
  const isReviewer = user?.roles.includes('REVIEWER') ?? false;
  // An administrator has no member dashboard, so their account chip points at
  // the console rather than at a page that would bounce them.
  const accountHref = isReviewer ? '/admin/verifications' : '/dashboard';

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur print:hidden">
      <div className="dl-container flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Logo href={user ? '/dashboard' : '/'} />
          {/* These links belong to the signed-out experience. Once somebody is
              signed in, navigation is the sidebar's job and the header stops
              repeating it. */}
          {!user ? (
            // Directory and the community are the two things a visitor is most
            // likely to want, so both are in the header at every width. The
            // explanation page is a desktop-only nicety.
            <nav className="flex items-center gap-0.5 sm:gap-1" aria-label="Main">
              <Link href="/directory" className={buttonClasses('ghost', 'sm')}>
                Directory
              </Link>
              <Link href="/blog" className={buttonClasses('ghost', 'sm')}>
                Community
              </Link>
              <Link
                href="/how-verification-works"
                className={buttonClasses('ghost', 'sm', 'hidden sm:inline-flex')}
              >
                How verification works
              </Link>
            </nav>
          ) : null}
        </div>

        {user ? (
          <div className="flex items-center gap-2">
            <Link
              href="/notifications"
              className="relative rounded-lg px-2 py-1.5 text-slate-600 hover:bg-slate-100"
              aria-label={
                alertCount > 0 ? `Alerts, ${alertCount} unread` : 'Alerts, none unread'
              }
            >
              <Icon name="bell" size={20} />
              {alertCount > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-4 items-center justify-center rounded-full bg-brand-700 px-1 text-[10px] font-semibold text-white">
                  {alertCount > 9 ? '9+' : alertCount}
                </span>
              ) : null}
            </Link>
            <Link
              href={accountHref}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100"
            >
              <Avatar
                userId={user.id}
                name={displayName}
                hasPhoto={Boolean(user.profile?.avatarDocumentId)}
                size={32}
              />
              <span className="hidden text-sm font-medium text-slate-800 sm:inline">
                {displayName}
              </span>
              {user.verificationStatus === 'APPROVED' ? (
                <VerificationBadge accountType={user.accountType} size="sm" />
              ) : null}
              <span className="sr-only">
                {ACCOUNT_TYPE_LABEL[user.accountType]} account
              </span>
            </Link>
            <form action={logoutAction}>
              <button type="submit" className={buttonClasses('secondary', 'sm')}>
                Sign out
              </button>
            </form>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link href="/login" className={buttonClasses('secondary', 'sm')}>
              Sign in
            </Link>
            <Link href="/register" className={buttonClasses('primary', 'sm')}>
              Create account
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}

/**
 * The public footer.
 *
 * Its navigation links belong to the signed-out experience: once somebody has an
 * account, offering them "Create an account" and a second copy of the sidebar's
 * links is noise. The disclaimer stays either way.
 */
export function SiteFooter({ signedIn = false }: { signedIn?: boolean }) {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-slate-50">
      <div className="dl-container py-8 text-sm text-slate-600">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-md space-y-2">
            <Logo />
            <p>
              A directory of lawyers and legal firms in the United Arab Emirates. Verification
              badges are issued by a named human reviewer against documents that were actually
              uploaded — never automatically, and never without evidence.
            </p>
          </div>
          {signedIn ? null : (
            <nav className="flex flex-col gap-2" aria-label="Footer">
              <Link href="/directory" className="hover:text-brand-700">
                Browse the directory
              </Link>
              <Link href="/blog" className="hover:text-brand-700">
                Community
              </Link>
              <Link href="/how-verification-works" className="hover:text-brand-700">
                How verification works
              </Link>
              <Link href="/register" className="hover:text-brand-700">
                Create an account
              </Link>
            </nav>
          )}
        </div>
        <p className="mt-8 text-xs text-slate-500">
          Dubai Legal is not a law firm and does not give legal advice. Information in the
          directory is supplied by its members. Always confirm that a professional is licensed
          before instructing them.
        </p>
      </div>
    </footer>
  );
}
