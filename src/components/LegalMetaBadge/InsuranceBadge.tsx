import { LegalMeta } from '../../types/contract';
import { pillBase } from './shared';

type InsuranceMeta = Extract<LegalMeta, { clauseType: 'insurance' }>;

interface InsuranceBadgeProps {
  meta: InsuranceMeta;
}

export function InsuranceBadge({ meta }: InsuranceBadgeProps) {
  return (
    <div>
      {meta.coverageItems.length > 0 && (
        <div className="space-y-1 mb-2">
          {meta.coverageItems.map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span
                className={`w-2 h-2 rounded-full ${item.isAboveStandard ? 'bg-amber-400' : 'bg-green-400'}`}
              />
              <span className="font-medium text-slate-700">
                {item.coverageType}:
              </span>
              <span className="text-slate-600">{item.requiredLimit}</span>
              {item.isAboveStandard && (
                <span className={`${pillBase} bg-amber-100 text-amber-700`}>
                  Above Standard
                </span>
              )}
            </div>
          ))}
        </div>
      )}
      {meta.endorsements.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 mb-1">
          {meta.endorsements.map((end, i) => (
            <span
              key={i}
              className={`${pillBase} ${end.isNonStandard ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}
            >
              {end.endorsementType}
            </span>
          ))}
        </div>
      )}
      {meta.certificateHolder && (
        <p className="text-xs text-slate-500 mt-1">
          Certificate Holder: {meta.certificateHolder}
        </p>
      )}
    </div>
  );
}
