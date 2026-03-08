import { ScopeMeta, ComplianceChecklistItem } from '../types/contract';

interface ScopeMetaBadgeProps {
  meta: ScopeMeta;
}

const pillBase = 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mr-2';

function formatLabel(value: string): string {
  return value.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function ScopeMetaBadge({ meta }: ScopeMetaBadgeProps) {
  if (meta.passType === 'scope-of-work') {
    const scopeColor =
      meta.scopeItemType === 'exclusion' || meta.scopeItemType === 'gap'
        ? 'bg-red-100 text-red-700'
        : meta.scopeItemType === 'ambiguity'
          ? 'bg-amber-100 text-amber-700'
          : meta.scopeItemType === 'inclusion' || meta.scopeItemType === 'scope-rule'
            ? 'bg-green-100 text-green-700'
            : meta.scopeItemType === 'specification-reference'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-slate-100 text-slate-600';

    return (
      <div className="flex flex-wrap items-center gap-1 mt-2">
        <span className={`${pillBase} ${scopeColor}`}>
          {formatLabel(meta.scopeItemType)}
        </span>
        {meta.specificationReference && meta.specificationReference !== 'N/A' && (
          <span className={`${pillBase} bg-slate-100 text-slate-600`}>
            {meta.specificationReference}
          </span>
        )}
        {meta.affectedTrade && meta.affectedTrade !== 'glazing' && (
          <span className={`${pillBase} bg-purple-100 text-purple-700`}>
            {meta.affectedTrade}
          </span>
        )}
      </div>
    );
  }

  if (meta.passType === 'dates-deadlines') {
    const periodColor =
      meta.periodType === 'notice-period' || meta.periodType === 'cure-period'
        ? 'bg-amber-100 text-amber-700'
        : meta.periodType === 'payment-term'
          ? 'bg-green-100 text-green-700'
          : meta.periodType === 'project-milestone' || meta.periodType === 'submittal-deadline'
            ? 'bg-blue-100 text-blue-700'
            : meta.periodType === 'warranty-period' || meta.periodType === 'closeout-deadline'
              ? 'bg-slate-100 text-slate-600'
              : 'bg-slate-100 text-slate-600';

    return (
      <>
        <div className="flex flex-wrap items-center gap-1 mt-2">
          <span className={`${pillBase} ${periodColor}`}>
            {formatLabel(meta.periodType)}
          </span>
          {meta.duration && meta.duration !== 'N/A' && (
            <span className={`${pillBase} bg-slate-100 text-slate-700`}>
              {meta.duration}
            </span>
          )}
        </div>
        {meta.triggerEvent && meta.triggerEvent !== 'N/A' && (
          <span className="text-xs text-slate-500 italic">
            Triggered by: {meta.triggerEvent}
          </span>
        )}
      </>
    );
  }

  if (meta.passType === 'verbiage') {
    const issueColor =
      meta.issueType === 'one-sided-term' || meta.issueType === 'overreach-clause'
        ? 'bg-red-100 text-red-700'
        : meta.issueType === 'missing-protection'
          ? 'bg-amber-100 text-amber-700'
          : meta.issueType === 'ambiguous-language' || meta.issueType === 'undefined-term'
            ? 'bg-yellow-100 text-yellow-700'
            : 'bg-slate-100 text-slate-600';

    const partyPill =
      meta.affectedParty === 'subcontractor'
        ? { color: 'bg-red-100 text-red-700', label: 'Affects Sub' }
        : meta.affectedParty === 'general-contractor'
          ? { color: 'bg-blue-100 text-blue-700', label: 'Affects GC' }
          : meta.affectedParty === 'both'
            ? { color: 'bg-purple-100 text-purple-700', label: 'Affects Both' }
            : null;

    return (
      <>
        <div className="flex flex-wrap items-center gap-1 mt-2">
          <span className={`${pillBase} ${issueColor}`}>
            {formatLabel(meta.issueType)}
          </span>
          {partyPill && (
            <span className={`${pillBase} ${partyPill.color}`}>
              {partyPill.label}
            </span>
          )}
        </div>
        {meta.suggestedClarification && meta.suggestedClarification !== 'N/A' && (
          <div className="mt-1 text-xs text-slate-600 italic">
            Suggested: {meta.suggestedClarification}
          </div>
        )}
      </>
    );
  }

  if (meta.passType === 'labor-compliance') {
    const reqColor =
      meta.requirementType === 'prevailing-wage' || meta.requirementType === 'certified-payroll'
        ? 'bg-red-100 text-red-700'
        : meta.requirementType === 'safety-training' || meta.requirementType === 'licensing'
          ? 'bg-amber-100 text-amber-700'
          : 'bg-slate-100 text-slate-600';

    return (
      <>
        <div className="flex flex-wrap items-center gap-1 mt-2">
          <span className={`${pillBase} ${reqColor}`}>
            {formatLabel(meta.requirementType)}
          </span>
          {meta.responsibleParty && meta.responsibleParty !== 'Not specified' && (
            <span className={`${pillBase} bg-blue-100 text-blue-700`}>
              {meta.responsibleParty}
            </span>
          )}
          {meta.deadline && meta.deadline !== 'Not specified' && meta.deadline !== 'N/A' && (
            <span className={`${pillBase} bg-amber-100 text-amber-700`}>
              Due: {meta.deadline}
            </span>
          )}
        </div>
        {meta.checklistItems && meta.checklistItems.length > 0 && (
          <div className="mt-2 border-t border-slate-100 pt-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Compliance Checklist</p>
            <ul className="space-y-1">
              {meta.checklistItems.map((item: ComplianceChecklistItem, i: number) => (
                <li key={i} className="flex items-start gap-2 text-xs">
                  <span className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                    item.status === 'required' ? 'bg-red-400' :
                    item.status === 'conditional' ? 'bg-amber-400' : 'bg-green-400'
                  }`} />
                  <div>
                    <span className="text-slate-700">{item.item}</span>
                    {item.deadline && item.deadline !== 'Not specified' && (
                      <span className="text-slate-400 ml-1">- Due: {item.deadline}</span>
                    )}
                    {item.responsibleParty && item.responsibleParty !== 'Not specified' && (
                      <span className="text-slate-400 ml-1">({item.responsibleParty})</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </>
    );
  }

  return null;
}
