import { ContractDate } from '../types/contract';
import { Calendar, Flag, AlertCircle, Clock } from 'lucide-react';

function getDateUrgency(dateStr: string): { label: string; colorClass: string; isPast: boolean } {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  const diffMs = target.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / 86400000);

  if (diffDays < 0) {
    return { label: `${Math.abs(diffDays)}d ago`, colorClass: 'text-slate-400', isPast: true };
  }
  if (diffDays === 0) {
    return { label: 'Today', colorClass: 'text-red-600', isPast: false };
  }
  if (diffDays <= 7) {
    return { label: `${diffDays}d away`, colorClass: 'text-red-600', isPast: false };
  }
  if (diffDays <= 30) {
    return { label: `${diffDays}d away`, colorClass: 'text-amber-600', isPast: false };
  }
  return { label: `${diffDays}d away`, colorClass: 'text-emerald-600', isPast: false };
}

interface DateTimelineProps {
  dates: ContractDate[];
}
export function DateTimeline({ dates }: DateTimelineProps) {
  if (dates.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-6">
          Key Dates &amp; Milestones
        </h3>
        <div className="flex flex-col items-center py-8 text-center">
          <Calendar className="w-8 h-8 text-slate-300 mb-3" />
          <p className="text-sm text-slate-500">
            No dates found in this contract
          </p>
        </div>
      </div>
    );
  }
  const sortedDates = [...dates].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const getIcon = (type: ContractDate['type']) => {
    switch (type) {
      case 'Start':
        return Calendar;
      case 'Milestone':
        return Flag;
      case 'Deadline':
        return AlertCircle;
      case 'Expiry':
        return Clock;
      default:
        return Calendar;
    }
  };
  const getColor = (type: ContractDate['type']) => {
    switch (type) {
      case 'Start':
        return 'bg-emerald-100 text-emerald-600';
      case 'Milestone':
        return 'bg-blue-100 text-blue-600';
      case 'Deadline':
        return 'bg-amber-100 text-amber-600';
      case 'Expiry':
        return 'bg-slate-100 text-slate-600';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-6">
        Key Dates & Milestones
      </h3>
      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-100" />
        <div className="space-y-6">
          {sortedDates.map((date, index) => {
            const Icon = getIcon(date.type);
            const colorClass = getColor(date.type);
            const urgency = getDateUrgency(date.date);
            return (
              <div
                key={`${date.label}-${date.date}-${index}`}
                className="relative flex items-center"
              >
                <div
                  className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center border-2 border-white shadow-sm ${colorClass}`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="ml-4 flex-1">
                  <div className="flex justify-between items-baseline">
                    <h4 className="text-sm font-medium text-slate-900">
                      {date.label}
                    </h4>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium ${urgency.colorClass}`}>
                        {urgency.label}
                      </span>
                      <span className={`text-xs font-mono text-slate-500${urgency.isPast ? ' line-through' : ''}`}>
                        {date.date}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{date.type}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
