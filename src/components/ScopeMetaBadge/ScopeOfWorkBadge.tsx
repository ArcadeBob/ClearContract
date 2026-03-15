import { ScopeMeta } from '../../types/contract';
import { pillBase, formatLabel } from './shared';

type ScopeOfWorkMeta = Extract<ScopeMeta, { passType: 'scope-of-work' }>;

interface ScopeOfWorkBadgeProps {
  meta: ScopeOfWorkMeta;
}

export function ScopeOfWorkBadge({ meta }: ScopeOfWorkBadgeProps) {
  const scopeColor =
    meta.scopeItemType === 'exclusion' || meta.scopeItemType === 'gap'
      ? 'bg-red-100 text-red-700'
      : meta.scopeItemType === 'ambiguity'
        ? 'bg-amber-100 text-amber-700'
        : meta.scopeItemType === 'inclusion' ||
            meta.scopeItemType === 'scope-rule'
          ? 'bg-green-100 text-green-700'
          : meta.scopeItemType === 'specification-reference'
            ? 'bg-blue-100 text-blue-700'
            : 'bg-slate-100 text-slate-600';

  return (
    <div className="flex flex-wrap items-center gap-1 mt-2">
      <span className={`${pillBase} ${scopeColor}`}>
        {formatLabel(meta.scopeItemType)}
      </span>
      {meta.specificationReference &&
        meta.specificationReference !== 'N/A' && (
          <span className={`${pillBase} bg-slate-100 text-slate-600`}>
            {meta.specificationReference}
          </span>
        )}
      {meta.affectedTrade && meta.affectedTrade !== 'glazing' && (
        <span className={`${pillBase} bg-purple-100 text-purple-700`}>
          {meta.affectedTrade}
        </span>
      )}
    </div>
  );
}
