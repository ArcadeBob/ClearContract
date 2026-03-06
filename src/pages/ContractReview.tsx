import { useState, useEffect } from 'react';
import { Contract, Category, Severity } from '../types/contract';
import { FindingCard } from '../components/FindingCard';
import { CategoryFilter } from '../components/CategoryFilter';
import { CategorySection } from '../components/CategorySection';
import { DateTimeline } from '../components/DateTimeline';
import { SeverityBadge } from '../components/SeverityBadge';
import { AnalysisProgress } from '../components/AnalysisProgress';
import { ChevronLeft, Download, Share2, CheckCircle, LayoutGrid, List } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';

type ViewMode = 'by-category' | 'by-severity';

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
}

export function ContractReview({ contract, onBack }: ContractReviewProps) {
  const [selectedCategory, setSelectedCategory] = useState<Category | 'All'>(
    'All'
  );
  const [viewMode, setViewMode] = useState<ViewMode>('by-category');

  // Scroll to category section when a category pill is clicked in by-category mode
  useEffect(() => {
    if (viewMode === 'by-category' && selectedCategory !== 'All') {
      const el = document.getElementById(
        `category-${selectedCategory.replace(/\s+/g, '-').toLowerCase()}`
      );
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [selectedCategory, viewMode]);

  // Categories that have findings (deterministic order)
  const categoriesWithFindings = CATEGORY_ORDER.filter(cat =>
    contract.findings.some(f => f.category === cat)
  );

  // Category-grouped findings sorted by max severity then count
  const groupedFindings = CATEGORY_ORDER
    .map(category => ({
      category,
      findings: contract.findings
        .filter(f => f.category === category)
        .sort((a, b) => severityRank[a.severity] - severityRank[b.severity]),
    }))
    .filter(group => group.findings.length > 0)
    .sort((a, b) => {
      const aMax = Math.min(...a.findings.map(f => severityRank[f.severity]));
      const bMax = Math.min(...b.findings.map(f => severityRank[f.severity]));
      if (aMax !== bMax) return aMax - bMax;
      return b.findings.length - a.findings.length;
    });

  // Flat severity-sorted findings for by-severity mode
  const flatFindings = [...contract.findings].sort(
    (a, b) => severityRank[a.severity] - severityRank[b.severity]
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
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
          <button className="flex items-center space-x-2 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-sm font-medium">
            <Share2 className="w-4 h-4" />
            <span>Share</span>
          </button>
          <button className="flex items-center space-x-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 text-sm font-medium">
            <Download className="w-4 h-4" />
            <span>Export Report</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-auto bg-slate-50 p-8">
        {contract.status === 'Analyzing' ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <AnalysisProgress isLoading />
          </div>
        ) : (
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Findings */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Analysis Findings
              </h2>
              <div className="flex space-x-2">
                <span className="text-sm text-slate-500">Risk Score:</span>
                <span
                  className={`text-sm font-bold ${contract.riskScore > 70 ? 'text-red-600' : contract.riskScore > 40 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {contract.riskScore}/100
                </span>
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
              </div>
            </div>

            {viewMode === 'by-category' && (
              <CategoryFilter
                categories={categoriesWithFindings}
                selectedCategory={selectedCategory}
                onSelect={setSelectedCategory}
              />
            )}

            {/* Findings display */}
            {viewMode === 'by-category' ? (
              <div className="space-y-6">
                {groupedFindings.map(({ category, findings }) => (
                  <CategorySection
                    key={category}
                    category={category}
                    findings={findings}
                    defaultExpanded={true}
                  />
                ))}
                {groupedFindings.length === 0 && (
                  <div className="text-center py-12 bg-white rounded-lg border border-slate-200 border-dashed">
                    <CheckCircle className="w-12 h-12 text-emerald-100 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">No findings found</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                  {flatFindings.map((finding, index) => (
                    <FindingCard
                      key={finding.id}
                      finding={finding}
                      index={index}
                    />
                  ))}
                </AnimatePresence>
                {flatFindings.length === 0 && (
                  <div className="text-center py-12 bg-white rounded-lg border border-slate-200 border-dashed">
                    <CheckCircle className="w-12 h-12 text-emerald-100 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">No findings found</p>
                  </div>
                )}
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
                        className="flex items-center justify-between">
                        <SeverityBadge severity={severity} />
                        <span className="text-sm font-medium text-slate-600">
                          {count}
                        </span>
                      </div>);
                  }
                )}
              </div>
              <div className="mt-6 pt-6 border-t border-slate-100">
                <p className="text-xs text-slate-400 leading-relaxed">
                  This analysis is generated by AI based on standard glazing
                  industry contracts. Always verify critical findings with legal
                  counsel.
                </p>
              </div>
            </div>
          </div>
        </div>
        )}
      </div>
    </div>);
}
