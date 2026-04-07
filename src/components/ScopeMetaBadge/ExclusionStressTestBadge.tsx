import { ScopeMeta } from '../../types/contract';
import { pillBase, formatLabel } from './shared';

type ExclusionStressTestMeta = Extract<ScopeMeta, { passType: 'exclusion-stress-test' }>;

interface ExclusionStressTestBadgeProps {
  meta: ExclusionStressTestMeta;
}

export function ExclusionStressTestBadge({ meta }: ExclusionStressTestBadgeProps) {
  return (
    <div className="flex flex-wrap items-center gap-1 mt-2">
      <span className={`${pillBase} bg-amber-100 text-amber-700`}>
        {formatLabel(meta.tensionType)}
      </span>
      <span className={`${pillBase} bg-blue-100 text-blue-700`}>
        {meta.specSection}
      </span>
    </div>
  );
}
