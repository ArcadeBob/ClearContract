import { useMemo } from 'react';
import { ViewState } from '../types/contract';
import { URGENCY_GROUPS, groupDatesByUrgency, getRelativeLabel, TimelineEntry, UrgencyGroup } from '../utils/dateUrgency';
import { Calendar, Clock, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const GROUP_ICONS: Record<UrgencyGroup, typeof AlertCircle> = {
  overdue: AlertCircle,
  'this-week': Clock,
  'this-month': Calendar,
  later: Calendar,
};

interface DeadlineTimelineProps {
  contracts: Array<{
    id: string;
    name: string;
    status: string;
    dates: Array<{ label: string; date: string; type: 'Start' | 'Milestone' | 'Deadline' | 'Expiry' }>;
  }>;
  onNavigate: (view: ViewState, id?: string) => void;
}

export function DeadlineTimeline({ contracts, onNavigate }: DeadlineTimelineProps) {
  const grouped = useMemo(() => groupDatesByUrgency(contracts), [contracts]);

  const allEmpty = URGENCY_GROUPS.every(g => grouped[g.key].length === 0);

  let globalIndex = 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-5 h-5 text-slate-500" />
        <h3 className="text-lg font-semibold text-slate-900">Portfolio Deadlines</h3>
      </div>

      {allEmpty ? (
        <div className="text-center py-8">
          <Calendar className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-sm text-slate-400">No upcoming deadlines</p>
          <p className="text-xs text-slate-400 mt-1">Upload and analyze contracts to track important dates</p>
        </div>
      ) : (
        <div>
          {URGENCY_GROUPS.map((config, groupIdx) => {
            const entries = grouped[config.key];
            if (entries.length === 0) return null;

            const Icon = GROUP_ICONS[config.key];
            const isFirst = URGENCY_GROUPS.slice(0, groupIdx).every(g => grouped[g.key].length === 0);

            return (
              <div key={config.key}>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${config.bgClass}${isFirst ? '' : ' mt-4'}`}>
                  <Icon className={`w-4 h-4 ${config.iconColor}`} />
                  <span className={`text-sm font-semibold ${config.colorClass}`}>{config.label}</span>
                </div>
                <div className="space-y-2 mt-2">
                  {entries.map((entry: TimelineEntry) => {
                    const idx = globalIndex++;
                    return (
                      <motion.button
                        key={`${entry.contractId}-${entry.label}-${entry.date}`}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        onClick={() => onNavigate('review', entry.contractId)}
                        className="w-full text-left p-3 rounded-lg hover:bg-slate-50 transition-colors border border-slate-100"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-slate-900 truncate">{entry.label}</span>
                          <span className={`text-xs font-semibold ${config.colorClass}`}>
                            {getRelativeLabel(entry.date)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-slate-500 truncate">{entry.contractName}</span>
                          <span className="text-xs text-slate-500">
                            {new Date(entry.date.replace(/-/g, '/')).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
