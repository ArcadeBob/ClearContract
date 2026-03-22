import { useState } from 'react';
import { Contract } from '../types/contract';
import type { LifecycleStatus } from '../types/contract';
import { FindingCard } from '../components/FindingCard';
import { CategorySection } from '../components/CategorySection';
import { DateTimeline } from '../components/DateTimeline';
import { AnalysisProgress } from '../components/AnalysisProgress';
import { BidSignalWidget } from '../components/BidSignalWidget';
import { RiskScoreDisplay } from '../components/RiskScoreDisplay';
import { CoverageComparisonTab } from '../components/CoverageComparisonTab';
import { NegotiationChecklist } from '../components/NegotiationChecklist';
import { ReviewHeader } from '../components/ReviewHeader';
import { FilterToolbar, ViewMode } from '../components/FilterToolbar';
import { RiskSummary } from '../components/RiskSummary';
import { useCompanyProfile } from '../hooks/useCompanyProfile';
import { useAnalysisUsage } from '../hooks/useAnalysisUsage';
import { CostSummaryBar } from '../components/CostSummaryBar';
import { useContractFiltering } from '../hooks/useContractFiltering';
import {
  CheckCircle,
  CheckCircle2,
  X,
  Loader2,
} from 'lucide-react';
import { AnimatePresence } from 'framer-motion';

function EmptyFindings() {
  return (
    <div className="text-center py-12 bg-white rounded-lg border border-slate-200 border-dashed">
      <CheckCircle className="w-12 h-12 text-emerald-100 mx-auto mb-3" />
      <p className="text-slate-500 font-medium">No findings found</p>
    </div>
  );
}

interface ContractReviewProps {
  contract: Contract;
  onBack: () => void;
  onDelete?: (id: string) => void;
  onToggleResolved?: (findingId: string) => void;
  onUpdateNote?: (findingId: string, note: string | undefined) => void;
  onReanalyze?: (file: File) => void;
  isReanalyzing?: boolean;
  onRename?: (id: string, name: string) => void;
  onLifecycleChange?: (id: string, status: LifecycleStatus) => void;
}

