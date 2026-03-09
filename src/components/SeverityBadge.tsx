import { Severity } from '../types/contract';
interface SeverityBadgeProps {
  severity: Severity;
  downgradedFrom?: Severity;
  className?: string;
}
export function SeverityBadge({
  severity,
  downgradedFrom,
  className = ''
}: SeverityBadgeProps) {
  const colors = {
    Critical: 'bg-red-100 text-red-700 border-red-200',
    High: 'bg-amber-100 text-amber-700 border-amber-200',
    Medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    Low: 'bg-blue-100 text-blue-700 border-blue-200',
    Info: 'bg-slate-100 text-slate-700 border-slate-200'
  };

  const badge = (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors[severity]} ${className}`}>
      {severity}
    </span>
  );

  if (downgradedFrom) {
    return (
      <span className="inline-flex items-center gap-1">
        {badge}
        <span className="text-xs text-slate-400 font-medium">was {downgradedFrom}</span>
      </span>
    );
  }

  return badge;
}
