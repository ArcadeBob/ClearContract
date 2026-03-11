import { Contract, ViewState } from '../types/contract';
import { StatCard } from '../components/StatCard';
import { ContractCard } from '../components/ContractCard';
import {
  FileText,
  AlertTriangle,
  ShieldAlert,
  Clock,
  Plus,
  ArrowRight,
} from 'lucide-react';
interface DashboardProps {
  contracts: Contract[];
  onNavigate: (view: ViewState, id?: string) => void;
}
export function Dashboard({ contracts, onNavigate }: DashboardProps) {
  const totalContracts = contracts.length;
  const totalFindings = contracts.reduce(
    (acc, c) => acc + c.findings.length,
    0
  );
  const criticalFindings = contracts.reduce(
    (acc, c) =>
      acc + c.findings.filter((f) => f.severity === 'Critical').length,
    0
  );
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          label="Contracts Reviewed"
          value={totalContracts}
          icon={FileText}
          color="blue"
          trend="12%"
          trendUp={true}
        />

        <StatCard
          label="Total Findings"
          value={totalFindings}
          icon={AlertTriangle}
          color="amber"
        />

        <StatCard
          label="Critical Risks"
          value={criticalFindings}
          icon={ShieldAlert}
          color="red"
          trend="5%"
          trendUp={false}
        />

        <StatCard
          label="Avg Review Time"
          value="4.2m"
          icon={Clock}
          color="green"
          trend="30s"
          trendUp={true}
        />
      </div>

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
            <button className="w-full flex items-center justify-center space-x-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 py-3 px-4 rounded-lg font-medium transition-colors">
              <FileText className="w-5 h-5" />
              <span>Generate Monthly Report</span>
            </button>
          </div>

          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 text-white">
            <h3 className="font-semibold mb-2">Compliance Update</h3>
            <p className="text-sm text-slate-300 mb-4">
              New California prevailing wage requirements effective Jan 1, 2024.
              AI model updated.
            </p>
            <a
              href="#"
              className="text-sm text-blue-300 hover:text-blue-200 underline"
            >
              Read more
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
