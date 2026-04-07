import { useMemo } from 'react';
import { Contract } from '../types/contract';
import { TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

interface ScopeTrendsCardProps {
  contracts: Contract[];
}

export function ScopeTrendsCard({ contracts }: ScopeTrendsCardProps) {
  const trends = useMemo(() => {
    const reviewed = contracts.filter(
      (c) => c.status === 'Reviewed' || c.status === 'Partial'
    );
    if (reviewed.length < 10) return null;

    const exclusionCounts = new Map<string, number>();
    const scopeItemCounts = new Map<string, number>();
    const challengedExclusionCounts = new Map<string, number>();

    for (const contract of reviewed) {
      for (const f of contract.findings) {
        if (f.category !== 'Scope of Work' || !f.scopeMeta) continue;

        if (f.scopeMeta.passType === 'scope-extraction') {
          if (f.scopeMeta.scopeItemType === 'exclusion') {
            exclusionCounts.set(
              f.title,
              (exclusionCounts.get(f.title) ?? 0) + 1
            );
          } else {
            scopeItemCounts.set(
              f.title,
              (scopeItemCounts.get(f.title) ?? 0) + 1
            );
          }
        }

        if (f.scopeMeta.passType === 'exclusion-stress-test') {
          challengedExclusionCounts.set(
            f.title,
            (challengedExclusionCounts.get(f.title) ?? 0) + 1
          );
        }
      }
    }

    const topExclusions = [...exclusionCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    const recurringScope = [...scopeItemCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    const challengedExclusions = [...challengedExclusionCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    if (
      topExclusions.length === 0 &&
      recurringScope.length === 0 &&
      challengedExclusions.length === 0
    ) {
      return { empty: true as const, totalReviewed: reviewed.length };
    }

    return {
      empty: false as const,
      topExclusions,
      recurringScope,
      challengedExclusions,
      totalReviewed: reviewed.length,
    };
  }, [contracts]);

  if (!trends) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-white rounded-xl border border-slate-200 shadow-sm p-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-violet-50 text-violet-600">
          <TrendingUp className="w-5 h-5" />
        </div>
        <h3 className="text-sm font-medium text-slate-500">Scope Trends</h3>
      </div>

      {trends.empty ? (
        <p className="text-sm text-slate-500 italic">
          Not enough scope data to identify trends yet.
        </p>
      ) : (
        <div className="space-y-4">
          {trends.topExclusions.length > 0 && (
            <TrendSection
              label="Most Declared Exclusions"
              items={trends.topExclusions}
              totalReviewed={trends.totalReviewed}
            />
          )}
          {trends.recurringScope.length > 0 && (
            <TrendSection
              label="Recurring Scope Items"
              items={trends.recurringScope}
              totalReviewed={trends.totalReviewed}
            />
          )}
          {trends.challengedExclusions.length > 0 && (
            <TrendSection
              label="Commonly Challenged Exclusions"
              items={trends.challengedExclusions}
              totalReviewed={trends.totalReviewed}
            />
          )}
        </div>
      )}
    </motion.div>
  );
}

function TrendSection({
  label,
  items,
  totalReviewed,
}: {
  label: string;
  items: [string, number][];
  totalReviewed: number;
}) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
        {label}
      </h4>
      <div className="space-y-1">
        {items.map(([name, count]) => (
          <div key={name} className="flex items-center justify-between">
            <span className="text-sm text-slate-700 truncate mr-2">
              {name}
            </span>
            <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
              {count}/{totalReviewed} contracts
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
