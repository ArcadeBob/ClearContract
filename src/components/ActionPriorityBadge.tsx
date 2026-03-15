interface ActionPriorityBadgeProps {
  priority: 'pre-bid' | 'pre-sign' | 'monitor';
}

const priorityConfig: Record<string, { label: string; classes: string }> = {
  'pre-bid': { label: 'Pre-Bid', classes: 'bg-orange-100 text-orange-700' },
  'pre-sign': { label: 'Pre-Sign', classes: 'bg-blue-100 text-blue-700' },
  monitor: { label: 'Monitor', classes: 'bg-slate-100 text-slate-600' },
};

export function ActionPriorityBadge({ priority }: ActionPriorityBadgeProps) {
  const config = priorityConfig[priority];
  if (!config) return null;

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${config.classes}`}
    >
      {config.label}
    </span>
  );
}
