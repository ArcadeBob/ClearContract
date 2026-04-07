import { ScopeMeta } from '../../types/contract';
import { pillBase, formatLabel } from './shared';

type BidReconciliationMeta = Extract<ScopeMeta, { passType: 'bid-reconciliation' }>;

export function BidReconciliationBadge({ meta }: { meta: BidReconciliationMeta }) {
  return (
    <div className="flex flex-wrap items-center gap-1 mt-2">
      <span className={`${pillBase} bg-emerald-100 text-emerald-700`}>
        {formatLabel(meta.reconciliationType)}
      </span>
      {meta.directionOfRisk && (
        <span className={`${pillBase} bg-slate-100 text-slate-700`}>
          {meta.directionOfRisk.length > 60
            ? meta.directionOfRisk.slice(0, 60) + '...'
            : meta.directionOfRisk}
        </span>
      )}
    </div>
  );
}
