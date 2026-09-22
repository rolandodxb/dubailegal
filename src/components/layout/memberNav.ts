import type { AccountType, Role } from '@prisma/client';
import type { NavItem } from '@/components/layout/SideNav';
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
}): { groups: NavGroup[]; navItems: NavItem[] } {
  const { accountType, roles, unreadAlerts, pendingCount, supportCount } = params;
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
        title: 'Console',
        items: [
          { href: '/admin/verifications', label: 'Verification queue', icon: 'shieldCheck' },
          { href: '/admin/cases', label: 'Cases (oversight)', icon: 'folder' },
          { href: '/admin/emergency', label: 'Emergencies', icon: 'alert' },
          { href: '/admin/meetings', label: 'Meetings and rooms', icon: 'video' },
          { href: '/admin/payments', label: 'Payments', icon: 'creditCard' },
          { href: '/admin/enquiries', label: 'Enquiry pool', icon: 'inbox' },
          { href: '/admin/support', label: 'Support', icon: 'lifeBuoy', badge: supportCount },
          { href: '/admin/blog', label: 'Community', icon: 'community' },
          { href: '/admin/users', label: 'Accounts', icon: 'users' },
          { href: '/admin/reviews', label: 'Reviews', icon: 'star' },
          { href: '/admin/notifications', label: 'Push notifications', icon: 'bell' },
          { href: '/admin/traffic', label: 'Activity register', icon: 'activity' },
          { href: '/admin/settings', label: 'Settings', icon: 'sliders' },
        ],
      },
      {
        title: 'Your account',
        items: [
          { href: '/notifications', label: 'My alerts', icon: 'bell', badge: unreadAlerts },
          { href: '/profile', label: 'My details', icon: 'user' },
          { href: '/account', label: 'Account & security', icon: 'lock' },
        ],
      },
      {
        title: 'Public',
        items: [{ href: '/directory', label: 'Public directory', icon: 'search' }],
      },
    );
  } else if (isProfessional) {
    groups.push(
      {
        title: 'Your practice',
        items: [
          { href: '/dashboard', label: 'Dashboard', icon: 'home' },
          { href: '/portfolio', label: 'My portfolio', icon: 'briefcase' },
          { href: '/pending', label: 'Cases pending review', icon: 'inbox', badge: pendingCount },
          { href: '/clients', label: 'Clients', icon: 'users' },
          { href: '/calendar', label: 'Calendar', icon: 'calendar' },
          { href: '/rooms', label: 'Conference rooms', icon: 'video' },
          { href: '/emergency/desk', label: 'Emergency desk', icon: 'alert' },
          { href: '/enquiries', label: 'Enquiry pool', icon: 'inbox' },
          { href: '/reviews', label: 'Reviews', icon: 'star' },
          ...(isFirm
            ? [{ href: '/firm/oversight', label: 'Practice oversight', icon: 'chart' } as NavItem]
            : []),
          { href: '/inquiries', label: 'Inquiries', icon: 'mail' },
        ],
      },
      {
        title: 'Your profile',
        items: [
          { href: '/profile', label: 'My profile', icon: 'user' },
          { href: '/credentials', label: 'Legal details', icon: 'fileText' },
          { href: '/listing', label: 'Directory listing', icon: 'idCard' },
          { href: '/receipt-template', label: 'Receipt layout', icon: 'idCard' },
          { href: '/payments', label: 'Fees & receipts', icon: 'creditCard' },
          ...(isFirm
            ? [{ href: '/firm/lawyers', label: 'Lawyers registered', icon: 'scale' } as NavItem]
            : [{ href: '/invitations', label: 'Firm invitations', icon: 'mailPlus' } as NavItem]),
          { href: '/verification', label: 'Verification', icon: 'shieldCheck' },
        ],
      },
      {
        title: 'Community and help',
        items: [
          { href: '/blog', label: 'Community', icon: 'community' },
          { href: '/support', label: 'Support', icon: 'lifeBuoy', badge: supportCount },
          { href: '/directory', label: 'Public directory', icon: 'search' },
        ],
      },
      {
        title: 'Your account',
        items: [
          { href: '/notifications', label: 'Alerts', icon: 'bell', badge: unreadAlerts },
          { href: '/account', label: 'Account & security', icon: 'lock' },
          ...(isReviewer
            ? [
                {
                  href: '/admin/verifications',
                  label: 'Reviewer console',
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
        title: 'Your cases',
        items: [
          { href: '/dashboard', label: 'Dashboard', icon: 'home' },
          { href: '/cases', label: 'My cases', icon: 'folder' },
          { href: '/payments', label: 'Fees & receipts', icon: 'creditCard' },
          { href: '/rooms', label: 'Conference rooms', icon: 'video' },
          { href: '/reviews', label: 'Reviews', icon: 'star' },
        ],
      },
      {
        title: 'Find help',
        items: [
          { href: '/directory', label: 'Directory', icon: 'search' },
          { href: '/inquiries', label: 'Inquiries', icon: 'mail' },
          { href: '/blog', label: 'Community', icon: 'community' },
        ],
      },
      {
        title: 'Your account',
        items: [
          { href: '/notifications', label: 'Alerts', icon: 'bell', badge: unreadAlerts },
          { href: '/profile', label: 'My profile', icon: 'user' },
          { href: '/verification', label: 'Verification', icon: 'shieldCheck' },
          { href: '/account', label: 'Account & security', icon: 'lock' },
          { href: '/support', label: 'Support', icon: 'lifeBuoy', badge: supportCount },
          ...(isReviewer
            ? [
                {
                  href: '/admin/verifications',
                  label: 'Reviewer console',
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
