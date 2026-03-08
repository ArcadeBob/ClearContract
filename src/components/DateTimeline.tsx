import { ContractDate } from '../types/contract';
import { Calendar, Flag, AlertCircle, Clock } from 'lucide-react';
interface DateTimelineProps {
  dates: ContractDate[];
}
export function DateTimeline({ dates }: DateTimelineProps) {
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
          {sortedDates.map((date, idx) => {
            const Icon = getIcon(date.type);
            const colorClass = getColor(date.type);
            return (
              <div key={idx} className="relative flex items-center">
                <div
                  className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center border-2 border-white shadow-sm ${colorClass}`}>

                  <Icon className="w-4 h-4" />
                </div>
                <div className="ml-4 flex-1">
                  <div className="flex justify-between items-baseline">
                    <h4 className="text-sm font-medium text-slate-900">
                      {date.label}
                    </h4>
                    <span className="text-xs font-mono text-slate-500">
                      {date.date}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{date.type}</p>
                </div>
              </div>);

          })}
        </div>
      </div>
    </div>);

}