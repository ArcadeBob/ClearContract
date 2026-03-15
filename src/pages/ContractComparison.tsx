import { useMemo } from 'react';
import { Contract, Category, Finding } from '../types/contract';
import { ChevronLeft, ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { SeverityBadge } from '../components/SeverityBadge';
import { motion } from 'framer-motion';

interface ContractComparisonProps {
  contractA: Contract;
  contractB: Contract;
  onBack: () => void;
}

const CATEGORY_ORDER: Category[] = [
  'Legal Issues',
  'Financial Terms',
  'Insurance Requirements',
  'Scope of Work',
  'Contract Compliance',
  'Labor Compliance',
  'Important Dates',
  'Technical Standards',
  'Risk Assessment',
  'Compound Risk',
];

function RiskScoreBadge({ score }: { score: number }) {
  const colorClass =
    score >= 70
      ? 'bg-red-100 text-red-700 border-red-200'
      : score >= 40
        ? 'bg-amber-100 text-amber-700 border-amber-200'
        : 'bg-emerald-100 text-emerald-700 border-emerald-200';
  return (
    <span className={`text-2xl font-bold px-4 py-2 rounded-xl border ${colorClass}`}>
      {score}
    </span>
  );
}

function CompactFinding({ finding }: { finding: Finding }) {
  return (
    <div className="flex items-start gap-2 p-3 bg-slate-50 rounded-lg border border-slate-100">
      <SeverityBadge severity={finding.severity} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-800 leading-snug">{finding.title}</p>
        {finding.clauseReference && (
          <p className="text-xs text-slate-400 mt-0.5">{finding.clauseReference}</p>
        )}
      </div>
    </div>
  );
}

export function ContractComparison({ contractA, contractB, onBack }: ContractComparisonProps) {
  const delta = contractB.riskScore - contractA.riskScore;

  const comparisonGroups = useMemo(() => {
    const allCategories = new Set<Category>([
      ...contractA.findings.map(f => f.category),
      ...contractB.findings.map(f => f.category),
    ]);
    return CATEGORY_ORDER
      .filter(cat => allCategories.has(cat))
      .map(category => ({
        category,
        findingsA: contractA.findings.filter(f => f.category === category),
        findingsB: contractB.findings.filter(f => f.category === category),
      }));
  }, [contractA, contractB]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-8 py-6 shrink-0">
        <button
          onClick={onBack}
          className="flex items-center text-sm text-slate-500 hover:text-slate-700 mb-4 transition-colors"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to All Contracts
        </button>
        <h1 className="text-2xl font-bold text-slate-900">Contract Comparison</h1>
      </header>

      <div className="flex-1 overflow-auto bg-slate-50 p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Risk Score Delta */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl border border-slate-200 p-6"
          >
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Risk Score Comparison</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              {/* Contract A */}
              <div className="text-center">
                <p className="text-sm font-medium text-slate-600 mb-2 truncate" title={contractA.name}>
                  {contractA.name}
                </p>
                <RiskScoreBadge score={contractA.riskScore} />
                <p className="text-xs text-slate-400 mt-1">/100</p>
              </div>

              {/* Delta */}
              <div className="flex flex-col items-center justify-center">
                {delta > 0 ? (
                  <ArrowUp className="w-6 h-6 text-red-500" />
                ) : delta < 0 ? (
                  <ArrowDown className="w-6 h-6 text-emerald-500" />
                ) : (
                  <Minus className="w-6 h-6 text-slate-400" />
                )}
                <span className={`text-lg font-bold mt-1 ${
                  delta > 0 ? 'text-red-600' : delta < 0 ? 'text-emerald-600' : 'text-slate-500'
                }`}>
                  {delta > 0 ? '+' : ''}{delta}
                </span>
                <span className="text-xs text-slate-400">delta</span>
              </div>

              {/* Contract B */}
              <div className="text-center">
                <p className="text-sm font-medium text-slate-600 mb-2 truncate" title={contractB.name}>
                  {contractB.name}
                </p>
                <RiskScoreBadge score={contractB.riskScore} />
                <p className="text-xs text-slate-400 mt-1">/100</p>
              </div>
            </div>
          </motion.div>

          {/* Category-Grouped Findings */}
          {comparisonGroups.map((group, index) => (
            <motion.div
              key={group.category}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.05, 0.4) }}
              className="bg-white rounded-xl border border-slate-200 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-slate-800">{group.category}</h3>
                <span className="text-xs text-slate-400">
                  {group.findingsA.length} vs {group.findingsB.length}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Contract A findings */}
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-2 truncate" title={contractA.name}>
                    {contractA.name}
                  </p>
                  {group.findingsA.length > 0 ? (
                    <div className="space-y-2">
                      {group.findingsA.map(f => (
                        <CompactFinding key={f.id} finding={f} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 italic p-3 bg-slate-50 rounded-lg">No findings</p>
                  )}
                </div>

                {/* Contract B findings */}
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-2 truncate" title={contractB.name}>
                    {contractB.name}
                  </p>
                  {group.findingsB.length > 0 ? (
                    <div className="space-y-2">
                      {group.findingsB.map(f => (
                        <CompactFinding key={f.id} finding={f} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 italic p-3 bg-slate-50 rounded-lg">No findings</p>
                  )}
                </div>
              </div>
            </motion.div>
          ))}

          {comparisonGroups.length === 0 && (
            <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
              <p className="text-slate-500 font-medium">No findings to compare</p>
              <p className="text-slate-400 text-sm mt-1">
                Neither contract has any findings yet.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
