import { cache } from 'react';
import { prisma } from '@/lib/db';
import { getSettings, type SettingKey, type AppSettings } from '@/server/services/settings-service';

/**
 * Availability of the application as a whole.
 *
 * Maintenance mode hides every page from everyone except reviewers, who need to
 * get in to turn it back off. Feature flags are checked by the pages and actions
 * they belong to, so a disabled function cannot be reached by posting the form
 * directly.
 */

export type Availability = {
  maintenance: boolean;
  message: string;
  settings: AppSettings;
};

/**
 * Cached for the duration of one request: the layout and the page both ask
 * whether the app is in maintenance, and that is one read of the settings
 * rather than two.
 */
export const getAvailability = cache(async function getAvailability(): Promise<Availability> {
  const settings = await getSettings();
  return {
    maintenance: settings['maintenance.enabled'] === 'true',
    message: settings['maintenance.message'],
    settings,
  };
});

/**
 * Whether the current viewer may pass through maintenance mode. Reviewers can,
 * so that maintenance can never lock an operator out of their own console.
 */
export async function mayBypassMaintenance(userId: string | null): Promise<boolean> {
  if (!userId) return false;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { roles: true },
  });
  return user?.roles.includes('REVIEWER') ?? false;
}

export function isEnabled(settings: AppSettings, key: SettingKey): boolean {
  return settings[key] === 'true';
}

/** Message shown when a disabled function is reached directly. */
export function featureDisabledMessage(key: SettingKey): string {
  switch (key) {
    case 'feature.registration':
      return 'New account registration is currently switched off by the administrators of this installation.';
    case 'feature.directory':
      return 'The public directory is currently switched off.';
    case 'feature.case_submission':
      return 'Sending new cases is currently switched off. Existing cases continue as normal.';
    case 'feature.inquiries':
      return 'Sending general inquiries is currently switched off.';
    case 'feature.appointments':
      return 'Booking new meetings is currently switched off. Meetings already booked are unaffected.';
    case 'feature.reviews':
      return 'Reviews are currently switched off.';
    case 'feature.verification_submission':
      return 'Submitting documents for verification is currently switched off.';
    default:
      return 'That function is currently switched off.';
  }
}
