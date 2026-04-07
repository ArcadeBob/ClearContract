import { GitCompare } from 'lucide-react';
import type { Finding, ScopeMeta } from '../types/contract';
import { SeverityBadge } from './SeverityBadge';

interface BidContractDiffProps {
  findings: Finding[];
  hasBid: boolean;
}

type BidReconMeta = Extract<ScopeMeta, { passType: 'bid-reconciliation' }>;

const SECTION_LABELS: Record<string, string> = {
  'exclusion-parity': 'Exclusion Parity',
  'quantity-delta': 'Quantity Deltas',
  'unbid-scope': 'Unbid Scope',
};

function getBidMeta(f: Finding): BidReconMeta | null {
  const meta = f.scopeMeta;
  if (meta && 'passType' in meta && meta.passType === 'bid-reconciliation') {
    return meta as BidReconMeta;
  }
  return null;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + '\u2026';
}

export function BidContractDiff({ findings, hasBid }: BidContractDiffProps) {
  if (!hasBid) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
            <GitCompare className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900">Bid / Contract Diff</h3>
        </div>
        <div className="text-center py-8">
          <p className="text-sm font-semibold text-slate-700 mb-1">No Bid Document Attached</p>
          <p className="text-sm text-slate-500">
            Upload a bid or estimate alongside the contract to see exclusion parity, quantity deltas, and unbid scope analysis.
          </p>
        </div>
      </div>
    );
  }

  // Group findings by reconciliationType
  const groups = new Map<string, Array<{ finding: Finding; meta: BidReconMeta }>>();
  for (const f of findings) {
    const meta = getBidMeta(f);
    if (!meta) continue;
    const key = meta.reconciliationType;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push({ finding: f, meta });
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
          <GitCompare className="w-4 h-4" />
        </div>
        <h3 className="text-sm font-semibold text-slate-900">Bid / Contract Diff</h3>
      </div>

      {findings.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-4">
          No bid reconciliation gaps found. Bid and contract scope appear aligned.
        </p>
      ) : (
        <div className="space-y-6">
          {(['exclusion-parity', 'quantity-delta', 'unbid-scope'] as const).map((type) => {
            const items = groups.get(type);
            if (!items || items.length === 0) return null;

            return (
              <div key={type}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {SECTION_LABELS[type]}
                  </span>
                  <span className="text-xs text-slate-400">({items.length} {items.length === 1 ? 'item' : 'items'})</span>
                </div>
                <div className="space-y-4">
                  {items.map(({ finding, meta }) => (
                    <div key={finding.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-800">{finding.title}</span>
                        <SeverityBadge severity={finding.severity} />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="border-l-2 border-slate-300 pl-3">
                          <span className="text-xs text-slate-400 block mb-0.5">Contract</span>
                          {meta.contractQuote ? (
                            <p className="text-sm text-slate-700">&ldquo;{meta.contractQuote}&rdquo;</p>
                          ) : (
                            <p className="text-sm text-slate-400 italic">Not addressed in contract</p>
                          )}
                        </div>
                        <div className="border-l-2 border-emerald-300 pl-3">
                          <span className="text-xs text-slate-400 block mb-0.5">Bid</span>
                          {meta.bidQuote ? (
                            <p className="text-sm text-slate-700">&ldquo;{meta.bidQuote}&rdquo;</p>
                          ) : (
                            <p className="text-sm text-slate-400 italic">Not addressed in bid</p>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-slate-500">
                        {truncate(meta.directionOfRisk, 60)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
