import { useState, useEffect } from 'react';
import { Contract, ViewState } from '../types/contract';
import { StatCard } from '../components/StatCard';
import { PatternsCard } from '../components/PatternsCard';
import { ScopeTrendsCard } from '../components/ScopeTrendsCard';
import { ContractCard } from '../components/ContractCard';
import {
  FileText,
  AlertTriangle,
  ShieldAlert,
  Clock,
  Plus,
  ArrowRight,
  FileSearch,
  DollarSign,
  Coins,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatCost, formatTokens } from '../utils/formatCost';
import { DeadlineTimeline } from '../components/DeadlineTimeline';

interface DashboardProps {
  contracts: Contract[];
  onNavigate: (view: ViewState, id?: string) => void;
}
export function Dashboard({ contracts, onNavigate }: DashboardProps) {
  // Count fully reviewed and partial contracts in stats (exclude Analyzing/Error)
  const reviewed = contracts.filter((c) => c.status === 'Reviewed' || c.status === 'Partial');
  const totalContracts = reviewed.length;
  const openFindings = reviewed.reduce(
    (acc, c) => acc + c.findings.filter(f => !f.resolved).length,
    0
  );
  const criticalFindings = reviewed.reduce(
    (acc, c) =>
      acc + c.findings.filter((f) => f.severity === 'Critical').length,
    0
  );
  const avgRiskScore =
    totalContracts > 0
      ? Math.round(
          reviewed.reduce((acc, c) => acc + c.riskScore, 0) / totalContracts
        )
      : 0;
  const recentContracts = [...contracts].sort(
    (a, b) =>
      new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()
  );

  const [portfolioCost, setPortfolioCost] = useState({ totalSpend: 0, totalTokens: 0, contractCount: 0 });

  useEffect(() => {
    let cancelled = false;

    async function loadPortfolioCost() {
      const { data, error } = await supabase
        .from('analysis_usage')
        .select('contract_id, cost_usd, input_tokens, output_tokens, cache_read_tokens, cache_creation_tokens');

      if (cancelled || error || !data) return;

      const byContract = new Map<string, { cost: number; tokens: number }>();
      for (const row of data) {
        const cid = row.contract_id as string;
        const existing = byContract.get(cid) ?? { cost: 0, tokens: 0 };
        existing.cost += Number(row.cost_usd);
        existing.tokens += (row.input_tokens as number) + (row.output_tokens as number) +
          (row.cache_read_tokens as number) + (row.cache_creation_tokens as number);
        byContract.set(cid, existing);
      }

      let totalSpend = 0;
      let totalTokens = 0;
      for (const entry of byContract.values()) {
        totalSpend += entry.cost;
        totalTokens += entry.tokens;
      }

      setPortfolioCost({
        totalSpend,
        totalTokens,
        contractCount: byContract.size,
      });
    }

    loadPortfolioCost();
    return () => { cancelled = true; };
  }, []);

  const avgCostPerContract = portfolioCost.contractCount > 0
    ? portfolioCost.totalSpend / portfolioCost.contractCount
    : 0;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500">Welcome back, Clean Glass Team</p>
      </header>

      {contracts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="p-4 bg-blue-50 rounded-full mb-6">
            <FileSearch className="w-12 h-12 text-blue-500" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            No Contracts Yet
          </h2>
          <p className="text-slate-500 max-w-md mb-8">
            Upload your first contract to get AI-powered risk analysis, finding
            categorization, and date tracking.
          </p>
          <button
            onClick={() => onNavigate('upload')}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-medium transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Upload Your First Contract</span>
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <StatCard
              label="Contracts Reviewed"
              value={totalContracts}
              icon={FileText}
              color="blue"
            />

            <StatCard
              label="Open Findings"
              value={openFindings}
              icon={AlertTriangle}
              color="amber"
            />

            <StatCard
              label="Critical Risks"
              value={criticalFindings}
              icon={ShieldAlert}
              color="red"
            />

            <StatCard
              label="Avg Risk Score"
              value={avgRiskScore}
              icon={Clock}
              color="green"
            />

            <StatCard
              label="Total API Spend"
              value={portfolioCost.totalSpend > 0
                ? `${formatCost(portfolioCost.totalSpend)} (${formatTokens(portfolioCost.totalTokens)} tokens)`
                : '$0.00'}
              icon={DollarSign}
              color="slate"
            />

            <StatCard
              label="Avg Cost / Contract"
              value={avgCostPerContract > 0 ? formatCost(avgCostPerContract) : '$0.00'}
              icon={Coins}
              color="slate"
            />
          </div>

          <PatternsCard contracts={contracts} />
          <ScopeTrendsCard contracts={contracts} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-slate-900">
                  Recent Contracts
                </h2>
                <button
                  onClick={() => onNavigate('contracts')}
                  className="text-sm text-blue-600 font-medium hover:text-blue-700 flex items-center"
                >
                  View All <ArrowRight className="w-4 h-4 ml-1" />
                </button>
              </div>
              <div className="space-y-4">
                {recentContracts.map((contract) => (
                  <ContractCard
                    key={contract.id}
                    contract={contract}
                    onClick={() => onNavigate('review', contract.id)}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-slate-900">
                Quick Actions
              </h2>
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <button
                  onClick={() => onNavigate('upload')}
                  className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  <span>Upload New Contract</span>
                </button>
              </div>

              <DeadlineTimeline contracts={contracts} onNavigate={onNavigate} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
