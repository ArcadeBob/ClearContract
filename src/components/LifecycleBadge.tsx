import type { LifecycleStatus } from '../types/contract';
import { LIFECYCLE_BADGE_COLORS } from '../utils/palette';

interface LifecycleBadgeProps {
  status: LifecycleStatus;
  className?: string;
}

export function LifecycleBadge({ status, className = '' }: LifecycleBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-normal border ${LIFECYCLE_BADGE_COLORS[status]} ${className}`}
    >
      {status}
    </span>
  );
}
