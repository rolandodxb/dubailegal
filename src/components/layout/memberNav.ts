import type { AccountType, Role } from '@prisma/client';
import type { NavItem } from '@/components/layout/SideNav';
import type { Dictionary } from '@/lib/i18n/en';
import { isAdministratorRole } from './navRoles';

/** A named group of navigation entries, as the phone menu shows them. */
export type NavGroup = { title: string; items: NavItem[] };

/**
 * The signed-in navigation, defined once and grouped.
 *
 * The groups are the source: the desktop sidebar is the groups flattened in
 * order, and the phone menu is the groups as they are. One list, so the two can
 * never drift apart — which they did before, when the sidebar, the header and a
 * bottom bar each carried their own copy of the same links.
 */
export function buildMemberNav(params: {
  accountType: AccountType;
  roles: Role[];
  unreadAlerts: number;
  pendingCount: number;
  supportCount: number;
  /** The dictionary, so the navigation is in the reader's language. */
  t: Dictionary;
}): { groups: NavGroup[]; navItems: NavItem[] } {
  const { accountType, roles, unreadAlerts, pendingCount, supportCount, t } = params;
  const label = t.items;
  const group = t.groups;
  const isFirm = accountType === 'FIRM';
  const isProfessional = accountType === 'LAWYER' || isFirm;
  const isReviewer = roles.includes('REVIEWER');
  const adminOnly = isAdministratorRole(roles);

  const groups: NavGroup[] = [];

  // An administrator runs the platform and has no member dashboard, so nothing
  // in their menu leads to a page that would bounce them back.
  if (adminOnly) {
    groups.push(
      {
        title: group.console,
        items: [
          { href: '/admin/verifications', label: label.verificationQueue, icon: 'shieldCheck' },
          { href: '/admin/cases', label: label.casesOversight, icon: 'folder' },
          { href: '/admin/emergency', label: label.emergencies, icon: 'alert' },
          { href: '/admin/meetings', label: label.meetings, icon: 'video' },
          { href: '/admin/payments', label: label.payments, icon: 'creditCard' },
          { href: '/admin/enquiries', label: label.enquiryPool, icon: 'inbox' },
          { href: '/admin/support', label: label.support, icon: 'lifeBuoy', badge: supportCount },
          { href: '/admin/blog', label: t.nav.community, icon: 'community' },
          { href: '/admin/users', label: label.accounts, icon: 'users' },
          { href: '/admin/reviews', label: label.reviews, icon: 'star' },
          { href: '/admin/notifications', label: label.pushNotifications, icon: 'bell' },
          { href: '/admin/traffic', label: label.activityRegister, icon: 'activity' },
          { href: '/admin/settings', label: label.settings, icon: 'sliders' },
        ],
      },
      {
        title: group.yourAccount,
        items: [
          { href: '/notifications', label: label.myAlerts, icon: 'bell', badge: unreadAlerts },
          { href: '/profile', label: label.myDetails, icon: 'user' },
          { href: '/account', label: label.accountSecurity, icon: 'lock' },
        ],
      },
      {
        title: group.public,
        items: [{ href: '/directory', label: label.publicDirectory, icon: 'search' }],
      },
    );
  } else if (isProfessional) {
    groups.push(
      {
        title: group.yourPractice,
        items: [
          { href: '/dashboard', label: label.dashboard, icon: 'home' },
          { href: '/portfolio', label: label.portfolio, icon: 'briefcase' },
          { href: '/pending', label: label.pending, icon: 'inbox', badge: pendingCount },
          { href: '/clients', label: label.clients, icon: 'users' },
          { href: '/calendar', label: label.calendar, icon: 'calendar' },
          { href: '/rooms', label: label.rooms, icon: 'video' },
          { href: '/emergency/desk', label: label.emergencyDesk, icon: 'alert' },
          { href: '/enquiries', label: label.enquiryPool, icon: 'inbox' },
          { href: '/reviews', label: label.reviews, icon: 'star' },
          ...(isFirm
            ? [{ href: '/firm/oversight', label: label.practiceOversight, icon: 'chart' } as NavItem]
            : []),
          { href: '/inquiries', label: label.inquiries, icon: 'mail' },
        ],
      },
      {
        title: group.yourProfile,
        items: [
          { href: '/profile', label: label.myProfile, icon: 'user' },
          { href: '/credentials', label: label.legalDetails, icon: 'fileText' },
          { href: '/listing', label: label.listing, icon: 'idCard' },
          { href: '/receipt-template', label: label.receiptLayout, icon: 'idCard' },
          { href: '/payments', label: label.fees, icon: 'creditCard' },
          ...(isFirm
            ? [{ href: '/firm/lawyers', label: label.firmLawyers, icon: 'scale' } as NavItem]
            : [{ href: '/invitations', label: label.invitations, icon: 'mailPlus' } as NavItem]),
          { href: '/verification', label: label.verification, icon: 'shieldCheck' },
        ],
      },
      {
        title: group.communityAndHelp,
        items: [
          { href: '/blog', label: t.nav.community, icon: 'community' },
          { href: '/support', label: label.support, icon: 'lifeBuoy', badge: supportCount },
          { href: '/directory', label: label.publicDirectory, icon: 'search' },
        ],
      },
      {
        title: group.yourAccount,
        items: [
          { href: '/notifications', label: label.alerts, icon: 'bell', badge: unreadAlerts },
          { href: '/account', label: label.accountSecurity, icon: 'lock' },
          ...(isReviewer
            ? [
                {
                  href: '/admin/verifications',
                  label: label.verificationQueue,
                  icon: 'shieldCheck',
                } as NavItem,
              ]
            : []),
        ],
      },
    );
  } else {
    groups.push(
      {
        title: group.yourCases,
        items: [
          { href: '/dashboard', label: label.dashboard, icon: 'home' },
          { href: '/cases', label: label.myCases, icon: 'folder' },
          { href: '/payments', label: label.fees, icon: 'creditCard' },
          { href: '/rooms', label: label.rooms, icon: 'video' },
          { href: '/reviews', label: label.reviews, icon: 'star' },
        ],
      },
      {
        title: group.findHelp,
        items: [
          { href: '/directory', label: t.nav.directory, icon: 'search' },
          { href: '/inquiries', label: label.inquiries, icon: 'mail' },
          { href: '/blog', label: t.nav.community, icon: 'community' },
        ],
      },
      {
        title: group.yourAccount,
        items: [
          { href: '/notifications', label: label.alerts, icon: 'bell', badge: unreadAlerts },
          { href: '/profile', label: label.myProfile, icon: 'user' },
          { href: '/verification', label: label.verification, icon: 'shieldCheck' },
          { href: '/account', label: label.accountSecurity, icon: 'lock' },
          { href: '/support', label: label.support, icon: 'lifeBuoy', badge: supportCount },
          ...(isReviewer
            ? [
                {
                  href: '/admin/verifications',
                  label: label.verificationQueue,
                  icon: 'shieldCheck',
                } as NavItem,
              ]
            : []),
        ],
      },
    );
  }

  return { groups, navItems: groups.flatMap((group) => group.items) };
}
