import { useState } from 'react';
import { DollarSign, Zap, TrendingUp, ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { AnalysisUsageRow } from '../hooks/useAnalysisUsage';
import { formatTokens, formatCost, formatDuration } from '../utils/formatCost';

const PASS_ORDER = [
  'risk-overview',
  'dates-deadlines',
  'scope-extraction',
  'legal-indemnification',
  'legal-payment-contingency',
  'legal-liquidated-damages',
  'legal-retainage',
  'legal-insurance',
  'legal-termination',
  'legal-flow-down',
  'legal-no-damage-delay',
  'legal-lien-rights',
  'legal-dispute-resolution',
  'legal-change-order',
  'verbiage-analysis',
  'labor-compliance',
  'spec-reconciliation',
  'exclusion-stress-test',
  'synthesis',
];

const PASS_LABELS: Record<string, string> = {
  'risk-overview': 'Risk Overview',
  'dates-deadlines': 'Dates & Deadlines',
  'scope-extraction': 'Scope of Work',
  'legal-indemnification': 'Indemnification',
  'legal-payment-contingency': 'Payment Contingency',
  'legal-liquidated-damages': 'Liquidated Damages',
  'legal-retainage': 'Retainage',
  'legal-insurance': 'Insurance',
  'legal-termination': 'Termination',
  'legal-flow-down': 'Flow-Down',
  'legal-no-damage-delay': 'No Damage for Delay',
  'legal-lien-rights': 'Lien Rights',
  'legal-dispute-resolution': 'Dispute Resolution',
  'legal-change-order': 'Change Order',
  'verbiage-analysis': 'Verbiage Analysis',
  'labor-compliance': 'Labor Compliance',
  'spec-reconciliation': 'Spec Reconciliation',
  'exclusion-stress-test': 'Exclusion Stress-Test',
  'synthesis': 'Synthesis',
};

function getPassLabel(name: string): string {
  return PASS_LABELS[name] ?? name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function computeSummary(rows: AnalysisUsageRow[]) {
  let totalCost = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCacheRead = 0;
  let totalCacheCreation = 0;
  let totalDurationMs = 0;

  for (const r of rows) {
    totalCost += Number(r.costUsd);
    totalInputTokens += r.inputTokens;
    totalOutputTokens += r.outputTokens;
    totalCacheRead += r.cacheReadTokens;
    totalCacheCreation += r.cacheCreationTokens;
    totalDurationMs += r.durationMs;
  }

  const totalTokens = totalInputTokens + totalOutputTokens + totalCacheRead + totalCacheCreation;
  const cacheHitDenominator = totalCacheRead + totalInputTokens;
  const cacheHitRate = cacheHitDenominator > 0
    ? (totalCacheRead / cacheHitDenominator) * 100
    : 0;

  return {
    totalCost,
    totalInputTokens,
    totalOutputTokens,
    totalCacheRead,
    totalCacheCreation,
    totalTokens,
    totalDurationMs,
    cacheHitRate,
  };
}

function sortByPassOrder(rows: AnalysisUsageRow[]): AnalysisUsageRow[] {
  return [...rows].sort((a, b) => {
    const ai = PASS_ORDER.indexOf(a.passName);
    const bi = PASS_ORDER.indexOf(b.passName);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });
}

function computeRowCacheHit(row: AnalysisUsageRow): number {
  const denom = row.cacheReadTokens + row.inputTokens;
  return denom > 0 ? (row.cacheReadTokens / denom) * 100 : 0;
}

interface CostSummaryBarProps {
  rows: AnalysisUsageRow[];
  isLoading: boolean;
}

export function CostSummaryBar({ rows, isLoading }: CostSummaryBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-4 animate-pulse">
        <div className="flex items-center gap-6">
          <div className="h-4 w-20 bg-slate-200 rounded" />
          <div className="h-4 w-24 bg-slate-200 rounded" />
          <div className="h-4 w-16 bg-slate-200 rounded" />
        </div>
      </div>
    );
  }

  if (rows.length === 0) {
    return null;
  }

  const summary = computeSummary(rows);
  const sortedRows = sortByPassOrder(rows);

  return (
    <div className="bg-white rounded-lg border border-slate-200">
      {/* Collapsed summary */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-sm">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold text-slate-900">{formatCost(summary.totalCost)}</span>
            <span className="text-slate-500">Total Cost</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Zap className="w-4 h-4 text-amber-500" />
            <span className="font-semibold text-slate-900">{formatTokens(summary.totalTokens)}</span>
            <span className="text-slate-500">Total Tokens</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            <span className="font-semibold text-slate-900">{summary.cacheHitRate.toFixed(0)}%</span>
            <span className="text-slate-500">Cache Hit Rate</span>
          </div>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          View per-pass detail
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {/* Expanded per-pass table */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-slate-200 px-4 pb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500">
                    <th className="py-2 pr-4 font-medium">Pass Name</th>
                    <th className="py-2 pr-4 font-medium">Tokens (In/Out)</th>
                    <th className="py-2 pr-4 font-medium">Cache Hit %</th>
                    <th className="py-2 pr-4 font-medium">Cost</th>
                    <th className="py-2 font-medium">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {sortedRows.map((row) => (
                    <tr key={row.id} className="text-slate-700">
                      <td className="py-2 pr-4">{getPassLabel(row.passName)}</td>
                      <td className="py-2 pr-4">
                        {formatTokens(row.inputTokens)} / {formatTokens(row.outputTokens)}
                      </td>
                      <td className="py-2 pr-4">{computeRowCacheHit(row).toFixed(0)}%</td>
                      <td className="py-2 pr-4">{formatCost(Number(row.costUsd))}</td>
                      <td className="py-2">{formatDuration(row.durationMs)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-semibold bg-slate-50 text-slate-900">
                    <td className="py-2 pr-4">Total</td>
                    <td className="py-2 pr-4">
                      {formatTokens(summary.totalInputTokens)} / {formatTokens(summary.totalOutputTokens)}
                    </td>
                    <td className="py-2 pr-4">{summary.cacheHitRate.toFixed(0)}%</td>
                    <td className="py-2 pr-4">{formatCost(summary.totalCost)}</td>
                    <td className="py-2">{formatDuration(summary.totalDurationMs)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
