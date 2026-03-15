import { useState, useMemo, useCallback } from 'react';
import { Finding, Severity, Category, SEVERITIES, CATEGORIES } from '../types/contract';
import { loadRaw, saveRaw } from '../storage/storageManager';

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
  'Compound Risk',
];

const severityRank: Record<Severity, number> = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
  Info: 4,
};

const ACTION_PRIORITIES = ['pre-bid', 'pre-sign', 'monitor'] as const;

export interface FilterState {
  severities: Set<Severity>;
  categories: Set<Category>;
  priorities: Set<string>;
  negotiationOnly: boolean;
}

type FilterSetType = 'severities' | 'categories' | 'priorities';

interface UseContractFilteringOptions {
  findings: Finding[];
}

interface UseContractFilteringReturn {
  filters: FilterState;
  toggleFilter: (type: FilterSetType | 'negotiationOnly', value?: string) => void;
  setFilterSet: (type: FilterSetType, newSet: Set<string>) => void;
  resetFilters: () => void;
  hideResolved: boolean;
  toggleHideResolved: () => void;
  visibleFindings: Finding[];
  groupedFindings: Array<{ category: Category; findings: Finding[] }>;
  flatFindings: Finding[];
}

export function useContractFiltering({
  findings,
}: UseContractFilteringOptions): UseContractFilteringReturn {
  const [severities, setSeverities] = useState<Set<Severity>>(() => new Set(SEVERITIES));
  const [categories, setCategories] = useState<Set<Category>>(() => new Set(CATEGORIES));
  const [priorities, setPriorities] = useState<Set<string>>(() => new Set(ACTION_PRIORITIES));
  const [negotiationOnly, setNegotiationOnly] = useState(false);

  const [hideResolved, setHideResolved] = useState(() => {
    return loadRaw('clearcontract:hide-resolved').data === 'true';
  });

  const toggleHideResolved = useCallback(() => {
    setHideResolved((prev) => {
      const next = !prev;
      saveRaw('clearcontract:hide-resolved', String(next));
      return next;
    });
  }, []);

  const toggleFilter = useCallback(
    (type: FilterSetType | 'negotiationOnly', value?: string) => {
      if (type === 'negotiationOnly') {
        setNegotiationOnly((prev) => !prev);
        return;
      }
      if (value === undefined) return;

      if (type === 'severities') {
        setSeverities((prev) => {
          const next = new Set(prev);
          if (next.has(value as Severity)) next.delete(value as Severity);
          else next.add(value as Severity);
          return next;
        });
      } else if (type === 'categories') {
        setCategories((prev) => {
          const next = new Set(prev);
          if (next.has(value as Category)) next.delete(value as Category);
          else next.add(value as Category);
          return next;
        });
      } else if (type === 'priorities') {
        setPriorities((prev) => {
          const next = new Set(prev);
          if (next.has(value)) next.delete(value);
          else next.add(value);
          return next;
        });
      }
    },
    [],
  );

  const setFilterSet = useCallback(
    (type: FilterSetType, newSet: Set<string>) => {
      if (type === 'severities') setSeverities(newSet as Set<Severity>);
      else if (type === 'categories') setCategories(newSet as Set<Category>);
      else if (type === 'priorities') setPriorities(newSet);
    },
    [],
  );

  const resetFilters = useCallback(() => {
    setSeverities(new Set(SEVERITIES));
    setCategories(new Set(CATEGORIES));
    setPriorities(new Set(ACTION_PRIORITIES));
    setNegotiationOnly(false);
  }, []);

  const filters: FilterState = useMemo(
    () => ({ severities, categories, priorities, negotiationOnly }),
    [severities, categories, priorities, negotiationOnly],
  );

  const visibleFindings = useMemo(() => {
    let result = findings;
    if (hideResolved) {
      result = result.filter((f) => !f.resolved);
    }
    if (severities.size < SEVERITIES.length) {
      result = result.filter((f) => severities.has(f.severity));
    }
    if (categories.size < CATEGORIES.length) {
      result = result.filter((f) => categories.has(f.category));
    }
    if (priorities.size < ACTION_PRIORITIES.length) {
      result = result.filter(
        (f) => f.actionPriority != null && priorities.has(f.actionPriority),
      );
    }
    if (negotiationOnly) {
      result = result.filter((f) => !!f.negotiationPosition);
    }
    return result;
  }, [findings, hideResolved, severities, categories, priorities, negotiationOnly]);

  const groupedFindings = useMemo(
    () =>
      CATEGORY_ORDER.map((category) => ({
        category,
        findings: visibleFindings
          .filter((f) => f.category === category)
          .sort((a, b) => severityRank[a.severity] - severityRank[b.severity]),
      }))
        .filter((group) => group.findings.length > 0)
        .sort((a, b) => {
          const aMax = Math.min(...a.findings.map((f) => severityRank[f.severity]));
          const bMax = Math.min(...b.findings.map((f) => severityRank[f.severity]));
          if (aMax !== bMax) return aMax - bMax;
          return b.findings.length - a.findings.length;
        }),
    [visibleFindings],
  );

  const flatFindings = useMemo(
    () =>
      [...visibleFindings].sort(
        (a, b) => severityRank[a.severity] - severityRank[b.severity],
      ),
    [visibleFindings],
  );

  return {
    filters,
    toggleFilter,
    setFilterSet,
    resetFilters,
    hideResolved,
    toggleHideResolved,
    visibleFindings,
    groupedFindings,
    flatFindings,
  };
}
