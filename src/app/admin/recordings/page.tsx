import type { Metadata } from 'next';
import { requireReviewer } from '@/lib/auth';
import { getI18n } from '@/lib/i18n';
import { accountTypeLabel } from '@/lib/i18n/labels';
import { listRecordingsForAdmin, recordingOverview } from '@/server/services/room-recording-service';
import { formatFileSize } from '@/lib/format';
import { formatUaeDateTime } from '@/lib/time';
import { DeleteAllRecordingsForm, DeleteRecordingForm } from '@/components/rooms/RecordingAdminForms';
import { Alert, Card, EmptyState } from '@/components/ui/primitives';
import { Icon } from '@/components/icons';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.admin.recordings.metaTitle };
}

/**
 * Recordings, and the way to be rid of them.
 *
 * Evidence is kept for as long as it might be needed and not a day longer. When a
 * matter closes, or a dispute settles, or a retention period somebody promised
 * their client has run out, the recordings have to be able to go — all of them, in
 * one deliberate act, rather than one at a time by whoever is willing to scroll.
 *
 * This console shows **metadata only**: which room, which side recorded it, how
 * long, how large, when. An administrator cannot play them, and that is the point
 * of the design rather than an omission — a conversation between a lawyer and
 * their client is not something a platform operator should be able to watch. Being
 * able to delete it is a different power from being able to see it, and only the
 * first is here.
 */
export default async function AdminRecordingsPage() {
  const [{ t, effectiveLocale }] = await Promise.all([getI18n(), requireReviewer()]);

  const [overview, recordings] = await Promise.all([
    recordingOverview(),
    listRecordingsForAdmin(),
  ]);

  const totalBytes = recordings.reduce((sum, row) => sum + row.sizeBytes, 0);

  const deleteEveryBody = (
    overview.count === 1
      ? t.admin.recordings.deleteEvery.bodyOne
      : t.admin.recordings.deleteEvery.body
  ).replace('{count}', String(overview.count));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">{t.admin.recordings.title}</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">{t.admin.recordings.subtitle}</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-slate-600">{t.admin.recordings.stats.held}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{overview.count}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-600">{t.admin.recordings.stats.rooms}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{overview.rooms}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-600">{t.admin.recordings.stats.storage}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
            {formatFileSize(totalBytes)}
          </p>
        </Card>
      </div>

      {/*
        The artifact: one control that destroys every recording and the files they
        live in. It demands a typed confirmation, because there is no undo and the
        evidence is the point of having kept it.
      */}
      <Card className="border-red-200">
        <div className="flex flex-wrap items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-700">
            <Icon name="trash" size={19} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-slate-900">{t.admin.recordings.deleteEvery.title}</h2>
            <p className="mt-1 text-sm text-slate-600">{deleteEveryBody}</p>
            <div className="mt-3">
              <DeleteAllRecordingsForm
                count={overview.count}
                labels={{
                  label: t.admin.recordings.deleteEvery.label,
                  hint: t.admin.recordings.deleteEvery.hint,
                  hintOne: t.admin.recordings.deleteEvery.hintOne,
                  submit: t.admin.recordings.deleteEvery.submit,
                  pending: t.admin.recordings.deleting,
                }}
              />
            </div>
          </div>
        </div>
      </Card>

      {recordings.length === 0 ? (
        <EmptyState
          title={t.admin.recordings.empty.title}
          description={t.admin.recordings.empty.body}
        />
      ) : (
        <section>
          <h2 className="mb-3 font-semibold text-slate-900">
            {t.admin.recordings.held.replace('{count}', String(recordings.length))}
          </h2>
          <ul className="space-y-3">
            {recordings.map((recording) => (
              <Card as="li" key={recording.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">
                      {t.admin.recordings.room}{' '}
                      <span className="font-mono text-sm">{recording.roomCode}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {t.admin.recordings.recordedBy} {recording.ownerName} (
                      {accountTypeLabel(t, recording.recordedBy.accountType)}) ·{' '}
                      {formatUaeDateTime(recording.createdAt, effectiveLocale)} ·{' '}
                      {recording.durationMs
                        ? t.admin.recordings.seconds.replace(
                            '{count}',
                            String(Math.max(1, Math.round(recording.durationMs / 1000))),
                          )
                        : t.admin.recordings.lengthNotRecorded}{' '}
                      · {formatFileSize(recording.sizeBytes)}
                    </p>
                  </div>
                  <DeleteRecordingForm
                    recordingId={recording.id}
                    roomCode={recording.roomCode}
                    labels={{
                      confirm: t.admin.recordings.row.confirm,
                      submit: t.common.delete,
                      pending: t.admin.recordings.deleting,
                    }}
                  />
                </div>
              </Card>
            ))}
          </ul>
        </section>
      )}

      <Alert tone="info" title={t.admin.recordings.alert.title}>
        {t.admin.recordings.alert.body}
      </Alert>
    </div>
  );
}