export function ContractReview({ contract, onBack, onDelete, onToggleResolved, onUpdateNote, onReanalyze, isReanalyzing, onRename, onLifecycleChange }: ContractReviewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('by-category');
  const [showBanner, setShowBanner] = useState(true);

  // Contract filtering, grouping, sorting via shared hook
  const { filters, toggleFilter, setFilterSet, hideResolved, toggleHideResolved, visibleFindings, groupedFindings, flatFindings } = useContractFiltering({
    findings: contract.findings,
  });

  const { profile } = useCompanyProfile();
  const { rows: usageRows, isLoading: usageLoading } = useAnalysisUsage(contract.id);

  // Check if core profile fields that affect analysis are empty
  const coreProfileFields: (keyof typeof profile)[] = [
    'glPerOccurrence',
    'glAggregate',
    'autoLimit',
    'wcStatutoryState',
    'wcEmployerLiability',
    'bondingSingleProject',
    'bondingAggregate',
    'contractorLicenseType',
    'contractorLicenseNumber',
  ];
  const hasEmptyProfileFields = coreProfileFields.some(
    (k) => profile[k] === ''
  );

  // Resolved counts (use ALL findings, not filtered)
  const totalFindings = contract.findings.length;
  const resolvedCount = contract.findings.filter((f) => f.resolved).length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <ReviewHeader
        contract={contract}
        onBack={onBack}
        onDelete={onDelete}
        onReanalyze={onReanalyze}
        isReanalyzing={isReanalyzing}
        onRename={onRename}
        onLifecycleChange={onLifecycleChange}
        visibleFindings={visibleFindings}
        filters={filters}
        hideResolved={hideResolved}
      />

      <div className="bg-slate-50 px-8 pt-4">
        <div className="max-w-7xl mx-auto">
          <CostSummaryBar rows={usageRows} isLoading={usageLoading} />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto bg-slate-50 p-8">
        {contract.status === 'Analyzing' ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <AnalysisProgress isLoading />
          </div>
        ) : (
          <>
          {isReanalyzing && (
            <div className="max-w-7xl mx-auto mb-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                <span className="text-sm font-medium text-blue-800">Re-analyzing contract...</span>
              </div>
            </div>
          )}
          <div className={isReanalyzing ? 'opacity-50 pointer-events-none' : ''}>
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Findings */}
            <div className="lg:col-span-2 space-y-6">
              {/* Incomplete profile warning banner */}
              {hasEmptyProfileFields && showBanner && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center justify-between">
                  <p className="text-sm text-amber-800">
                    Some company profile fields are empty -- insurance and
                    bonding comparison may be incomplete.
                  </p>
                  <button
                    onClick={() => setShowBanner(false)}
                    className="p-1 hover:bg-amber-100 rounded text-amber-600 transition-colors shrink-0 ml-3"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">
                  Analysis Findings
                  <span className="text-sm font-normal text-slate-500 ml-2">
                    {totalFindings} {totalFindings === 1 ? 'finding' : 'findings'}
                    {resolvedCount > 0 && ` (${resolvedCount} resolved)`}
                  </span>
                </h2>
                <div className="flex items-center gap-4">
                  <div className="flex space-x-2 items-center">
                    <span className="text-sm text-slate-500">Risk Score:</span>
                    <RiskScoreDisplay
                      riskScore={contract.riskScore}
                      scoreBreakdown={contract.scoreBreakdown}
                    />
                  </div>
                  {contract.bidSignal && (
                    <BidSignalWidget signal={contract.bidSignal} findings={contract.findings} />
                  )}
                </div>
              </div>

              <FilterToolbar
                viewMode={viewMode}
                setViewMode={setViewMode}
                filters={filters}
                toggleFilter={toggleFilter}
                setFilterSet={setFilterSet}
                hideResolved={hideResolved}
                toggleHideResolved={toggleHideResolved}
              />

              {/* Findings display */}
              {viewMode === 'negotiation' ? (
                <NegotiationChecklist findings={contract.findings} onToggleResolved={onToggleResolved} />
              ) : viewMode === 'coverage' ? (
                <CoverageComparisonTab findings={contract.findings} />
              ) : viewMode === 'by-category' ? (
                <div className="space-y-6">
                  {groupedFindings.map(({ category, findings }) => (
                    <CategorySection
                      key={category}
                      category={category}
                      findings={findings}
                      defaultExpanded={true}
                      onToggleResolved={onToggleResolved}
                      onUpdateNote={onUpdateNote}
                    />
                  ))}
                  {groupedFindings.length === 0 && totalFindings > 0 && hideResolved ? (
                    <div className="text-center py-12 bg-white rounded-lg border border-slate-200 border-dashed">
                      <CheckCircle2 className="w-12 h-12 text-emerald-200 mx-auto mb-3" />
                      <p className="text-slate-500 font-medium">All findings resolved</p>
                      <p className="text-sm text-slate-400 mt-1">Uncheck &quot;Hide resolved&quot; to view them</p>
                    </div>
                  ) : groupedFindings.length === 0 ? (
                    <EmptyFindings />
                  ) : null}
                </div>
              ) : (
                <div className="space-y-4">
                  <AnimatePresence mode="popLayout">
                    {flatFindings.map((finding, index) => (
                      <FindingCard
                        key={finding.id}
                        finding={finding}
                        index={index}
                        onToggleResolved={onToggleResolved}
                        onUpdateNote={onUpdateNote}
                      />
                    ))}
                  </AnimatePresence>
                  {flatFindings.length === 0 && totalFindings > 0 && hideResolved ? (
                    <div className="text-center py-12 bg-white rounded-lg border border-slate-200 border-dashed">
                      <CheckCircle2 className="w-12 h-12 text-emerald-200 mx-auto mb-3" />
                      <p className="text-slate-500 font-medium">All findings resolved</p>
                      <p className="text-sm text-slate-400 mt-1">Uncheck &quot;Hide resolved&quot; to view them</p>
                    </div>
                  ) : flatFindings.length === 0 ? (
                    <EmptyFindings />
                  ) : null}
                </div>
              )}
            </div>

            {/* Right Column: Timeline & Summary */}
            <div className="space-y-6">
              <DateTimeline dates={contract.dates} />
              <RiskSummary
                findings={contract.findings}
                resolvedCount={resolvedCount}
                totalFindings={totalFindings}
              />
            </div>
          </div>
          </div>
          </>
        )}
      </div>
    </div>
  );
}
