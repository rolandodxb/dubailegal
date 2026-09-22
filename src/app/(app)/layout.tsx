import { requireActiveUser } from '@/lib/auth';
import { buildMemberNav } from '@/components/layout/memberNav';
import { getAvailability, mayBypassMaintenance } from '@/lib/availability';
import { logLayoutView } from '@/lib/traffic';
import { MaintenanceScreen } from '@/components/layout/MaintenanceScreen';
import { navCounts } from '@/server/services/nav-counts';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SideNav, type NavItem } from '@/components/layout/SideNav';
import { PrintBrand } from '@/components/layout/Logo';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [user, availability] = await Promise.all([requireActiveUser(), getAvailability()]);
  if (availability.maintenance && !(await mayBypassMaintenance(user.id))) {
    return <MaintenanceScreen message={availability.message} signedIn />;
  }
  await logLayoutView('/app', user.id);

  const isProfessional = user.accountType === 'LAWYER' || user.accountType === 'FIRM';
  const { unreadAlerts, pendingCount, supportCount } = await navCounts(
    user.id,
    user.accountType,
    user.roles,
  );


  const { groups, navItems } = buildMemberNav({
    accountType: user.accountType,
    roles: user.roles,
    unreadAlerts,
    pendingCount,
    supportCount,
  });

  return (
    <div className="flex min-h-screen flex-col print:block print:min-h-0">
      <SiteHeader
        menuGroups={groups}
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
      <div className="dl-container flex-1 py-6 pb-24 sm:pb-10 print:py-0">
        <div className="grid gap-8 sm:grid-cols-[15rem_1fr] print:block">
          {/* Sticky and independently scrollable: a long navigation must not
              drag the page with it. */}
          <aside className="dl-scroll-hidden sm:sticky sm:top-20 sm:max-h-[calc(100vh-6rem)] sm:self-start sm:overflow-y-auto sm:overscroll-contain sm:pr-1 sm:pb-4 print:hidden">
            <SideNav items={navItems} />
          </aside>
          <main className="min-w-0">
            {/* On paper, above whatever page was printed. */}
            <PrintBrand context="Printed from dubailegal" />
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
