import { BidSignal } from '../types/contract';
import { motion } from 'framer-motion';

interface BidSignalWidgetProps {
  signal: BidSignal;
}

const colorMap: Record<BidSignal['level'], string> = {
  bid: 'bg-emerald-500',
  caution: 'bg-amber-500',
  'no-bid': 'bg-red-500',
};

export function BidSignalWidget({ signal }: BidSignalWidgetProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="flex items-center gap-2"
    >
      <div className={`w-4 h-4 rounded-full ${colorMap[signal.level]}`} />
      <span className="text-sm font-medium text-slate-700">{signal.label}</span>
      <span className="text-xs text-slate-400">{signal.score}/100</span>
    </motion.div>
  );
}
