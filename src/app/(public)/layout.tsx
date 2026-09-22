import { getSessionUser } from '@/lib/auth';
import { getAvailability, mayBypassMaintenance } from '@/lib/availability';
import { logLayoutView } from '@/lib/traffic';
import { navCounts } from '@/server/services/nav-counts';
import { MaintenanceScreen } from '@/components/layout/MaintenanceScreen';
import { SiteFooter, SiteHeader } from '@/components/layout/SiteHeader';
import { BottomNav, SideNav } from '@/components/layout/BottomNav';
import { buildMemberNav } from '@/components/layout/memberNav';

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();

  const availability = await getAvailability();
  if (availability.maintenance && !(await mayBypassMaintenance(user?.id ?? null))) {
    return <MaintenanceScreen message={availability.message} signedIn={Boolean(user)} />;
  }

  await logLayoutView('/(public)', user?.id ?? null);

  // Signed out: the header carries the links, because there is no sidebar.
  if (!user) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader user={null} />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </div>
    );
  }

  // Signed in: navigation lives in the sidebar, exactly as it does inside the
  // member area, so the header no longer repeats it.
  const { unreadAlerts, pendingCount, supportCount } = await navCounts(
    user.id,
    user.accountType,
    user.roles,
  );
  const { navItems, bottomItems } = buildMemberNav({
    accountType: user.accountType,
    roles: user.roles,
    unreadAlerts,
    pendingCount,
    supportCount,
  });

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
        alertCount={unreadAlerts}
      />

      <div className="dl-container flex-1 py-6 pb-24 sm:pb-10">
        <div className="grid gap-8 sm:grid-cols-[15rem_1fr]">
          {/* Sticky and independently scrollable: a long navigation must not
              drag the page with it. */}
          <aside className="dl-scroll-hidden sm:sticky sm:top-20 sm:max-h-[calc(100vh-6rem)] sm:self-start sm:overflow-y-auto sm:overscroll-contain sm:pr-1 sm:pb-4">
            <SideNav items={navItems} />
          </aside>
          <main className="min-w-0">{children}</main>
        </div>
      </div>

      <SiteFooter signedIn />
      <BottomNav items={bottomItems} />
    </div>
  );
}
