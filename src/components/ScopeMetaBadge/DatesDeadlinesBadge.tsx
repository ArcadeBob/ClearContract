import { ScopeMeta } from '../../types/contract';
import { pillBase, formatLabel } from './shared';

type DatesDeadlinesMeta = Extract<ScopeMeta, { passType: 'dates-deadlines' }>;

interface DatesDeadlinesBadgeProps {
  meta: DatesDeadlinesMeta;
}

export function DatesDeadlinesBadge({ meta }: DatesDeadlinesBadgeProps) {
  const periodColor =
    meta.periodType === 'notice-period' || meta.periodType === 'cure-period'
      ? 'bg-amber-100 text-amber-700'
      : meta.periodType === 'payment-term'
        ? 'bg-green-100 text-green-700'
        : meta.periodType === 'project-milestone' ||
            meta.periodType === 'submittal-deadline'
          ? 'bg-blue-100 text-blue-700'
          : meta.periodType === 'warranty-period' ||
              meta.periodType === 'closeout-deadline'
            ? 'bg-slate-100 text-slate-600'
            : 'bg-slate-100 text-slate-600';

  return (
    <>
      <div className="flex flex-wrap items-center gap-1 mt-2">
        <span className={`${pillBase} ${periodColor}`}>
          {formatLabel(meta.periodType)}
        </span>
        {meta.duration && meta.duration !== 'N/A' && (
          <span className={`${pillBase} bg-slate-100 text-slate-700`}>
            {meta.duration}
          </span>
        )}
      </div>
      {meta.triggerEvent && meta.triggerEvent !== 'N/A' && (
        <span className="text-xs text-slate-500 italic">
          Triggered by: {meta.triggerEvent}
        </span>
      )}
    </>
  );
}
