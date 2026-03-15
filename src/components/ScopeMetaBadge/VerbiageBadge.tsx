import { ScopeMeta } from '../../types/contract';
import { pillBase, formatLabel } from './shared';

type VerbiageMeta = Extract<ScopeMeta, { passType: 'verbiage' }>;

interface VerbiageBadgeProps {
  meta: VerbiageMeta;
}

export function VerbiageBadge({ meta }: VerbiageBadgeProps) {
  const issueColor =
    meta.issueType === 'one-sided-term' ||
    meta.issueType === 'overreach-clause'
      ? 'bg-red-100 text-red-700'
      : meta.issueType === 'missing-protection'
        ? 'bg-amber-100 text-amber-700'
        : meta.issueType === 'ambiguous-language' ||
            meta.issueType === 'undefined-term'
          ? 'bg-yellow-100 text-yellow-700'
          : 'bg-slate-100 text-slate-600';

  const partyPill =
    meta.affectedParty === 'subcontractor'
      ? { color: 'bg-red-100 text-red-700', label: 'Affects Sub' }
      : meta.affectedParty === 'general-contractor'
        ? { color: 'bg-blue-100 text-blue-700', label: 'Affects GC' }
        : meta.affectedParty === 'both'
          ? { color: 'bg-purple-100 text-purple-700', label: 'Affects Both' }
          : null;

  return (
    <>
      <div className="flex flex-wrap items-center gap-1 mt-2">
        <span className={`${pillBase} ${issueColor}`}>
          {formatLabel(meta.issueType)}
        </span>
        {partyPill && (
          <span className={`${pillBase} ${partyPill.color}`}>
            {partyPill.label}
          </span>
        )}
      </div>
      {meta.suggestedClarification &&
        meta.suggestedClarification !== 'N/A' && (
          <div className="mt-1 text-xs text-slate-600 italic">
            Suggested: {meta.suggestedClarification}
          </div>
        )}
    </>
  );
}
