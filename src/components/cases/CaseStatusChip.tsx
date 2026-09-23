import { getI18n } from '@/lib/i18n';
import { caseStatusLabel } from '@/lib/i18n/labels';
import { LEGAL_CASE_STATUS_STYLE } from '@/lib/constants';
import { cx } from '@/components/ui/primitives';

/** The lifecycle state of a client case, in the colour that belongs to it. */
export async function CaseStatusChip({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const { t } = await getI18n();

  return (
    <span
      className={cx(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset',
        LEGAL_CASE_STATUS_STYLE[status] ?? 'bg-slate-100 text-slate-700 ring-slate-200',
        className,
      )}
    >
      {caseStatusLabel(t, status)}
    </span>
  );
}

/**
 * The progress a client is shown: Submitted → Under review → Assigned.
 * Rendered as a simple track so the current step is obvious at a glance.
 */
export async function CaseProgressTrack({ status }: { status: string }) {
  const { t } = await getI18n();
  const steps = ['SUBMITTED', 'UNDER_REVIEW', 'ASSIGNED'];
  const closed = status === 'COMPLETED' || status === 'DECLINED';
  const activeIndex = closed ? steps.length - 1 : steps.indexOf(status);

  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-2 text-xs">
      {steps.map((step, index) => {
        const reached = activeIndex >= index;
        return (
          <li key={step} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className={cx(
                'inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold',
                reached ? 'bg-brand-700 text-white' : 'bg-slate-200 text-slate-500',
              )}
            >
              {index + 1}
            </span>
            <span className={reached ? 'font-medium text-slate-900' : 'text-slate-500'}>
              {caseStatusLabel(t, step)}
            </span>
            {index < steps.length - 1 ? (
              <span aria-hidden="true" className="text-slate-300">
                →
              </span>
            ) : null}
          </li>
        );
      })}
      {status === 'DECLINED' ? (
        <li className="ml-1 font-medium text-red-700">{caseStatusLabel(t, 'DECLINED')}</li>
      ) : null}
      {status === 'COMPLETED' ? (
        <li className="ml-1 font-medium text-slate-700">· {caseStatusLabel(t, 'COMPLETED')}</li>
      ) : null}
    </ol>
  );
}
