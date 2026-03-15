import { LegalMeta } from '../../types/contract';
import { pillBase } from './shared';

type IndemnificationMeta = Extract<LegalMeta, { clauseType: 'indemnification' }>;

interface IndemnificationBadgeProps {
  meta: IndemnificationMeta;
}

export function IndemnificationBadge({ meta }: IndemnificationBadgeProps) {
  return (
    <>
      <span
        className={`${pillBase} ${
          meta.riskType === 'broad'
            ? 'bg-red-100 text-red-700'
            : meta.riskType === 'intermediate'
              ? 'bg-amber-100 text-amber-700'
              : 'bg-green-100 text-green-700'
        }`}
      >
        {meta.riskType === 'broad'
          ? 'Broad Form'
          : meta.riskType === 'intermediate'
            ? 'Intermediate Form'
            : 'Limited Form'}
      </span>
      {meta.hasInsuranceGap && (
        <span className={`${pillBase} bg-red-100 text-red-700`}>
          Insurance Gap
        </span>
      )}
    </>
  );
}
