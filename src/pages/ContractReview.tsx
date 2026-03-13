import { useState, useEffect, useRef } from 'react';
import { Contract, Category, Severity } from '../types/contract';
import { FindingCard } from '../components/FindingCard';
import { CategoryFilter } from '../components/CategoryFilter';
import { CategorySection } from '../components/CategorySection';
import { DateTimeline } from '../components/DateTimeline';
import { SeverityBadge } from '../components/SeverityBadge';
import { AnalysisProgress } from '../components/AnalysisProgress';
import { BidSignalWidget } from '../components/BidSignalWidget';
import { CoverageComparisonTab } from '../components/CoverageComparisonTab';
import { useCompanyProfile } from '../hooks/useCompanyProfile';
import {
  ChevronLeft,
  Download,
  Share2,
  CheckCircle,
  CheckCircle2,
  LayoutGrid,
  List,
  Shield,
  X,
  Trash2,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { AnimatePresence } from 'framer-motion';

type ViewMode = 'by-category' | 'by-severity' | 'coverage';

function EmptyFindings() {
  return (
    <div className="text-center py-12 bg-white rounded-lg border border-slate-200 border-dashed">
      <CheckCircle className="w-12 h-12 text-emerald-100 mx-auto mb-3" />
      <p className="text-slate-500 font-medium">No findings found</p>
    </div>
  );
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
];

const severityRank: Record<Severity, number> = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
  Info: 4,
};

interface ContractReviewProps {
  contract: Contract;
  onBack: () => void;
  onDelete?: (id: string) => void;
  onToggleResolved?: (findingId: string) => void;
  onUpdateNote?: (findingId: string, note: string | undefined) => void;
  onReanalyze?: (file: File) => void;
  isReanalyzing?: boolean;
}

