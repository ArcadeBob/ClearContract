import { MultiSelectDropdown } from './MultiSelectDropdown';
import { SeverityBadge } from './SeverityBadge';
import { SEVERITIES, CATEGORIES, Severity } from '../types/contract';
import { FilterState } from '../hooks/useContractFiltering';
import {
  LayoutGrid,
  List,
  Shield,
  Handshake,
} from 'lucide-react';

export type ViewMode = 'by-category' | 'by-severity' | 'coverage' | 'negotiation';

type FilterSetType = 'severities' | 'categories' | 'priorities';

const ACTION_PRIORITIES = ['pre-bid', 'pre-sign', 'monitor'] as const;

interface FilterToolbarProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  filters: FilterState;
  toggleFilter: (type: FilterSetType | 'negotiationOnly', value?: string) => void;
  setFilterSet: (type: FilterSetType, newSet: Set<string>) => void;
  hideResolved: boolean;
  toggleHideResolved: () => void;
}

export function FilterToolbar({
  viewMode,
  setViewMode,
  filters,
  toggleFilter,
  setFilterSet,
  hideResolved,
  toggleHideResolved,
}: FilterToolbarProps) {
  return (
    <>
      {/* View mode toggle and hide-resolved checkbox */}
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
          <button
            onClick={() => setViewMode('negotiation')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'negotiation'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Handshake className="w-4 h-4" />
            Negotiation
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

      {/* Multi-select filter dropdowns */}
      <div className="flex items-center gap-2 flex-wrap">
        <MultiSelectDropdown
          label="Category"
          options={CATEGORIES}
          selected={filters.categories}
          onChange={(s) => setFilterSet('categories', s as Set<string>)}
        />
        <MultiSelectDropdown
          label="Severity"
          options={SEVERITIES}
          selected={filters.severities}
          onChange={(s) => setFilterSet('severities', s as Set<string>)}
          renderOption={(s) => <SeverityBadge severity={s as Severity} />}
        />
        <MultiSelectDropdown
          label="Priority"
          options={ACTION_PRIORITIES}
          selected={filters.priorities}
          onChange={(s) => setFilterSet('priorities', s)}
        />
        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none ml-1">
          <input
            type="checkbox"
            checked={filters.negotiationOnly}
            onChange={() => toggleFilter('negotiationOnly')}
            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          Has negotiation position
        </label>
      </div>
    </>
  );
}
