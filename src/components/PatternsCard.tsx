import { useMemo } from 'react';
import { Contract, Category } from '../types/contract';
import { BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';

interface PatternsCardProps {
  contracts: Contract[];
}

export function PatternsCard({ contracts }: PatternsCardProps) {
  const patterns = useMemo(() => {
    const reviewed = contracts.filter((c) => c.status === 'Reviewed' || c.status === 'Partial');
    if (reviewed.length < 3) return null;

    const categoryCounts = new Map<Category, number>();

    for (const contract of reviewed) {
      // Unique categories per contract
      const cats = new Set<Category>();
      for (const f of contract.findings) {
        cats.add(f.category);
      }
      for (const cat of cats) {
        categoryCounts.set(cat, (categoryCounts.get(cat) ?? 0) + 1);
      }
    }

    const qualifying = Array.from(categoryCounts.entries())
      .filter(([, count]) => count >= 3)
      .sort((a, b) => b[1] - a[1]);

    if (qualifying.length === 0) return null;

    return {
      items: qualifying,
      totalReviewed: reviewed.length,
    };
  }, [contracts]);

  if (!patterns) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-white rounded-xl border border-slate-200 shadow-sm p-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-violet-50 text-violet-600">
          <BarChart3 className="w-5 h-5" />
        </div>
        <h3 className="text-sm font-medium text-slate-500">Common Patterns</h3>
      </div>
      <div className="space-y-2">
        {patterns.items.slice(0, 5).map(([category, count]) => (
          <div key={category} className="flex items-center justify-between">
            <span className="text-sm text-slate-700 truncate mr-2">
              {category}
            </span>
            <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
              {count}/{patterns.totalReviewed} contracts
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
