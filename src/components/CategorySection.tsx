import { useState } from 'react';
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

interface CategorySectionProps {
  category: Category;
  findings: Finding[];
  defaultExpanded?: boolean;
  onToggleResolved?: (findingId: string) => void;
  onUpdateNote?: (findingId: string, note: string | undefined) => void;
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
          <AnimatePresence mode="popLayout">
            {findings.map((finding, index) => (
              <FindingCard key={finding.id} finding={finding} index={index} onToggleResolved={onToggleResolved} onUpdateNote={onUpdateNote} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
