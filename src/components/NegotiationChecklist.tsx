import { Finding } from '../types/contract';
import { SeverityBadge } from './SeverityBadge';
import { ActionPriorityBadge } from './ActionPriorityBadge';
import { CheckCircle2, Circle } from 'lucide-react';
import { motion } from 'framer-motion';

interface NegotiationChecklistProps {
  findings: Finding[];
  onToggleResolved?: (findingId: string) => void;
}

const SECTIONS = [
  {
    key: 'pre-bid',
    label: 'PRE-BID',
    sublabel: 'Address before submitting bid',
    color: 'border-orange-300 bg-orange-50',
  },
  {
    key: 'pre-sign',
    label: 'PRE-SIGN',
    sublabel: 'Negotiate before signing',
    color: 'border-blue-300 bg-blue-50',
  },
  {
    key: 'monitor',
    label: 'MONITOR',
    sublabel: 'Track during project execution',
    color: 'border-slate-300 bg-slate-50',
  },
  {
    key: 'uncategorized',
    label: 'UNCATEGORIZED',
    sublabel: 'Re-analyze to assign timing',
    color: 'border-slate-200 bg-white',
  },
] as const;

export function NegotiationChecklist({
  findings,
  onToggleResolved,
}: NegotiationChecklistProps) {
  const negotiable = findings.filter((f) => f.negotiationPosition);

  if (negotiable.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-slate-200 border-dashed">
        <CheckCircle2 className="w-12 h-12 text-slate-200 mx-auto mb-3" />
        <p className="text-slate-500 font-medium">
          No negotiation positions available
        </p>
        <p className="text-sm text-slate-400 mt-1">
          Findings from contract analysis will appear here when they include
          negotiation recommendations.
        </p>
      </div>
    );
  }

  const grouped: Record<string, Finding[]> = {
    'pre-bid': [],
    'pre-sign': [],
    monitor: [],
    uncategorized: [],
  };

  for (const f of negotiable) {
    const key = f.actionPriority;
    (grouped[key] ?? grouped['uncategorized']).push(f);
  }

  return (
    <div className="space-y-6">
      {SECTIONS.map((section) => {
        const items = grouped[section.key];
        if (!items || items.length === 0) return null;

        return (
          <div key={section.key}>
            <div
              className={`flex items-center justify-between px-4 py-2 rounded-lg border ${section.color} mb-3`}
            >
              <div>
                <span className="text-sm font-bold text-slate-800">
                  {section.label}
                </span>
                <span className="text-xs text-slate-500 ml-2">
                  {section.sublabel}
                </span>
              </div>
              <span className="text-xs font-medium text-slate-500">
                {items.length} {items.length === 1 ? 'item' : 'items'}
              </span>
            </div>

            <div className="space-y-3">
              {items.map((finding, index) => (
                <motion.div
                  key={finding.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.2 }}
                  className="bg-white rounded-lg border border-slate-200 p-4"
                >
                  <div className="flex items-start gap-3">
                    {/* Resolved toggle */}
                    <button
                      onClick={() => onToggleResolved?.(finding.id)}
                      className="mt-0.5 shrink-0"
                      title={
                        finding.resolved
                          ? 'Mark as unresolved'
                          : 'Mark as resolved'
                      }
                    >
                      {finding.resolved ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-300 hover:text-slate-400 transition-colors" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      {/* Title row with badges */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <SeverityBadge
                          severity={finding.severity}
                          downgradedFrom={finding.downgradedFrom}
                        />
                        {finding.actionPriority && (
                          <ActionPriorityBadge
                            priority={finding.actionPriority}
                          />
                        )}
                        <span
                          className={`text-sm font-medium text-slate-900 ${
                            finding.resolved
                              ? 'opacity-60 line-through'
                              : ''
                          }`}
                        >
                          {finding.title}
                        </span>
                      </div>

                      {/* Negotiation position text */}
                      <p className="text-sm text-slate-700 mt-2 leading-relaxed">
                        {finding.negotiationPosition}
                      </p>

                      {/* Clause reference */}
                      {finding.clauseReference && (
                        <p className="text-xs text-slate-400 mt-1.5">
                          Ref: {finding.clauseReference}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
