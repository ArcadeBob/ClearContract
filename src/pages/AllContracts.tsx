import { useMemo, useState } from 'react';
import { Contract, ViewState } from '../types/contract';
import { ContractCard } from '../components/ContractCard';
import { Search, SlidersHorizontal, Plus, ArrowUpDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
interface AllContractsProps {
  contracts: Contract[];
  onNavigate: (view: ViewState, id?: string) => void;
  onDelete?: (id: string) => void;
}
const CONTRACT_TYPES = [
  'All',
  'Prime Contract',
  'Subcontract',
  'Purchase Order',
  'Change Order',
] as const;
const SORT_OPTIONS = [
  {
    label: 'Newest First',
    value: 'date-desc',
  },
  {
    label: 'Oldest First',
    value: 'date-asc',
  },
  {
    label: 'Highest Risk',
    value: 'risk-desc',
  },
  {
    label: 'Lowest Risk',
    value: 'risk-asc',
  },
  {
    label: 'Name A-Z',
    value: 'name-asc',
  },
] as const;
export function AllContracts({ contracts, onNavigate, onDelete }: AllContractsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<string>('date-desc');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const filteredContracts = useMemo(() => {
    let result = [...contracts];
    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.client.toLowerCase().includes(q) ||
          c.findings.some((f) => f.title.toLowerCase().includes(q))
      );
    }
    // Type filter
    if (typeFilter !== 'All') {
      result = result.filter((c) => c.type === typeFilter);
    }
    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return (
            new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()
          );

        case 'date-asc':
          return (
            new Date(a.uploadDate).getTime() - new Date(b.uploadDate).getTime()
          );

        case 'risk-desc':
          return b.riskScore - a.riskScore;
        case 'risk-asc':
          return a.riskScore - b.riskScore;
        case 'name-asc':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });
    return result;
  }, [contracts, searchQuery, typeFilter, sortBy]);
  const totalFindings = contracts.reduce(
    (acc, c) => acc + c.findings.length,
    0
  );
  const criticalCount = contracts.reduce(
    (acc, c) =>
      acc + c.findings.filter((f) => f.severity === 'Critical').length,
    0
  );
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-8 py-6 shrink-0">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">All Contracts</h1>
            <p className="text-slate-500 mt-1">
              {contracts.length} contracts • {totalFindings} findings •{' '}
              {criticalCount} critical
            </p>
          </div>
          <button
            onClick={() => onNavigate('upload')}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Upload Contract</span>
          </button>
        </div>

        {/* Search & Filters */}
        <div className="flex items-center space-x-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search contracts, clients, or findings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center space-x-2">
            {CONTRACT_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${typeFilter === type ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
              >
                {type}
              </button>
            ))}
          </div>

          <div className="relative">
            <button
              onClick={() => setShowSortMenu(!showSortMenu)}
              className="flex items-center space-x-2 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
            >
              <ArrowUpDown className="w-4 h-4" />
              <span>Sort</span>
            </button>
            {showSortMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowSortMenu(false)}
                />

                <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1">
                  {SORT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setSortBy(option.value);
                        setShowSortMenu(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors ${sortBy === option.value ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Contract List */}
      <div className="flex-1 overflow-auto bg-slate-50 p-8">
        <div className="max-w-5xl mx-auto">
          {filteredContracts.length > 0 ? (
            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {filteredContracts.map((contract, index) => (
                  <motion.div
                    key={contract.id}
                    initial={{
                      opacity: 0,
                      y: 8,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    exit={{
                      opacity: 0,
                      y: -8,
                    }}
                    transition={{
                      delay: index * 0.04,
                    }}
                  >
                    <ContractCard
                      contract={contract}
                      onClick={() => onNavigate('review', contract.id)}
                      onDelete={onDelete}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
              <SlidersHorizontal className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">
                No contracts match your filters
              </p>
              <p className="text-slate-400 text-sm mt-1">
                Try adjusting your search or filter criteria
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setTypeFilter('All');
                }}
                className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
