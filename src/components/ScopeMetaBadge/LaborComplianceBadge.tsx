import { ScopeMeta, ComplianceChecklistItem } from '../../types/contract';
import { pillBase, formatLabel } from './shared';

type LaborComplianceMeta = Extract<ScopeMeta, { passType: 'labor-compliance' }>;

interface LaborComplianceBadgeProps {
  meta: LaborComplianceMeta;
}

export function LaborComplianceBadge({ meta }: LaborComplianceBadgeProps) {
  const reqColor =
    meta.requirementType === 'prevailing-wage' ||
    meta.requirementType === 'certified-payroll'
      ? 'bg-red-100 text-red-700'
      : meta.requirementType === 'safety-training' ||
          meta.requirementType === 'licensing'
        ? 'bg-amber-100 text-amber-700'
        : 'bg-slate-100 text-slate-600';

  return (
    <>
      <div className="flex flex-wrap items-center gap-1 mt-2">
        <span className={`${pillBase} ${reqColor}`}>
          {formatLabel(meta.requirementType)}
        </span>
        {meta.responsibleParty &&
          meta.responsibleParty !== 'Not specified' && (
            <span className={`${pillBase} bg-blue-100 text-blue-700`}>
              {meta.responsibleParty}
            </span>
          )}
        {meta.deadline &&
          meta.deadline !== 'Not specified' &&
          meta.deadline !== 'N/A' && (
            <span className={`${pillBase} bg-amber-100 text-amber-700`}>
              Due: {meta.deadline}
            </span>
          )}
      </div>
      {meta.checklistItems && meta.checklistItems.length > 0 && (
        <div className="mt-2 border-t border-slate-100 pt-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
            Compliance Checklist
          </p>
          <ul className="space-y-1">
            {meta.checklistItems.map(
              (item: ComplianceChecklistItem, i: number) => (
                <li key={i} className="flex items-start gap-2 text-xs">
                  <span
                    className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                      item.status === 'required'
                        ? 'bg-red-400'
                        : item.status === 'conditional'
                          ? 'bg-amber-400'
                          : 'bg-green-400'
                    }`}
                  />
                  <div>
                    <span className="text-slate-700">{item.item}</span>
                    {item.deadline && item.deadline !== 'Not specified' && (
                      <span className="text-slate-400 ml-1">
                        - Due: {item.deadline}
                      </span>
                    )}
                    {item.responsibleParty &&
                      item.responsibleParty !== 'Not specified' && (
                        <span className="text-slate-400 ml-1">
                          ({item.responsibleParty})
                        </span>
                      )}
                  </div>
                </li>
              )
            )}
          </ul>
        </div>
      )}
    </>
  );
}
