import Link from 'next/link';
import type { AccountType, Role, VerificationStatus } from '@prisma/client';
import { logoutAction } from '@/app/actions/auth-actions';
import { accountTypeLabel } from '@/lib/i18n/labels';
import { Avatar } from '@/components/Avatar';
import { VerificationBadge } from '@/components/VerificationBadge';
import { buttonClasses } from '@/components/ui/primitives';
import { Icon } from '@/components/icons';
import { Logo } from './Logo';
import { MobileMenu, type MenuGroup } from './MobileMenu';
import { LanguageSwitcher } from './LanguageSwitcher';
import type { Dictionary } from '@/lib/i18n/en';
import type { Locale } from '@/lib/i18n/locales';

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
  menuGroups,
  t,
  locale,
}: {
  user: HeaderUser;
  /** Unread in-app alerts, shown as a bell badge for a signed-in member. */
  alertCount?: number;
  /**
   * The signed-in navigation, grouped, for the phone menu. It is the same list
   * the sidebar renders, so the two cannot disagree.
   */
  menuGroups?: MenuGroup[];
  /** The dictionary for this request, and the language it is in. */
  t: Dictionary;
  locale: Locale;
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
            // On a phone these live behind the menu button instead: three inline
            // links do not fit beside the logo, and half-visible navigation is
            // worse than one clear button.
            <nav className="hidden items-center gap-1 sm:flex" aria-label={t.publicPages.siteHeader.mainNav}>
              <Link href="/directory" className={buttonClasses('ghost', 'sm')}>
                {t.nav.directory}
              </Link>
              <Link href="/?tab=community" className={buttonClasses('ghost', 'sm')}>
                {t.nav.community}
              </Link>
              <Link
                href="/how-verification-works"
                className={buttonClasses('ghost', 'sm', 'hidden sm:inline-flex')}
              >
                {t.nav.howVerificationWorks}
              </Link>
              <LanguageSwitcher current={locale} label={t.language.change} variant="compact" />
            </nav>
          ) : null}
        </div>

        {user ? (
          <div className="flex items-center gap-2">
            <Link
              href="/notifications"
              className="relative rounded-lg px-2 py-1.5 text-slate-600 hover:bg-slate-100"
              aria-label={
                alertCount > 0
                  ? t.publicPages.siteHeader.alertsUnread.replace('{count}', String(alertCount))
                  : t.publicPages.siteHeader.alertsNone
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
                {t.publicPages.siteHeader.accountLabel.replace(
                  '{kind}',
                  accountTypeLabel(t, user.accountType),
                )}
              </span>
            </Link>
            <form action={logoutAction} className="hidden sm:block">
              <button type="submit" className={buttonClasses('secondary', 'sm')}>
                {t.nav.signOut}
              </button>
            </form>
            <MobileMenu
              signOut={logoutAction}
              labels={{
                menu: t.nav.menu,
                closeMenu: t.nav.closeMenu,
                signOut: t.nav.signOut,
                changeLanguage: t.language.change,
              }}
              locale={locale}
              groups={menuGroups ?? []}
            />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {/* Wrapped rather than hidden individually: a display utility on the
                button cannot beat the `inline-flex` its own class list sets. */}
            <div className="hidden items-center gap-2 sm:flex">
              <Link href="/login" className={buttonClasses('secondary', 'sm')}>
                {t.nav.signIn}
              </Link>
              <Link href="/register" className={buttonClasses('primary', 'sm')}>
                {t.nav.createAccount}
              </Link>
            </div>
            <MobileMenu
              labels={{
                menu: t.nav.menu,
                closeMenu: t.nav.closeMenu,
                signOut: t.nav.signOut,
                changeLanguage: t.language.change,
              }}
              locale={locale}
              groups={[
                {
                  title: t.groups.explore,
                  items: [
                    { href: '/?tab=community', label: t.nav.community, icon: 'community', description: t.community.readOnlyTitle },
                    { href: '/directory', label: t.nav.directory, icon: 'search' },
                    { href: '/how-verification-works', label: t.nav.howVerificationWorks, icon: 'shieldCheck' },
                    { href: '/emergency', label: t.nav.emergency, icon: 'alert' },
                  ],
                },
                {
                  title: t.groups.yourAccount,
                  items: [
                    { href: '/login', label: t.nav.signIn, icon: 'lock' },
                    { href: '/register', label: t.nav.createAccount, icon: 'userPlus' },
                  ],
                },
              ]}
            />
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
export function SiteFooter({
  signedIn = false,
  t,
  locale,
}: {
  signedIn?: boolean;
  /** The dictionary for this request. */
  t: Dictionary;
  locale: Locale;
}) {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-slate-50">
      <div className="dl-container py-8 text-sm text-slate-600">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-md space-y-2">
            <Logo />
            <p>
              {locale === 'ar'
                ? 'دليل المحامين ومكاتب المحاماة في الإمارات العربية المتحدة. تُمنح شارات التوثيق من مراجع بشري مُسمّى بناءً على مستندات رُفعت فعلاً — لا تلقائياً أبداً، ولا دون دليل.'
                : locale === 'es'
                  ? 'Un directorio de abogados y despachos de los Emiratos Árabes Unidos. Las insignias de verificación las otorga un revisor humano identificado a partir de documentos realmente subidos: nunca de forma automática ni sin pruebas.'
                  : locale === 'fr'
                    ? 'Un annuaire d’avocats et de cabinets des Émirats arabes unis. Les badges de vérification sont délivrés par un vérificateur humain nommé, sur des documents réellement téléversés — jamais automatiquement, jamais sans preuve.'
                    : 'A directory of lawyers and legal firms in the United Arab Emirates. Verification badges are issued by a named human reviewer against documents that were actually uploaded — never automatically, and never without evidence.'}
            </p>
          </div>
          {signedIn ? null : (
            <nav className="flex flex-col gap-2" aria-label={t.publicPages.siteHeader.footerNav}>
              <Link href="/directory" className="hover:text-brand-700">
                {t.nav.directory}
              </Link>
              <Link href="/?tab=community" className="hover:text-brand-700">
                {t.nav.community}
              </Link>
              <Link href="/how-verification-works" className="hover:text-brand-700">
                {t.nav.howVerificationWorks}
              </Link>
              <Link href="/register" className="hover:text-brand-700">
                {t.nav.createAccount}
              </Link>
              <div className="pt-2">
                <LanguageSwitcher current={locale} label={t.language.change} variant="compact" />
              </div>
            </nav>
          )}
        </div>
        <p className="mt-8 text-xs text-slate-500">{t.footer.disclaimer}</p>
      </div>
    </footer>
  );
}
