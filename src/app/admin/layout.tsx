import Link from 'next/link';
import { requireReviewer } from '@/lib/auth';
import { logLayoutView } from '@/lib/traffic';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { getI18n } from '@/lib/i18n';
import { SideNav, type NavItem } from '@/components/layout/SideNav';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Reviewers see members' full Emirates IDs, so this gate is the access
  // control for the most sensitive data in the product.
  const [{ t, locale }, user] = await Promise.all([getI18n(), requireReviewer()]);
  await logLayoutView('/admin', user.id);

  const navItems: NavItem[] = [
    { href: '/admin/verifications', label: t.items.verificationQueue, icon: 'shieldCheck' },
    { href: '/admin/cases', label: t.items.casesOversight, icon: 'folder' },
    { href: '/admin/emergency', label: t.items.emergencies, icon: 'alert' },
    { href: '/admin/meetings', label: t.items.meetings, icon: 'video' },
    { href: '/admin/recordings', label: t.admin.layout.callRecordings, icon: 'record' },
    { href: '/admin/payments', label: t.items.payments, icon: 'creditCard' },
    { href: '/admin/enquiries', label: t.items.enquiryPool, icon: 'inbox' },
    { href: '/admin/users', label: t.items.accounts, icon: 'users' },
    { href: '/admin/reviews', label: t.items.reviews, icon: 'star' },
    { href: '/admin/blog', label: t.nav.community, icon: 'community' },
    { href: '/admin/notifications', label: t.items.pushNotifications, icon: 'bell' },
    { href: '/admin/traffic', label: t.items.activityRegister, icon: 'activity' },
    { href: '/admin/settings', label: t.items.settings, icon: 'sliders' },
    { href: '/admin/outbox', label: t.admin.layout.outbox, icon: 'send' },
    // An operator's own account is theirs: profile, password, two-factor and
    // alerts all work here exactly as they do for any other member.
    { href: '/profile', label: t.items.myDetails, icon: 'user' },
    { href: '/account', label: t.items.accountSecurity, icon: 'lock' },
    { href: '/notifications', label: t.items.myAlerts, icon: 'bell' },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader
        t={t}
        locale={locale}
        menuGroups={[{ title: t.groups.console, items: navItems }]}
        user={{
          id: user.id,
          email: user.email,
          accountType: user.accountType,
          roles: user.roles,
          verificationStatus: user.verificationStatus,
          profile: user.profile
            ? { fullName: user.profile.fullName, avatarDocumentId: user.profile.avatarDocumentId }
            : null,
        }}
      />

      <div className="border-b border-slate-200 bg-slate-900">
        <div className="dl-container flex h-11 items-center gap-3 text-sm text-white">
          <span className="font-medium">{t.admin.layout.reviewerConsole}</span>
          <span className="text-slate-400">{t.admin.layout.adminOnlyNotice}</span>
        </div>
      </div>

      <div className="dl-container flex-1 py-6 pb-24 sm:pb-10">
        <div className="grid gap-8 sm:grid-cols-[13rem_1fr]">
          <aside className="sm:sticky sm:top-24 sm:self-start">
            <SideNav items={navItems} sectionsLabel={t.common.sections} />
          </aside>
          <main className="min-w-0">{children}</main>
        </div>
      </div>

    </div>
  );
}
