import type { Metadata } from 'next';
import Link from 'next/link';
import { requireReviewer } from '@/lib/auth';
import { getSettingsForAdmin, FEATURE_SETTINGS } from '@/server/services/settings-service';
import { sampleDataSummary } from '@/server/services/admin-service';
import { Alert, Card } from '@/components/ui/primitives';
import {
  ClearTrafficForm,
  DeleteSampleDataForm,
  FeatureToggle,
  MaintenanceMessageForm,
  ShutdownForm,
} from '@/components/forms/AdminOpsForms';

export const metadata: Metadata = { title: 'Settings' };

/**
 * Installation settings.
 *
 * Every switch here takes effect immediately and is recorded in the audit log
 * with the administrator who changed it.
 */
export default async function AdminSettingsPage() {
  await requireReviewer();
  const [{ settings, meta }, sample] = await Promise.all([
    getSettingsForAdmin(),
    sampleDataSummary(),
  ]);

  const maintenanceOn = settings['maintenance.enabled'] === 'true';

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          Turn parts of the application on or off, take the app down for maintenance, and manage the
          activity register. Each change is written to the audit log.
        </p>
      </header>

      {/* ── Maintenance ─────────────────────────────────────────────────── */}
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold text-slate-900">Maintenance mode</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              While this is on, everyone except reviewers sees a maintenance notice instead of the
              application. Reviewers keep their access, so maintenance can never lock you out of
              turning it back off.
            </p>
          </div>
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
              maintenanceOn
                ? 'bg-red-50 text-red-800 ring-red-200'
                : 'bg-green-50 text-green-800 ring-green-200'
            }`}
          >
            {maintenanceOn ? 'Maintenance is ON' : 'Application is live'}
          </span>
        </div>

        <div className="mt-4 border-t border-slate-100 pt-4">
          <FeatureToggle
            settingKey="maintenance.enabled"
            label="Maintenance mode"
            description="Hides the application from everyone except reviewers."
            enabled={maintenanceOn}
            updatedBy={meta.get('maintenance.enabled')?.updatedBy?.email ?? null}
            updatedAt={meta.get('maintenance.enabled')?.updatedAt ?? null}
          />
          <div className="border-t border-slate-100 pt-4">
            <MaintenanceMessageForm message={settings['maintenance.message']} />
          </div>
        </div>
      </Card>

      {/* ── Feature switches ────────────────────────────────────────────── */}
      <Card>
        <h2 className="font-semibold text-slate-900">Application functions</h2>
        <p className="mt-1 text-sm text-slate-600">
          Disabling a function hides it and refuses direct submissions to it. Nothing is deleted, and
          existing data carries on as normal.
        </p>
        <div className="mt-2 divide-y divide-slate-100">
          {FEATURE_SETTINGS.map((feature) => (
            <FeatureToggle
              key={feature.key}
              settingKey={feature.key}
              label={feature.label}
              description={feature.description}
              enabled={settings[feature.key] === 'true'}
              updatedBy={meta.get(feature.key)?.updatedBy?.email ?? null}
              updatedAt={meta.get(feature.key)?.updatedAt ?? null}
            />
          ))}
        </div>
      </Card>

      {/* ── Traffic register ────────────────────────────────────────────── */}
      <Card>
        <h2 className="font-semibold text-slate-900">Activity register</h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Every page view and API call is recorded so you can see what is actually happening.{' '}
          <Link href="/admin/traffic" className="font-medium text-brand-700 hover:underline">
            Open the register
          </Link>
          . Records are pruned automatically after 30 days.
        </p>
        <div className="mt-4 border-t border-slate-100 pt-4">
          <ClearTrafficForm />
        </div>
      </Card>

      {/* ── Sample data ─────────────────────────────────────────────────── */}
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold text-slate-900">Sample data</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Nothing in this application is fabricated, with one exception: the demo accounts written
              by <code>npm run seed:demo</code>, which are flagged as sample data and labelled
              wherever they appear. This deletes all of them in one action — accounts, documents,
              cases and messages — and leaves every real account untouched.
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
              ? 'No sample data'
              : `${sample.accounts.length} sample account${sample.accounts.length === 1 ? '' : 's'}`}
          </span>
        </div>

        {sample.accounts.length > 0 ? (
          <ul className="mt-4 space-y-1 border-t border-slate-100 pt-4 text-xs text-slate-600">
            {sample.accounts.map((account) => (
              <li key={account.id} className="font-mono">
                {account.email} · {account.accountType}
              </li>
            ))}
            <li className="pt-1 font-sans text-slate-500">
              {sample.documents} stored document{sample.documents === 1 ? '' : 's'} · {sample.cases}{' '}
              case{sample.cases === 1 ? '' : 's'} attached
            </li>
          </ul>
        ) : null}

        <div className="mt-4 border-t border-slate-100 pt-4">
          <DeleteSampleDataForm accountCount={sample.accounts.length} />
        </div>
      </Card>

      {/* ── Danger zone ─────────────────────────────────────────────────── */}
      <Card className="border-red-200">
        <h2 className="font-semibold text-red-800">Danger zone</h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Shutting down stops the application process. Nothing is deleted, but the app will not
          respond again until it is started from a terminal with <code>npm start</code> or{' '}
          <code>npm run dev</code>. There is no way to bring it back from this screen.
        </p>

        {maintenanceOn ? (
          <Alert tone="info" className="mt-4">
            Maintenance mode is on. Consider leaving it on when you shut down, so the app returns in
            a controlled state.
          </Alert>
        ) : (
          <Alert tone="warning" className="mt-4">
            Maintenance mode is off. Anyone visiting while the server is down will see a connection
            error rather than a maintenance notice.
          </Alert>
        )}

        <div className="mt-4 border-t border-red-100 pt-4">
          <ShutdownForm />
        </div>
      </Card>
    </div>
  );
}
