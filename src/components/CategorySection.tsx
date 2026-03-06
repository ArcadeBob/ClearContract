import React, { useState } from 'react';
import { Category, Finding, Severity } from '../types/contract';
import { SeverityBadge } from './SeverityBadge';
import { FindingCard } from './FindingCard';
import {
  Scale,
  ClipboardList,
  ShieldCheck,
  HardHat,
  Shield,
  Calendar,
  DollarSign,
  Ruler,
  AlertTriangle,
  ChevronDown,
  type LucideIcon,
} from 'lucide-react';
import { AnimatePresence } from 'framer-motion';

const categoryIcons: Record<string, LucideIcon> = {
  'Legal Issues': Scale,
  'Scope of Work': ClipboardList,
  'Contract Compliance': ShieldCheck,
  'Labor Compliance': HardHat,
  'Insurance Requirements': Shield,
  'Important Dates': Calendar,
  'Financial Terms': DollarSign,
  'Technical Standards': Ruler,
  'Risk Assessment': AlertTriangle,
};

const SEVERITY_ORDER: Severity[] = ['Critical', 'High', 'Medium', 'Low', 'Info'];

interface CategorySectionProps {
  category: Category;
  findings: Finding[];
  defaultExpanded?: boolean;
}

export function CategorySection({
  category,
  findings,
  defaultExpanded = true,
}: CategorySectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const Icon = categoryIcons[category] || AlertTriangle;

  const severityCounts = findings.reduce((acc, f) => {
    acc[f.severity] = (acc[f.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

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
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {SEVERITY_ORDER
              .filter(sev => severityCounts[sev])
              .map(sev => (
                <span key={sev} className="flex items-center gap-1">
                  <SeverityBadge severity={sev as Severity} />
                  <span className="text-xs text-slate-500">{severityCounts[sev]}</span>
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
              <FindingCard key={finding.id} finding={finding} index={index} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
