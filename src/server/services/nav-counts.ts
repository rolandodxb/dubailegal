import { unreadNotificationCount } from './notification-service';
import { countCasesAwaitingFirm, countCasesAwaitingLawyer } from './case-service';
import { supportBadge } from './support-service';
import type { AccountType, Role } from '@prisma/client';

/**
 * The counters the navigation shows: unread alerts, cases waiting to be picked
 * up, and whatever support is waiting on this account — an unanswered ticket for
 * an administrator, or a reply to read for everybody else.
 */
export async function navCounts(
  userId: string,
  accountType: AccountType,
  roles: Role[],
): Promise<{ unreadAlerts: number; pendingCount: number; supportCount: number }> {
  const isProfessional = accountType === 'LAWYER' || accountType === 'FIRM';
  const isAdminOnly = roles.includes('REVIEWER');

  const [unreadAlerts, pendingCount, supportCount] = await Promise.all([
    unreadNotificationCount(userId),
    isProfessional && !isAdminOnly
      ? accountType === 'FIRM'
        ? countCasesAwaitingFirm(userId)
        : countCasesAwaitingLawyer(userId)
      : Promise.resolve(0),
    supportBadge(userId, roles),
  ]);

  return { unreadAlerts, pendingCount, supportCount };
}
