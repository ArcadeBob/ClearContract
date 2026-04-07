import { ScopeMeta } from '../../types/contract';
import { pillBase, formatLabel } from './shared';

type SafetyOshaMeta = Extract<ScopeMeta, { passType: 'safety-osha' }>;

export function SafetyOshaBadge({ meta }: { meta: SafetyOshaMeta }) {
  return (
    <div className="flex flex-wrap items-center gap-1 mt-2">
      <span className={`${pillBase} bg-red-100 text-red-700`}>
        {formatLabel(meta.safetyAspect)}
      </span>
      {meta.regulatoryReference && meta.regulatoryReference !== 'N/A' && (
        <span className={`${pillBase} bg-amber-100 text-amber-700`}>
          {meta.regulatoryReference}
        </span>
      )}
      {meta.responsibleParty && (
        <span className={`${pillBase} bg-slate-100 text-slate-700`}>
          {meta.responsibleParty}
        </span>
      )}
    </div>
  );
}
