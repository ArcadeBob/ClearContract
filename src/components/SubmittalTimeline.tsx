import { Clock, AlertTriangle } from 'lucide-react';
import type { SubmittalEntry, ContractDate } from '../types/contract';

interface SubmittalTimelineProps {
  submittals: SubmittalEntry[];
  dates: ContractDate[];
}

function formatType(type: string): string {
  return type.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function SubmittalTimeline({ submittals, dates }: SubmittalTimelineProps) {
  const milestones = dates.filter((d) => d.type === 'Milestone');
  const maxDays = submittals.reduce(
    (max, s) => Math.max(max, s.reviewDuration + s.resubmittalBuffer),
    0
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
          <Clock className="w-4 h-4" />
        </div>
        <h3 className="text-sm font-semibold text-slate-900">Submittal Timeline</h3>
      </div>

      {submittals.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm font-semibold text-slate-700 mb-1">No Submittals Extracted</p>
          <p className="text-sm text-slate-500">
            This contract did not contain submittal requirements. Submittals are extracted from shop drawing, sample, and mockup clauses.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {milestones.length > 0 && (
            <div className="flex items-center gap-3 mb-2">
              {milestones.map((m) => (
                <span
                  key={m.label}
                  className="text-xs text-slate-500 border-l-2 border-dashed border-slate-300 pl-2"
                >
                  {m.label}: {m.date}
                </span>
              ))}
            </div>
          )}
          {submittals.map((sub, i) => {
            const totalDays = sub.reviewDuration + sub.resubmittalBuffer;
            const widthPct = maxDays > 0 ? Math.max((totalDays / maxDays) * 100, 4) : 4;
            const isNotStated =
              sub.reviewDuration === 0 && !sub.statedFields.includes('reviewDuration');
            const hasConflict = false; // simplified: conflict detection deferred to wiring

            return (
              <div key={i} className="flex items-center gap-3">
                <div className="w-28 shrink-0">
                  <span className="text-xs font-medium text-slate-700">
                    {formatType(sub.type)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-600 truncate mb-1">{sub.description}</p>
                  <div className="w-full bg-slate-100 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full ${
                        hasConflict ? 'bg-amber-200' : 'bg-blue-200'
                      }`}
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
                <div className="w-20 shrink-0 text-right flex items-center justify-end gap-1">
                  {hasConflict && (
                    <span className="text-amber-500">
                      <AlertTriangle className="w-3.5 h-3.5" />
                    </span>
                  )}
                  {isNotStated ? (
                    <span className="text-slate-400 italic text-xs">---</span>
                  ) : (
                    <span className="text-xs text-slate-600">{totalDays} days</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
