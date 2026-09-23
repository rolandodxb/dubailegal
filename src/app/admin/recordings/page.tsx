import type { Metadata } from 'next';
import { requireReviewer } from '@/lib/auth';
import { listRecordingsForAdmin, recordingOverview } from '@/server/services/room-recording-service';
import { formatFileSize } from '@/lib/format';
import { formatUaeDateTime } from '@/lib/time';
import { ACCOUNT_TYPE_LABEL } from '@/lib/constants';
import { DeleteAllRecordingsForm, DeleteRecordingForm } from '@/components/rooms/RecordingAdminForms';
import { Alert, Card, EmptyState } from '@/components/ui/primitives';
import { Icon } from '@/components/icons';

export const metadata: Metadata = { title: 'Recordings' };

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
  await requireReviewer();

  const [overview, recordings] = await Promise.all([
    recordingOverview(),
    listRecordingsForAdmin(),
  ]);

  const totalBytes = recordings.reduce((sum, row) => sum + row.sizeBytes, 0);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Call recordings</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          Every call in a conference room or an emergency room is recorded from both sides. Each
          recording is a composed picture of the room — both cameras and both microphones — so the
          interaction itself is on the record. They are encrypted, and available to the two people on
          the call and to nobody else.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-slate-600">Recordings held</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{overview.count}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-600">Rooms recorded</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{overview.rooms}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-600">Storage used</p>
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
            <h2 className="font-semibold text-slate-900">Delete every recording</h2>
            <p className="mt-1 text-sm text-slate-600">
              Destroys all {overview.count} recording{overview.count === 1 ? '' : 's'} and the files
              they are stored in. There is no undo, and the two people on each call will no longer be
              able to play them back. Recordings still being uploaded are not affected.
            </p>
            <div className="mt-3">
              <DeleteAllRecordingsForm count={overview.count} />
            </div>
          </div>
        </div>
      </Card>

      {recordings.length === 0 ? (
        <EmptyState
          title="No recordings are held"
          description="Nothing has been recorded yet, so there is nothing to delete."
        />
      ) : (
        <section>
          <h2 className="mb-3 font-semibold text-slate-900">Held ({recordings.length})</h2>
          <ul className="space-y-3">
            {recordings.map((recording) => (
              <Card as="li" key={recording.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">
                      Room <span className="font-mono text-sm">{recording.roomCode}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Recorded by {recording.ownerName} (
                      {ACCOUNT_TYPE_LABEL[recording.recordedBy.accountType]}) ·{' '}
                      {formatUaeDateTime(recording.createdAt)} ·{' '}
                      {recording.durationMs
                        ? `${Math.max(1, Math.round(recording.durationMs / 1000))} seconds`
                        : 'length not recorded'}{' '}
                      · {formatFileSize(recording.sizeBytes)}
                    </p>
                  </div>
                  <DeleteRecordingForm recordingId={recording.id} roomCode={recording.roomCode} />
                </div>
              </Card>
            ))}
          </ul>
        </section>
      )}

      <Alert tone="info" title="An administrator cannot watch these">
        The console shows that a recording exists, how long it is and when it was made — enough to
        decide whether it should still exist. Playing one is refused for every administrator account,
        because a conversation between a lawyer and their client is not the platform&rsquo;s to watch.
      </Alert>
    </div>
  );
}
