import { Severity } from '../types/contract';
import { SEVERITY_BADGE_COLORS } from '../utils/palette';

interface SeverityBadgeProps {
  severity: Severity;
  downgradedFrom?: Severity;
  className?: string;
}
export function SeverityBadge({
  severity,
  downgradedFrom,
  className = '',
}: SeverityBadgeProps) {
  const badge = (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${SEVERITY_BADGE_COLORS[severity]} ${className}`}
    >
      {severity}
    </span>
  );

  if (downgradedFrom) {
    return (
      <span className="inline-flex items-center gap-1">
        {badge}
        <span className="text-xs text-slate-400 font-medium">
          was {downgradedFrom}
        </span>
      </span>
    );
  }

  return badge;
}
