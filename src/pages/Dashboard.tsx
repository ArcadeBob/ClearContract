import { useMemo } from 'react';
import { Contract, ViewState } from '../types/contract';
import { StatCard } from '../components/StatCard';
import { PatternsCard } from '../components/PatternsCard';
import { ContractCard } from '../components/ContractCard';
import {
  FileText,
  AlertTriangle,
  ShieldAlert,
  Clock,
  Plus,
  ArrowRight,
  FileSearch,
  Calendar,
} from 'lucide-react';

function getDateUrgency(dateStr: string): { label: string; colorClass: string; isPast: boolean } {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  const diffMs = target.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / 86400000);

  if (diffDays < 0) {
    return { label: `${Math.abs(diffDays)}d ago`, colorClass: 'text-slate-400', isPast: true };
  }
  if (diffDays === 0) {
    return { label: 'Today', colorClass: 'text-red-600', isPast: false };
  }
  if (diffDays <= 7) {
    return { label: `${diffDays}d away`, colorClass: 'text-red-600', isPast: false };
  }
  if (diffDays <= 30) {
    return { label: `${diffDays}d away`, colorClass: 'text-amber-600', isPast: false };
  }
  return { label: `${diffDays}d away`, colorClass: 'text-emerald-600', isPast: false };
}
interface DashboardProps {
  contracts: Contract[];
  onNavigate: (view: ViewState, id?: string) => void;
}
export function Dashboard({ contracts, onNavigate }: DashboardProps) {
  // Only count fully reviewed contracts in stats (exclude Analyzing/Error)
  const reviewed = contracts.filter((c) => c.status === 'Reviewed');
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
  const upcomingDates = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return contracts
      .filter(c => c.status === 'Reviewed')
      .flatMap(c => c.dates.map(d => ({ ...d, contractId: c.id, contractName: c.name })))
      .filter(d => {
        const target = new Date(d.date);
        target.setHours(0, 0, 0, 0);
        return target.getTime() >= now.getTime() - 86400000;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 5);
  }, [contracts]);

  const recentContracts = [...contracts].sort(
    (a, b) =>
      new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()
  );
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
          </div>

          <PatternsCard contracts={contracts} />

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
                <button
                  disabled
                  title="Coming soon"
                  className="w-full flex items-center justify-center space-x-2 bg-white border border-slate-200 text-slate-400 py-3 px-4 rounded-lg font-medium cursor-not-allowed"
                >
                  <FileText className="w-5 h-5" />
                  <span>Generate Monthly Report</span>
                </button>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-slate-500" />
                  Upcoming Deadlines
                </h3>
                {upcomingDates.length === 0 ? (
                  <div className="text-center py-6">
                    <Calendar className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">No upcoming deadlines</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcomingDates.map((d, i) => {
                      const urgency = getDateUrgency(d.date);
                      return (
                        <button
                          key={`${d.contractId}-${d.label}-${i}`}
                          onClick={() => onNavigate('review', d.contractId)}
                          className="w-full text-left p-3 rounded-lg hover:bg-slate-50 transition-colors border border-slate-100"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-slate-900 truncate mr-2">{d.label}</span>
                            <span className={`text-xs font-medium whitespace-nowrap ${urgency.colorClass}`}>
                              {urgency.label}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-xs text-slate-500 truncate mr-2">{d.contractName}</span>
                            <span className={`text-xs ${urgency.isPast ? 'text-slate-400' : 'text-slate-500'}`}>
                              {new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
