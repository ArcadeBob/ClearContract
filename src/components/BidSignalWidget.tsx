import { useState, useMemo } from 'react';
import { BidSignal, Finding } from '../types/contract';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { generateFactorReasons } from '../utils/bidSignal';

interface BidSignalWidgetProps {
  signal: BidSignal;
  findings?: Finding[];
}

const colorMap: Record<BidSignal['level'], string> = {
  bid: 'bg-emerald-500',
  caution: 'bg-amber-500',
  'no-bid': 'bg-red-500',
};

function getBarColor(score: number): string {
  if (score > 70) return 'bg-emerald-500';
  if (score >= 40) return 'bg-amber-500';
  return 'bg-red-500';
}

export function BidSignalWidget({ signal, findings }: BidSignalWidgetProps) {
  const [expanded, setExpanded] = useState(false);
  const reasons = useMemo(
    () => (findings ? generateFactorReasons(findings) : null),
    [findings]
  );

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full group"
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-2 flex-1"
        >
          <div className={`w-4 h-4 rounded-full ${colorMap[signal.level]}`} />
          <span className="text-sm font-medium text-slate-700">{signal.label}</span>
          <span className="text-xs text-slate-400">{signal.score}/100</span>
        </motion.div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {expanded && signal.factors && signal.factors.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-2.5 pl-6">
              {signal.factors.map((factor) => (
                <div key={factor.name}>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-600 w-28 shrink-0 truncate" title={factor.name}>
                      {factor.name}
                    </span>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${getBarColor(factor.score)}`}
                        style={{ width: `${Math.round(factor.score)}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-slate-700 w-10 text-right">
                      {Math.round(factor.score)}%
                    </span>
                    <span className="text-xs text-slate-400 w-8 text-right">
                      {factor.weight}
                    </span>
                  </div>
                  {reasons && reasons[factor.name] && (
                    <p className="text-xs text-slate-500 mt-0.5 pl-28">{reasons[factor.name]}</p>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
