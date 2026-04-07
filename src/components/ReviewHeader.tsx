import { useState } from 'react';
import { Contract, Finding, SEVERITIES, CATEGORIES } from '../types/contract';
import type { LifecycleStatus } from '../types/contract';
import { LifecycleSelect } from './LifecycleSelect';
import { useInlineEdit } from '../hooks/useInlineEdit';
import { useToast } from '../hooks/useToast';
import { exportContractCsv, downloadCsv, sanitizeFilename } from '../utils/exportContractCsv';
import { exportContractPdf } from '../utils/exportContractPdf';
import { ConfirmDialog } from './ConfirmDialog';
import { ReAnalyzeModal, type ReAnalyzeResult } from './ReAnalyzeModal';
import { FilterState } from '../hooks/useContractFiltering';
import {
  ChevronLeft,
  Download,
  CheckCircle2,
  Trash2,
  RefreshCw,
  Loader2,
  Pencil,
  FileText,
} from 'lucide-react';

const ACTION_PRIORITIES = ['pre-bid', 'pre-sign', 'monitor'] as const;

interface ReviewHeaderProps {
  contract: Contract;
  onBack: () => void;
  onDelete?: (id: string) => void;
  onReanalyze?: (result: ReAnalyzeResult) => void;
  isReanalyzing?: boolean;
  onRename?: (id: string, name: string) => void;
  onLifecycleChange?: (id: string, status: LifecycleStatus) => void;
  visibleFindings: Finding[];
  filters: FilterState;
  hideResolved: boolean;
}

export function ReviewHeader({
  contract,
  onBack,
  onDelete,
  onReanalyze,
  isReanalyzing,
  onRename,
  onLifecycleChange,
  visibleFindings,
  filters,
  hideResolved,
}: ReviewHeaderProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [showReanalyzeModal, setShowReanalyzeModal] = useState(false);
  const { showToast } = useToast();

  const { isEditing, editValue, setEditValue, startEditing, commitEdit, onKeyDown: renameKeyDown, inputRef: renameInputRef } = useInlineEdit({
    initialValue: contract.name,
    autoFocus: true,
    validate: (v) => v.trim(),
    onSave: (name) => onRename?.(contract.id, name),
  });

  const resolvedCount = contract.findings.filter((f) => f.resolved).length;

  return (
    <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shrink-0 z-10">
      <div className="flex items-center space-x-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          {isEditing ? (
            <input
              ref={renameInputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={renameKeyDown}
              className="text-xl font-bold text-slate-900 bg-transparent border-b-2 border-blue-500 outline-none w-full"
            />
          ) : (
            <h1
              className="group/title text-xl font-bold text-slate-900 cursor-pointer flex items-center"
              onClick={startEditing}
            >
              {contract.name}
              <Pencil className="w-4 h-4 inline ml-2 text-slate-400 opacity-0 group-hover/title:opacity-100 transition-opacity" />
            </h1>
          )}
          <div className="flex items-center space-x-2 text-sm text-slate-500">
            <span>{contract.client}</span>
            <span>&bull;</span>
            <span>{contract.type}</span>
            <span>&bull;</span>
            <LifecycleSelect
              current={contract.lifecycleStatus}
              onChange={(status) => onLifecycleChange?.(contract.id, status)}
            />
            {contract.bidFileName && (
              <>
                <span>&bull;</span>
                <span className="inline-flex items-center bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs px-2 py-0.5 rounded-full">
                  Contract + Bid
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
              {contract.findings.filter(f => !f.resolved).length} open
            </span>
            {resolvedCount > 0 && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 flex items-center">
                <CheckCircle2 className="w-3 h-3 inline mr-0.5" />
                {resolvedCount} resolved
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center space-x-3">
        <button
          onClick={() => setShowConfirm(true)}
          className="flex items-center space-x-2 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-sm font-medium transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          <span>Delete</span>
        </button>
        <button
          onClick={() => setShowReanalyzeModal(true)}
          disabled={isReanalyzing}
          className="flex items-center space-x-2 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isReanalyzing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          <span>Re-analyze</span>
        </button>
        <button
          onClick={() => exportContractPdf(contract)}
          disabled={isReanalyzing || contract.findings.length === 0}
          className="flex items-center space-x-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          title="Download PDF Report"
        >
          <FileText className="w-4 h-4" />
          <span>PDF</span>
        </button>
        <button
          onClick={() => {
            const exportFindings = visibleFindings;
            const filterDescriptions: string[] = [];
            if (filters.severities.size < SEVERITIES.length) {
              filterDescriptions.push(`Severity: ${[...filters.severities].join(', ')}`);
            }
            if (filters.categories.size < CATEGORIES.length) {
              filterDescriptions.push(`Category: ${[...filters.categories].join(', ')}`);
            }
            if (filters.priorities.size < ACTION_PRIORITIES.length) {
              filterDescriptions.push(`Priority: ${[...filters.priorities].join(', ')}`);
            }
            if (filters.negotiationOnly) filterDescriptions.push('Has negotiation position');
            if (hideResolved) filterDescriptions.push('Hiding resolved');
            const csv = exportContractCsv(contract, {
              findings: exportFindings,
              filterDescriptions,
            });
            const filename = `${sanitizeFilename(contract.name)}_${new Date().toISOString().slice(0, 10)}.csv`;
            downloadCsv(csv, filename);
            showToast({ type: 'success', message: 'CSV exported' });
          }}
          disabled={isReanalyzing || contract.findings.length === 0}
          className="flex items-center space-x-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV</span>
        </button>
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
      <ReAnalyzeModal
        isOpen={showReanalyzeModal}
        bidFileName={contract.bidFileName ?? null}
        hasStoredContract={true}
        onConfirm={(result) => {
          setShowReanalyzeModal(false);
          onReanalyze?.(result);
        }}
        onCancel={() => setShowReanalyzeModal(false)}
      />
    </header>
  );
}
