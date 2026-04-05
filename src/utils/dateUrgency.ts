export type UrgencyGroup = 'overdue' | 'this-week' | 'this-month' | 'later';

export interface UrgencyConfig {
  key: UrgencyGroup;
  label: string;
  colorClass: string;
  bgClass: string;
  iconColor: string;
}

export const URGENCY_GROUPS: UrgencyConfig[] = [
  { key: 'overdue',    label: 'Overdue',    colorClass: 'text-red-600',    bgClass: 'bg-red-50',    iconColor: 'text-red-500' },
  { key: 'this-week',  label: 'This Week',  colorClass: 'text-amber-600',  bgClass: 'bg-amber-50',  iconColor: 'text-amber-500' },
  { key: 'this-month', label: 'This Month', colorClass: 'text-blue-600',   bgClass: 'bg-blue-50',   iconColor: 'text-blue-500' },
  { key: 'later',      label: 'Later',      colorClass: 'text-slate-600',  bgClass: 'bg-slate-50',  iconColor: 'text-slate-400' },
];

export interface TimelineEntry {
  label: string;
  date: string;
  type: 'Start' | 'Milestone' | 'Deadline' | 'Expiry';
  contractId: string;
  contractName: string;
  urgencyGroup: UrgencyGroup;
}

function getDiffDays(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  // Parse as local date to avoid UTC offset issues with YYYY-MM-DD strings
  const [y, m, d] = dateStr.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  return Math.round((target.getTime() - now.getTime()) / 86400000);
}

export function getUrgencyGroup(dateStr: string): UrgencyGroup | null {
  const diffDays = getDiffDays(dateStr);
  if (diffDays < -30) return null;
  if (diffDays < 0) return 'overdue';
  if (diffDays <= 7) return 'this-week';
  if (diffDays <= 30) return 'this-month';
  return 'later';
}

export function getRelativeLabel(dateStr: string): string {
  const diffDays = getDiffDays(dateStr);
  if (diffDays < 0) return `${Math.abs(diffDays)}d ago`;
  if (diffDays === 0) return 'Today';
  return `${diffDays}d away`;
}

export function countDeadlinesWithin7Days(dates: Array<{ date: string }>): number {
  return dates.filter(d => {
    const diff = getDiffDays(d.date);
    return diff >= 0 && diff <= 7;
  }).length;
}

export function groupDatesByUrgency(
  contracts: Array<{
    id: string;
    name: string;
    status: string;
    dates: Array<{ label: string; date: string; type: 'Start' | 'Milestone' | 'Deadline' | 'Expiry' }>;
  }>
): Record<UrgencyGroup, TimelineEntry[]> {
  const groups: Record<UrgencyGroup, TimelineEntry[]> = {
    overdue: [],
    'this-week': [],
    'this-month': [],
    later: [],
  };

  contracts
    .filter(c => c.status === 'Reviewed' || c.status === 'Partial')
    .forEach(c => {
      c.dates.forEach(d => {
        const urgency = getUrgencyGroup(d.date);
        if (urgency === null) return;
        groups[urgency].push({
          label: d.label,
          date: d.date,
          type: d.type,
          contractId: c.id,
          contractName: c.name,
          urgencyGroup: urgency,
        });
      });
    });

  // Sort each group by date ascending
  for (const key of Object.keys(groups) as UrgencyGroup[]) {
    groups[key].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  return groups;
}
