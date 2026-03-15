import { LegalMeta } from '../../types/contract';
import { pillBase } from './shared';

type LienRightsMeta = Extract<LegalMeta, { clauseType: 'lien-rights' }>;

interface LienRightsBadgeProps {
  meta: LienRightsMeta;
}

export function LienRightsBadge({ meta }: LienRightsBadgeProps) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-1">
        <span
          className={`${pillBase} ${
            meta.waiverType === 'no-lien-clause' ||
            meta.waiverType === 'unconditional-before-payment'
              ? 'bg-red-100 text-red-700'
              : meta.waiverType === 'broad-release'
                ? 'bg-amber-100 text-amber-700'
                : meta.waiverType === 'conditional'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-slate-100 text-slate-700'
          }`}
        >
          {meta.waiverType === 'no-lien-clause'
            ? 'No-Lien Clause'
            : meta.waiverType === 'unconditional-before-payment'
              ? 'Unconditional Before Payment'
              : meta.waiverType === 'broad-release'
                ? 'Broad Release'
                : meta.waiverType === 'conditional'
                  ? 'Conditional'
                  : meta.waiverType === 'missing'
                    ? 'Missing'
                    : meta.waiverType}
        </span>
        {meta.lienFilingDeadline &&
          meta.lienFilingDeadline !== 'Unknown' && (
            <span className={`${pillBase} bg-slate-100 text-slate-700`}>
              Filing Deadline: {meta.lienFilingDeadline}
            </span>
          )}
      </div>
      {meta.enforceabilityContext && (
        <p className="text-xs text-slate-500 mt-1 italic">
          {meta.enforceabilityContext}
        </p>
      )}
    </div>
  );
}
