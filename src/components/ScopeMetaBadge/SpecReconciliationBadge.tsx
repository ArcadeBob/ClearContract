import { ScopeMeta } from '../../types/contract';
import { pillBase, formatLabel } from './shared';

type SpecReconciliationMeta = Extract<ScopeMeta, { passType: 'spec-reconciliation' }>;

interface SpecReconciliationBadgeProps {
  meta: SpecReconciliationMeta;
}

export function SpecReconciliationBadge({ meta }: SpecReconciliationBadgeProps) {
  return (
    <div className="flex flex-wrap items-center gap-1 mt-2">
      <span className={`${pillBase} bg-amber-100 text-amber-700`}>
        {formatLabel(meta.gapType)}
      </span>
      <span className={`${pillBase} bg-blue-100 text-blue-700`}>
        {meta.specSection}
      </span>
      {meta.typicalDeliverable &&
        meta.typicalDeliverable !== 'N/A' && (
          <span className={`${pillBase} bg-purple-100 text-purple-700`}>
            {meta.typicalDeliverable.length > 40
              ? meta.typicalDeliverable.slice(0, 40) + '...'
              : meta.typicalDeliverable}
          </span>
        )}
    </div>
  );
}
