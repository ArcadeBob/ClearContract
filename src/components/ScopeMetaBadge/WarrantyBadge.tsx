import { ScopeMeta } from '../../types/contract';
import { pillBase, formatLabel } from './shared';

type WarrantyMeta = Extract<ScopeMeta, { passType: 'warranty' }>;

export function WarrantyBadge({ meta }: { meta: WarrantyMeta }) {
  return (
    <div className="flex flex-wrap items-center gap-1 mt-2">
      <span className={`${pillBase} bg-emerald-100 text-emerald-700`}>
        {formatLabel(meta.warrantyAspect)}
      </span>
      {meta.warrantyDuration && meta.warrantyDuration !== 'N/A' && (
        <span className={`${pillBase} bg-blue-100 text-blue-700`}>
          {meta.warrantyDuration}
        </span>
      )}
      {meta.affectedParty && meta.affectedParty !== 'unspecified' && (
        <span className={`${pillBase} bg-slate-100 text-slate-700`}>
          {formatLabel(meta.affectedParty)}
        </span>
      )}
    </div>
  );
}
