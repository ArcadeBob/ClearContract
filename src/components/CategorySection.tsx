import { useState, useMemo } from 'react';
import { Category, Finding, Severity } from '../types/contract';
import { SeverityBadge } from './SeverityBadge';
import { FindingCard } from './FindingCard';
import { AlertTriangle, CheckCircle2, ChevronDown } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { categoryIcons } from '../utils/categoryIcons';

const SEVERITY_ORDER: Severity[] = [
  'Critical',
  'High',
  'Medium',
  'Low',
  'Info',
];

const SCOPE_SUBCATEGORIES: Record<string, string> = {
  'scope-extraction': 'Scope Items',
  'spec-reconciliation': 'Spec Gaps',
  'exclusion-stress-test': 'Exclusion Challenges',
  'bid-reconciliation': 'Bid vs Contract',
  'schedule-conflict': 'Schedule Conflicts',
};

interface CategorySectionProps {
  category: Category;
  findings: Finding[];
  defaultExpanded?: boolean;
  onToggleResolved?: (findingId: string) => void;
  onUpdateNote?: (findingId: string, note: string | undefined) => void;
}

function SubcategoryGroup({
  label,
  findings,
  onToggleResolved,
  onUpdateNote,
}: {
  label: string;
  findings: Finding[];
  onToggleResolved?: (findingId: string) => void;
  onUpdateNote?: (findingId: string, note: string | undefined) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 mb-2 cursor-pointer border-l-2 border-violet-300 pl-3"
      >
        <ChevronDown
          className={`w-3 h-3 text-slate-400 transition-transform ${
            expanded ? 'rotate-180' : ''
          }`}
        />
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          {label}
        </span>
        <span className="text-xs text-slate-400">
          ({findings.length} {findings.length === 1 ? 'finding' : 'findings'})
        </span>
      </button>
      {expanded && (
        <div className="space-y-4 ml-2">
          <AnimatePresence mode="popLayout">
            {findings.map((finding, index) => (
              <FindingCard
                key={finding.id}
                finding={finding}
                index={index}
                onToggleResolved={onToggleResolved}
                onUpdateNote={onUpdateNote}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

export function CategorySection({
  category,
  findings,
  defaultExpanded = true,
  onToggleResolved,
  onUpdateNote,
}: CategorySectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const Icon = categoryIcons[category] || AlertTriangle;

  const subcategoryGroups = useMemo(() => {
    if (category !== 'Scope of Work') return null;
    const groups = new Map<string, Finding[]>();
    for (const f of findings) {
      const key = f.sourcePass && SCOPE_SUBCATEGORIES[f.sourcePass] ? f.sourcePass : 'general';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(f);
    }
    return groups.size > 1 ? groups : null;
  }, [category, findings]);

  const severityCounts = findings.reduce(
    (acc, f) => {
      acc[f.severity] = (acc[f.severity] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const resolvedInCategory = findings.filter((f) => f.resolved).length;
  const allResolved = resolvedInCategory > 0 && resolvedInCategory === findings.length;

  return (
    <div id={`category-${category.replace(/\s+/g, '-').toLowerCase()}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 bg-white rounded-lg border border-slate-200 mb-2 cursor-pointer hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-slate-100 rounded-md text-slate-600">
            <Icon className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900">{category}</h3>
          <span className="text-xs text-slate-500">
            ({findings.length} {findings.length === 1 ? 'finding' : 'findings'})
          </span>
          {resolvedInCategory > 0 && (
            <span className="text-xs text-emerald-600">
              ({resolvedInCategory} of {findings.length} resolved)
            </span>
          )}
          {allResolved && (
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {SEVERITY_ORDER.filter((sev) => severityCounts[sev]).map((sev) => (
              <span key={sev} className="flex items-center gap-1">
                <SeverityBadge severity={sev as Severity} />
                <span className="text-xs text-slate-500">
                  {severityCounts[sev]}
                </span>
              </span>
            ))}
          </div>
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform ${
              expanded ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {expanded && (
        <div className="space-y-4 ml-2 mb-6">
          {subcategoryGroups ? (
            Array.from(subcategoryGroups.entries()).map(([key, groupFindings]) => (
              <SubcategoryGroup
                key={key}
                label={SCOPE_SUBCATEGORIES[key] || 'General'}
                findings={groupFindings}
                onToggleResolved={onToggleResolved}
                onUpdateNote={onUpdateNote}
              />
            ))
          ) : (
            <AnimatePresence mode="popLayout">
              {findings.map((finding, index) => (
                <FindingCard key={finding.id} finding={finding} index={index} onToggleResolved={onToggleResolved} onUpdateNote={onUpdateNote} />
              ))}
            </AnimatePresence>
          )}
        </div>
      )}
    </div>
  );
}
