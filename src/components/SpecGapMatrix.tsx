import { useState } from 'react';
import { TableProperties } from 'lucide-react';
import type { Finding, ScopeMeta } from '../types/contract';
import { SeverityBadge } from './SeverityBadge';

interface SpecGapMatrixProps {
  findings: Finding[];
}

function getSpecMeta(f: Finding): Extract<ScopeMeta, { passType: 'spec-reconciliation' }> | null {
  const meta = f.scopeMeta;
  if (meta && 'passType' in meta && meta.passType === 'spec-reconciliation') {
    return meta as Extract<ScopeMeta, { passType: 'spec-reconciliation' }>;
  }
  return null;
}

function gapTypeStyle(gapType: string): string {
  const lower = gapType.toLowerCase();
  if (lower.includes('infer')) return 'bg-blue-50 text-blue-700';
  return 'bg-amber-50 text-amber-700';
}

export function SpecGapMatrix({ findings }: SpecGapMatrixProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
          <TableProperties className="w-4 h-4" />
        </div>
        <h3 className="text-sm font-semibold text-slate-900">Spec Gap Matrix</h3>
      </div>

      {findings.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm font-semibold text-slate-700 mb-1">No Spec Gaps Detected</p>
          <p className="text-sm text-slate-500">
            No specification reconciliation gaps were identified for this contract.
          </p>
        </div>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              <th className="text-left p-2">Spec Reference</th>
              <th className="text-left p-2">Expected Deliverable</th>
              <th className="text-left p-2">Gap Type</th>
              <th className="text-left p-2">Severity</th>
            </tr>
          </thead>
          <tbody>
            {findings.map((f) => {
              const meta = getSpecMeta(f);
              const isExpanded = expandedId === f.id;

              return (
                <tr key={f.id} className="group">
                  <td colSpan={4} className="p-0">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : f.id)}
                      className="w-full text-left grid grid-cols-4 p-2 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <span className="text-slate-700">{meta?.specSection ?? '---'}</span>
                      <span className="text-slate-700">{meta?.typicalDeliverable ?? '---'}</span>
                      <span>
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${gapTypeStyle(meta?.gapType ?? '')}`}>
                          {meta?.gapType ?? '---'}
                        </span>
                      </span>
                      <span>
                        <SeverityBadge severity={f.severity} />
                      </span>
                    </button>
                    {isExpanded && (
                      <div className="px-4 pb-3 bg-slate-50 border-t border-slate-100">
                        <p className="text-sm font-medium text-slate-800 mt-2">{f.title}</p>
                        {f.clauseText && (
                          <p className="text-xs text-slate-500 mt-1 italic">
                            &ldquo;{f.clauseText}&rdquo;
                          </p>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
