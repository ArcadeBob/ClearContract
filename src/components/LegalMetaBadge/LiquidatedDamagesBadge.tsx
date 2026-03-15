import { LegalMeta } from '../../types/contract';
import { pillBase } from './shared';

type LiquidatedDamagesMeta = Extract<LegalMeta, { clauseType: 'liquidated-damages' }>;

interface LiquidatedDamagesBadgeProps {
  meta: LiquidatedDamagesMeta;
}

export function LiquidatedDamagesBadge({ meta }: LiquidatedDamagesBadgeProps) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-1">
        <span
          className={`${pillBase} ${
            meta.capStatus === 'uncapped'
              ? 'bg-red-100 text-red-700'
              : 'bg-green-100 text-green-700'
          }`}
        >
          {meta.capStatus === 'uncapped' ? 'Uncapped' : 'Capped'}
        </span>
        <span className={`${pillBase} bg-slate-100 text-slate-700`}>
          {meta.amountOrRate}
        </span>
      </div>
      {meta.proportionalityAssessment && (
        <p className="text-xs text-slate-500 mt-1 italic">
          {meta.proportionalityAssessment}
        </p>
      )}
    </div>
  );
}
