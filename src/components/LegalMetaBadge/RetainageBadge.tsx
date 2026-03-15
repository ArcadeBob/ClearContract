import { LegalMeta } from '../../types/contract';
import { pillBase } from './shared';

type RetainageMeta = Extract<LegalMeta, { clauseType: 'retainage' }>;

interface RetainageBadgeProps {
  meta: RetainageMeta;
}

export function RetainageBadge({ meta }: RetainageBadgeProps) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-1">
        <span className={`${pillBase} bg-slate-100 text-slate-700`}>
          {meta.percentage}
        </span>
        <span
          className={`${pillBase} ${
            meta.tiedTo === 'sub-work'
              ? 'bg-green-100 text-green-700'
              : meta.tiedTo === 'project-completion'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-red-100 text-red-700'
          }`}
        >
          {meta.tiedTo === 'sub-work'
            ? "Tied to Sub's Work"
            : meta.tiedTo === 'project-completion'
              ? 'Tied to Project Completion'
              : 'Release Unspecified'}
        </span>
      </div>
      {meta.releaseCondition && (
        <p className="text-xs text-slate-500 mt-1 italic">
          {meta.releaseCondition}
        </p>
      )}
    </div>
  );
}
