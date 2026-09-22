import { prisma } from '@/lib/db';
import { recordAudit } from '@/lib/audit';

/**
 * Application settings.
 *
 * Held in the database rather than the environment so an administrator can turn
 * a function off, or put the whole app into maintenance, while it is running.
 * Every change is written to the audit log with the actor.
 *
 * Defaults live here and are applied when a row is missing, so an empty table
 * means "everything on, no maintenance" rather than an app with no features.
 */

export type SettingKey =
  | 'maintenance.enabled'
  | 'maintenance.message'
  | 'feature.registration'
  | 'feature.directory'
  | 'feature.case_submission'
  | 'feature.inquiries'
  | 'feature.appointments'
  | 'feature.reviews'
  | 'feature.verification_submission';

export const SETTING_DEFAULTS: Record<SettingKey, string> = {
  'maintenance.enabled': 'false',
  'maintenance.message':
    'Dubai Legal is temporarily unavailable while we carry out maintenance. Please try again shortly.',
  'feature.registration': 'true',
  'feature.directory': 'true',
  'feature.case_submission': 'true',
  'feature.inquiries': 'true',
  'feature.appointments': 'true',
  'feature.reviews': 'true',
  'feature.verification_submission': 'true',
};

export const FEATURE_SETTINGS: {
  key: SettingKey;
  label: string;
  description: string;
}[] = [
  {
    key: 'feature.registration',
    label: 'New account registration',
    description: 'Turning this off closes signup. Existing members can still sign in.',
  },
  {
    key: 'feature.directory',
    label: 'Public directory',
    description: 'Turning this off hides the directory of lawyers and firms from everyone.',
  },
  {
    key: 'feature.case_submission',
    label: 'Case submission',
    description: 'Turning this off stops clients sending new cases to professionals.',
  },
  {
    key: 'feature.inquiries',
    label: 'General inquiries',
    description: 'Turning this off hides the general message form on professional profiles.',
  },
  {
    key: 'feature.appointments',
    label: 'Meeting booking',
    description: 'Turning this off stops lawyers registering new meetings in their calendar.',
  },
  {
    key: 'feature.reviews',
    label: 'Reviews',
    description: 'Turning this off hides reviews and stops new ones being written.',
  },
  {
    key: 'feature.verification_submission',
    label: 'Verification requests',
    description:
      'Turning this off stops members submitting documents for verification. Reviewers can still decide requests already in the queue.',
  },
];

export type AppSettings = Record<SettingKey, string>;

export async function getSettings(): Promise<AppSettings> {
  const rows = await prisma.appSetting.findMany({ select: { key: true, value: true } });
  const stored = new Map(rows.map((row) => [row.key, row.value]));

  const result = {} as AppSettings;
  for (const key of Object.keys(SETTING_DEFAULTS) as SettingKey[]) {
    result[key] = stored.get(key) ?? SETTING_DEFAULTS[key];
  }
  return result;
}

export async function getSetting(key: SettingKey): Promise<string> {
  const row = await prisma.appSetting.findUnique({ where: { key }, select: { value: true } });
  return row?.value ?? SETTING_DEFAULTS[key];
}

export async function isFeatureEnabled(key: SettingKey): Promise<boolean> {
  return (await getSetting(key)) === 'true';
}

export async function isMaintenanceMode(): Promise<boolean> {
  return (await getSetting('maintenance.enabled')) === 'true';
}

export async function setSetting(
  actorUserId: string,
  key: SettingKey,
  value: string,
  meta: { ip?: string | null } = {},
): Promise<void> {
  const previous = await getSetting(key);

  await prisma.appSetting.upsert({
    where: { key },
    create: { key, value, updatedById: actorUserId },
    update: { value, updatedById: actorUserId },
  });

  await recordAudit({
    actorUserId,
    action: 'settings.changed',
    entityType: 'app_setting',
    entityId: key,
    metadata: { key, from: previous, to: value },
    ip: meta.ip ?? null,
  });
}

/** What an administrator sees on the settings screen. */
export async function getSettingsForAdmin() {
  const settings = await getSettings();
  const rows = await prisma.appSetting.findMany({
    select: { key: true, updatedAt: true, updatedBy: { select: { email: true } } },
  });
  const meta = new Map(rows.map((row) => [row.key, row]));
  return { settings, meta };
}
