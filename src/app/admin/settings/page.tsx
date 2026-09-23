import type { Metadata } from 'next';
import Link from 'next/link';
import { getI18n } from '@/lib/i18n';
import { requireReviewer } from '@/lib/auth';
import { getSettingsForAdmin, FEATURE_SETTINGS } from '@/server/services/settings-service';
import { sampleDataSummary } from '@/server/services/admin-service';
import { accountTypeLabel } from '@/lib/i18n/labels';
import { Alert, Card } from '@/components/ui/primitives';
import {
  ClearTrafficForm,
  DeleteSampleDataForm,
  FeatureToggle,
  MaintenanceMessageForm,
  ShutdownForm,
} from '@/components/forms/AdminOpsForms';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.items.settings };
}

/**
 * Installation settings.
 *
 * Every switch here takes effect immediately and is recorded in the audit log
 * with the administrator who changed it.
 */
export default async function AdminSettingsPage() {
  const [, { t }, { settings, meta }, sample] = await Promise.all([
    requireReviewer(),
    getI18n(),
    getSettingsForAdmin(),
    sampleDataSummary(),
  ]);

  const maintenanceOn = settings['maintenance.enabled'] === 'true';

  /**
   * The switch labels live in the service as English defaults; the words shown
   * here come from the dictionary, keyed by the setting they describe.
   */
  const featureCopy: Record<string, { label: string; description: string }> = {
    'feature.registration': t.admin.settings.features.registration,
    'feature.directory': t.admin.settings.features.directory,
    'feature.case_submission': t.admin.settings.features.caseSubmission,
    'feature.inquiries': t.admin.settings.features.inquiries,
    'feature.appointments': t.admin.settings.features.appointments,
    'feature.reviews': {
      label: t.items.reviews,
      description: t.admin.settings.features.reviews.description,
    },
    'feature.verification_submission': t.admin.settings.features.verificationSubmission,
  };

  const sampleData = t.admin.settings.sampleData;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">{t.items.settings}</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">{t.admin.settings.intro}</p>
      </header>

      {/* ── Maintenance ─────────────────────────────────────────────────── */}
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold text-slate-900">{t.admin.settings.maintenance.title}</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              {t.admin.settings.maintenance.body}
            </p>
          </div>
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
              maintenanceOn
                ? 'bg-red-50 text-red-800 ring-red-200'
                : 'bg-green-50 text-green-800 ring-green-200'
            }`}
          >
            {maintenanceOn ? t.admin.settings.maintenance.on : t.admin.settings.maintenance.live}
          </span>
        </div>

        <div className="mt-4 border-t border-slate-100 pt-4">
          <FeatureToggle
            settingKey="maintenance.enabled"
            label={t.admin.settings.maintenance.title}
            description={t.admin.settings.maintenance.description}
            enabled={maintenanceOn}
            updatedBy={meta.get('maintenance.enabled')?.updatedBy?.email ?? null}
            updatedAt={meta.get('maintenance.enabled')?.updatedAt ?? null}
            labels={{
              enabled: t.admin.settings.toggle.enabled,
              disabled: t.admin.settings.toggle.disabled,
              lastChanged: t.admin.settings.toggle.lastChanged,
              changedBy: t.admin.settings.toggle.changedBy,
              neverChanged: t.admin.settings.toggle.neverChanged,
              saving: t.admin.settings.toggle.saving,
              turnOff: t.admin.settings.toggle.turnOff,
              turnOn: t.admin.settings.toggle.turnOn,
              confirmDisable: t.admin.settings.toggle.confirmDisable,
              confirmEnable: t.admin.settings.toggle.confirmEnable,
            }}
          />
          <div className="border-t border-slate-100 pt-4">
            <MaintenanceMessageForm
              message={settings['maintenance.message']}
              labels={{
                fieldLabel: t.admin.settings.maintenanceMessage.fieldLabel,
                saving: t.admin.settings.maintenanceMessage.saving,
                submit: t.admin.settings.maintenanceMessage.submit,
              }}
            />
          </div>
        </div>
      </Card>

      {/* ── Feature switches ────────────────────────────────────────────── */}
      <Card>
        <h2 className="font-semibold text-slate-900">{t.admin.settings.features.title}</h2>
        <p className="mt-1 text-sm text-slate-600">{t.admin.settings.features.body}</p>
        <div className="mt-2 divide-y divide-slate-100">
          {FEATURE_SETTINGS.map((feature) => {
            const copy = featureCopy[feature.key];
            return (
              <FeatureToggle
                key={feature.key}
                settingKey={feature.key}
                label={copy?.label ?? feature.label}
                description={copy?.description ?? feature.description}
                enabled={settings[feature.key] === 'true'}
                updatedBy={meta.get(feature.key)?.updatedBy?.email ?? null}
                updatedAt={meta.get(feature.key)?.updatedAt ?? null}
                labels={{
                  enabled: t.admin.settings.toggle.enabled,
                  disabled: t.admin.settings.toggle.disabled,
                  lastChanged: t.admin.settings.toggle.lastChanged,
                  changedBy: t.admin.settings.toggle.changedBy,
                  neverChanged: t.admin.settings.toggle.neverChanged,
                  saving: t.admin.settings.toggle.saving,
                  turnOff: t.admin.settings.toggle.turnOff,
                  turnOn: t.admin.settings.toggle.turnOn,
                  confirmDisable: t.admin.settings.toggle.confirmDisable,
                  confirmEnable: t.admin.settings.toggle.confirmEnable,
                }}
              />
            );
          })}
        </div>
      </Card>

      {/* ── Traffic register ────────────────────────────────────────────── */}
      <Card>
        <h2 className="font-semibold text-slate-900">{t.items.activityRegister}</h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          {t.admin.settings.traffic.body}{' '}
          <Link href="/admin/traffic" className="font-medium text-brand-700 hover:underline">
            {t.admin.settings.traffic.openRegister}
          </Link>
          {t.admin.settings.traffic.tail}
        </p>
        <div className="mt-4 border-t border-slate-100 pt-4">
          <ClearTrafficForm
            labels={{
              confirm: t.admin.settings.traffic.confirmClear,
              pending: t.admin.settings.traffic.clearing,
              submit: t.admin.settings.traffic.clear,
            }}
          />
        </div>
      </Card>

      {/* ── Sample data ─────────────────────────────────────────────────── */}
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold text-slate-900">{sampleData.title}</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              {sampleData.bodyLead}
              <code>npm run seed:demo</code>
              {sampleData.bodyTail}
            </p>
          </div>
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
              sample.accounts.length === 0
                ? 'bg-green-50 text-green-800 ring-green-200'
                : 'bg-amber-50 text-amber-900 ring-amber-200'
            }`}
          >
            {sample.accounts.length === 0
              ? sampleData.none
              : (sample.accounts.length === 1 ? sampleData.countOne : sampleData.countMany).replace(
                  '{count}',
                  String(sample.accounts.length),
                )}
          </span>
        </div>

        {sample.accounts.length > 0 ? (
          <ul className="mt-4 space-y-1 border-t border-slate-100 pt-4 text-xs text-slate-600">
            {sample.accounts.map((account) => (
              <li key={account.id} className="font-mono">
                {account.email} · {accountTypeLabel(t, account.accountType)}
              </li>
            ))}
            <li className="pt-1 font-sans text-slate-500">
              {(sample.documents === 1
                ? sampleData.storedDocumentsOne
                : sampleData.storedDocumentsMany
              ).replace('{count}', String(sample.documents))}{' '}
              ·{' '}
              {(sample.cases === 1 ? sampleData.storedCasesOne : sampleData.storedCasesMany).replace(
                '{count}',
                String(sample.cases),
              )}
            </li>
          </ul>
        ) : null}

        <div className="mt-4 border-t border-slate-100 pt-4">
          <DeleteSampleDataForm
            accountCount={sample.accounts.length}
            labels={{
              empty: sampleData.deleteNone,
              one: sampleData.deleteOne,
              many: sampleData.deleteMany,
              fieldLabel: sampleData.fieldLabel,
              fieldHint: sampleData.fieldHint,
              placeholder: sampleData.placeholder,
              pending: sampleData.pending,
              submit: sampleData.submit,
            }}
          />
        </div>
      </Card>

      {/* ── Danger zone ─────────────────────────────────────────────────── */}
      <Card className="border-red-200">
        <h2 className="font-semibold text-red-800">{t.admin.settings.danger.title}</h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          {t.admin.settings.danger.body}
          <code>npm start</code>
          {t.admin.settings.danger.bodyMid}
          <code>npm run dev</code>
          {t.admin.settings.danger.bodyTail}
        </p>

        {maintenanceOn ? (
          <Alert tone="info" className="mt-4">
            {t.admin.settings.danger.alertOn}
          </Alert>
        ) : (
          <Alert tone="warning" className="mt-4">
            {t.admin.settings.danger.alertOff}
          </Alert>
        )}

        <div className="mt-4 border-t border-red-100 pt-4">
          <ShutdownForm
            labels={{
              alertTitle: t.admin.settings.shutdown.alertTitle,
              fieldLabel: t.admin.settings.shutdown.fieldLabel,
              fieldHint: t.admin.settings.shutdown.fieldHint,
              placeholder: t.admin.settings.shutdown.placeholder,
              pending: t.admin.settings.shutdown.pending,
              submit: t.admin.settings.shutdown.submit,
            }}
          />
        </div>
      </Card>
    </div>
  );
}
