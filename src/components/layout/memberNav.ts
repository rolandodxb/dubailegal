import type { AccountType, Role } from '@prisma/client';
import type { NavItem } from '@/components/layout/BottomNav';
import { isAdministratorRole } from './navRoles';

/**
 * The signed-in navigation, defined once.
 *
 * Both the member area and the public pages render this, so a signed-in person
 * sees the same sidebar wherever they are and the header never has to carry a
 * second set of links.
 */
export function buildMemberNav(params: {
  accountType: AccountType;
  roles: Role[];
  unreadAlerts: number;
  pendingCount: number;
  supportCount: number;
}): { navItems: NavItem[]; bottomItems: NavItem[] } {
  const { accountType, roles, unreadAlerts, pendingCount, supportCount } = params;
  const isFirm = accountType === 'FIRM';
  const isProfessional = accountType === 'LAWYER' || isFirm;
  const isReviewer = roles.includes('REVIEWER');
  const adminOnly = isAdministratorRole(roles);

  // An administrator runs the platform and has no member dashboard, so the
  // navigation never offers a page that would bounce them back.
  if (adminOnly) {
    return {
      navItems: [
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
        { href: '/notifications', label: 'My alerts', icon: 'bell', badge: unreadAlerts },
        { href: '/profile', label: 'My details', icon: 'user' },
        { href: '/account', label: 'Account & security', icon: 'lock' },
        { href: '/directory', label: 'Public directory', icon: 'search' },
      ],
      bottomItems: [
        { href: '/admin/verifications', label: 'Console', icon: 'shieldCheck' },
        { href: '/admin/cases', label: 'Cases', icon: 'folder' },
        { href: '/admin/enquiries', label: 'Enquiry pool', icon: 'inbox' },
        { href: '/admin/support', label: 'Support', icon: 'lifeBuoy', badge: supportCount },
        { href: '/admin/users', label: 'Accounts', icon: 'users' },
        { href: '/notifications', label: 'Alerts', icon: 'bell', badge: unreadAlerts },
        { href: '/account', label: 'Account', icon: 'lock' },
      ],
    };
  }

  if (isProfessional) {
    return {
      navItems: [
        { href: '/dashboard', label: 'Dashboard', icon: 'home' },
        { href: '/portfolio', label: 'My portfolio', icon: 'briefcase' },
        { href: '/pending', label: 'Cases pending review', icon: 'inbox', badge: pendingCount },
        { href: '/clients', label: 'Clients', icon: 'users' },
        { href: '/enquiries', label: 'Enquiry pool', icon: 'inbox' },
        { href: '/calendar', label: 'Calendar', icon: 'calendar' },
        { href: '/rooms', label: 'Conference rooms', icon: 'video' },
        { href: '/emergency/desk', label: 'Emergency desk', icon: 'alert' },
        { href: '/reviews', label: 'Reviews', icon: 'star' },
        ...(isFirm
          ? [{ href: '/firm/oversight', label: 'Practice oversight', icon: 'chart' } as NavItem]
          : []),
        { href: '/inquiries', label: 'Inquiries', icon: 'mail' },
        { href: '/blog', label: 'Community', icon: 'community' },
        { href: '/support', label: 'Support', icon: 'lifeBuoy', badge: supportCount },
        { href: '/notifications', label: 'Alerts', icon: 'bell', badge: unreadAlerts },
        { href: '/profile', label: 'My profile', icon: 'user' },
        { href: '/credentials', label: 'Legal details', icon: 'fileText' },
        { href: '/receipt-template', label: 'Receipt layout', icon: 'idCard' },
        { href: '/payments', label: 'Fees & receipts', icon: 'creditCard' },
        { href: '/listing', label: 'Directory listing', icon: 'idCard' },
        ...(isFirm
          ? [{ href: '/firm/lawyers', label: 'Lawyers registered', icon: 'scale' } as NavItem]
          : [{ href: '/invitations', label: 'Firm invitations', icon: 'mailPlus' } as NavItem]),
        { href: '/verification', label: 'Verification', icon: 'shieldCheck' },
        { href: '/account', label: 'Account & security', icon: 'lock' },
        ...(isReviewer
          ? [{ href: '/admin/verifications', label: 'Reviewer console', icon: 'shieldCheck' } as NavItem]
          : []),
        { href: '/directory', label: 'Public directory', icon: 'search' },
      ],
      bottomItems: [
        { href: '/dashboard', label: 'Home', icon: 'home' },
        { href: '/pending', label: 'Pending', icon: 'inbox', badge: pendingCount },
        { href: '/portfolio', label: 'Portfolio', icon: 'briefcase' },
        { href: '/calendar', label: 'Calendar', icon: 'calendar' },
        { href: '/notifications', label: 'Alerts', icon: 'bell', badge: unreadAlerts },
      ],
    };
  }

  return {
    navItems: [
      { href: '/dashboard', label: 'Dashboard', icon: 'home' },
      { href: '/cases', label: 'My cases', icon: 'folder' },
      { href: '/payments', label: 'Fees & receipts', icon: 'creditCard' },
      { href: '/rooms', label: 'Conference rooms', icon: 'video' },
      { href: '/reviews', label: 'Reviews', icon: 'star' },
      { href: '/directory', label: 'Directory', icon: 'search' },
      { href: '/inquiries', label: 'Inquiries', icon: 'mail' },
      { href: '/blog', label: 'Community', icon: 'community' },
      { href: '/support', label: 'Support', icon: 'lifeBuoy', badge: supportCount },
      { href: '/notifications', label: 'Alerts', icon: 'bell', badge: unreadAlerts },
      { href: '/profile', label: 'My profile', icon: 'user' },
      { href: '/verification', label: 'Verification', icon: 'shieldCheck' },
      { href: '/account', label: 'Account & security', icon: 'lock' },
      ...(isReviewer
        ? [{ href: '/admin/verifications', label: 'Reviewer console', icon: 'shieldCheck' } as NavItem]
        : []),
    ],
    bottomItems: [
      { href: '/dashboard', label: 'Home', icon: 'home' },
      { href: '/cases', label: 'Cases', icon: 'folder' },
      { href: '/blog', label: 'Community', icon: 'community' },
      { href: '/rooms', label: 'Rooms', icon: 'video' },
      { href: '/notifications', label: 'Alerts', icon: 'bell', badge: unreadAlerts },
      { href: '/account', label: 'Account', icon: 'lock' },
    ],
  };
}
