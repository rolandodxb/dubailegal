import Link from 'next/link';
import { requireReviewer } from '@/lib/auth';
import { logLayoutView } from '@/lib/traffic';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { BottomNav, SideNav, type NavItem } from '@/components/layout/BottomNav';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Reviewers see members' full Emirates IDs, so this gate is the access
  // control for the most sensitive data in the product.
  const user = await requireReviewer();
  await logLayoutView('/admin', user.id);

  const navItems: NavItem[] = [
    { href: '/admin/verifications', label: 'Verification queue', icon: 'shieldCheck' },
    { href: '/admin/cases', label: 'Cases (oversight)', icon: 'folder' },
    { href: '/admin/emergency', label: 'Emergencies', icon: 'alert' },
    { href: '/admin/meetings', label: 'Meetings and rooms', icon: 'video' },
    { href: '/admin/payments', label: 'Payments', icon: 'creditCard' },
    { href: '/admin/enquiries', label: 'Enquiry pool', icon: 'inbox' },
    { href: '/admin/users', label: 'Accounts', icon: 'users' },
    { href: '/admin/reviews', label: 'Reviews', icon: 'star' },
    { href: '/admin/blog', label: 'Community', icon: 'community' },
    { href: '/admin/notifications', label: 'Push notifications', icon: 'bell' },
    { href: '/admin/traffic', label: 'Activity register', icon: 'activity' },
    { href: '/admin/settings', label: 'Settings', icon: 'sliders' },
    { href: '/admin/outbox', label: 'Outbox', icon: 'send' },
    // An operator's own account is theirs: profile, password, two-factor and
    // alerts all work here exactly as they do for any other member.
    { href: '/profile', label: 'My details', icon: 'user' },
    { href: '/account', label: 'Account & security', icon: 'lock' },
    { href: '/notifications', label: 'My alerts', icon: 'bell' },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader
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
          <span className="font-medium">Reviewer console</span>
          <span className="text-slate-400">
            Administration only — you are not a client or a professional on this platform.
          </span>
        </div>
      </div>

      <div className="dl-container flex-1 py-6 pb-24 sm:pb-10">
        <div className="grid gap-8 sm:grid-cols-[13rem_1fr]">
          <aside className="sm:sticky sm:top-24 sm:self-start">
            <SideNav items={navItems} />
          </aside>
          <main className="min-w-0">{children}</main>
        </div>
      </div>

      <BottomNav items={navItems.slice(0, 4)} />
    </div>
  );
}