export function ContractReview({ contract, onBack, onDelete, onToggleResolved, onUpdateNote, onReanalyze, isReanalyzing }: ContractReviewProps) {
  const [selectedCategory, setSelectedCategory] = useState<Category | 'All'>(
    'All'
  );
  const [viewMode, setViewMode] = useState<ViewMode>('by-category');
  const [showBanner, setShowBanner] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showReanalyzeConfirm, setShowReanalyzeConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleConfirmReanalyze = () => {
    setShowReanalyzeConfirm(false);
    fileInputRef.current?.click();
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ''; // Reset so same file can be re-selected
    onReanalyze?.(file);
  };

  const HIDE_RESOLVED_KEY = 'clearcontract:hide-resolved';
  const [hideResolved, setHideResolved] = useState(() => {
    try {
      return localStorage.getItem(HIDE_RESOLVED_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const toggleHideResolved = () => {
    setHideResolved((prev) => {
      const next = !prev;
      try { localStorage.setItem(HIDE_RESOLVED_KEY, String(next)); } catch {}
      return next;
    });
  };

  const { profile } = useCompanyProfile();

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

  // Scroll to category section when a category pill is clicked in by-category mode
  useEffect(() => {
    if (viewMode === 'by-category' && selectedCategory !== 'All') {
      const el = document.getElementById(
        `category-${selectedCategory.replace(/\s+/g, '-').toLowerCase()}`
      );
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [selectedCategory, viewMode]);

  // Resolved counts (use ALL findings, not filtered)
  const totalFindings = contract.findings.length;
  const resolvedCount = contract.findings.filter((f) => f.resolved).length;

  // Apply hide-resolved filter at the data level before both rendering paths
  const visibleFindings = hideResolved
    ? contract.findings.filter((f) => !f.resolved)
    : contract.findings;

  // Categories that have findings (deterministic order)
  const categoriesWithFindings = CATEGORY_ORDER.filter((cat) =>
    visibleFindings.some((f) => f.category === cat)
  );

  // Category-grouped findings sorted by max severity then count
  const groupedFindings = CATEGORY_ORDER.map((category) => ({
    category,
    findings: visibleFindings
      .filter((f) => f.category === category)
      .sort((a, b) => severityRank[a.severity] - severityRank[b.severity]),
  }))
    .filter((group) => group.findings.length > 0)
    .filter(
      (group) =>
        selectedCategory === 'All' || group.category === selectedCategory
    )
    .sort((a, b) => {
      const aMax = Math.min(...a.findings.map((f) => severityRank[f.severity]));
      const bMax = Math.min(...b.findings.map((f) => severityRank[f.severity]));
      if (aMax !== bMax) return aMax - bMax;
      return b.findings.length - a.findings.length;
    });

  // Flat severity-sorted findings for by-severity mode
  const flatFindings = [...visibleFindings].sort(
    (a, b) => severityRank[a.severity] - severityRank[b.severity]
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {contract.name}
            </h1>
            <div className="flex items-center space-x-2 text-sm text-slate-500">
              <span>{contract.client}</span>
              <span>&bull;</span>
              <span>{contract.type}</span>
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
          <button className="flex items-center space-x-2 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-sm font-medium">
            <Share2 className="w-4 h-4" />
            <span>Share</span>
          </button>
          <button
            onClick={() => setShowReanalyzeConfirm(true)}
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
          <button className="flex items-center space-x-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 text-sm font-medium">
            <Download className="w-4 h-4" />
            <span>Export Report</span>
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
        <ConfirmDialog
          isOpen={showReanalyzeConfirm}
          title="Re-analyze Contract"
          message="Re-analyzing will replace all current findings, including any resolved status and notes you've added. Select a PDF to continue."
          confirmLabel="Select PDF"
          confirmClassName="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          icon="info"
          onConfirm={handleConfirmReanalyze}
          onCancel={() => setShowReanalyzeConfirm(false)}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={handleFileSelected}
        />
      </header>

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
                  <div className="flex space-x-2">
                    <span className="text-sm text-slate-500">Risk Score:</span>
                    <span
                      className={`text-sm font-bold ${contract.riskScore > 70 ? 'text-red-600' : contract.riskScore > 40 ? 'text-amber-600' : 'text-emerald-600'}`}
                    >
                      {contract.riskScore}/100
                    </span>
                  </div>
                  {contract.bidSignal && (
                    <BidSignalWidget signal={contract.bidSignal} />
                  )}
                </div>
              </div>

              {/* View mode toggle and category filter row */}
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('by-category')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      viewMode === 'by-category'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <LayoutGrid className="w-4 h-4" />
                    By Category
                  </button>
                  <button
                    onClick={() => setViewMode('by-severity')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      viewMode === 'by-severity'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <List className="w-4 h-4" />
                    All by Severity
                  </button>
                  <button
                    onClick={() => setViewMode('coverage')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      viewMode === 'coverage'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <Shield className="w-4 h-4" />
                    Coverage
                  </button>
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={hideResolved}
                    onChange={toggleHideResolved}
                    className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                  />
                  Hide resolved
                </label>
              </div>

              {viewMode === 'by-category' && (
                <CategoryFilter
                  categories={categoriesWithFindings}
                  selectedCategory={selectedCategory}
                  onSelect={setSelectedCategory}
                />
              )}

              {/* Findings display */}
              {viewMode === 'coverage' ? (
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

              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  Risk Summary
                </h3>
                <div className="space-y-3">
                  {(['Critical', 'High', 'Medium', 'Low', 'Info'] as const).map(
                    (severity) => {
                      const count = contract.findings.filter(
                        (f) => f.severity === severity
                      ).length;
                      if (count === 0) return null;
                      return (
                        <div
                          key={severity}
                          className="flex items-center justify-between"
                        >
                          <SeverityBadge severity={severity} />
                          <span className="text-sm font-medium text-slate-600">
                            {count}
                          </span>
                        </div>
                      );
                    }
                  )}
                </div>
                {resolvedCount > 0 && (
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                    <span className="text-sm text-slate-600">Resolved</span>
                    <span className="text-sm font-medium text-emerald-600">
                      {resolvedCount} of {totalFindings}
                    </span>
                  </div>
                )}
                <div className="mt-6 pt-6 border-t border-slate-100">
                  <p className="text-xs text-slate-400 leading-relaxed">
                    This analysis is generated by AI based on standard glazing
                    industry contracts. Always verify critical findings with
                    legal counsel.
                  </p>
                </div>
              </div>
            </div>
          </div>
          </div>
          </>
        )}
      </div>
    </div>
  );
}
