import type { Role } from '@prisma/client';

/**
 * Whether a role set carries reviewer access.
 *
 * A small standalone helper so client-safe modules can ask the question without
 * importing the server-only auth module.
 */
export function isAdministratorRole(roles: readonly Role[] | null | undefined): boolean {
  return Boolean(roles?.includes('REVIEWER'));
}
