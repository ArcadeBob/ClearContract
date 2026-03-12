import { useState } from 'react';
import { Contract } from '../types/contract';
import { FileText, AlertTriangle, Trash2 } from 'lucide-react';
import { SeverityBadge } from './SeverityBadge';
import { ConfirmDialog } from './ConfirmDialog';

interface ContractCardProps {
  contract: Contract;
  onClick: () => void;
  onDelete?: (id: string) => void;
}
export function ContractCard({ contract, onClick, onDelete }: ContractCardProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const criticalCount = contract.findings.filter(
    (f) => f.severity === 'Critical'
  ).length;
  const highCount = contract.findings.filter(
    (f) => f.severity === 'High'
  ).length;
  return (
    <div
      onClick={onClick}
      className="group bg-white p-4 rounded-lg border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-start space-x-3">
          <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-blue-50 transition-colors">
            <FileText className="w-5 h-5 text-slate-500 group-hover:text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">
              {contract.name}
            </h3>
            <p className="text-sm text-slate-500">
              {contract.client} • {contract.type}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowConfirm(true);
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
              aria-label="Delete contract"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <div className="flex flex-col items-end">
          <span className="text-xs text-slate-400 mb-1">
            {contract.uploadDate}
          </span>
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${contract.status === 'Reviewed' ? 'bg-emerald-100 text-emerald-700' : contract.status === 'Analyzing' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}
          >
            {contract.status}
          </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        <div className="flex space-x-2">
          {criticalCount > 0 && <SeverityBadge severity="Critical" />}
          {highCount > 0 && <SeverityBadge severity="High" />}
          {criticalCount === 0 && highCount === 0 && (
            <span className="text-xs text-slate-500 flex items-center">
              <div className="w-2 h-2 rounded-full bg-emerald-400 mr-1.5" />
              Low Risk
            </span>
          )}
        </div>
        <div className="flex items-center space-x-3">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            contract.riskScore >= 70 ? 'bg-red-100 text-red-700' :
            contract.riskScore >= 40 ? 'bg-amber-100 text-amber-700' :
            'bg-emerald-100 text-emerald-700'
          }`}>
            Risk: {contract.riskScore}/100
          </span>
          <span className="flex items-center text-xs text-slate-500">
            <AlertTriangle className="w-3 h-3 mr-1" />
            {contract.findings.length} findings
          </span>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showConfirm}
        title="Delete Contract"
        message={`Are you sure you want to delete "${contract.name}"? This action cannot be undone.`}
        onConfirm={() => {
          onDelete?.(contract.id);
          setShowConfirm(false);
        }}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}
