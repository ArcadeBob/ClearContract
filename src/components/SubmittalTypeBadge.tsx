import type { SubmittalEntry } from '../types/contract';

const TYPE_STYLES: Record<SubmittalEntry['type'], string> = {
  'shop-drawing': 'bg-indigo-100 text-indigo-700 border-indigo-200',
  'sample': 'bg-teal-100 text-teal-700 border-teal-200',
  'mockup': 'bg-purple-100 text-purple-700 border-purple-200',
  'product-data': 'bg-cyan-100 text-cyan-700 border-cyan-200',
};

const TYPE_LABELS: Record<SubmittalEntry['type'], string> = {
  'shop-drawing': 'Shop Drawing',
  'sample': 'Sample',
  'mockup': 'Mockup',
  'product-data': 'Product Data',
};

interface SubmittalTypeBadgeProps {
  type: SubmittalEntry['type'];
}

export function SubmittalTypeBadge({ type }: SubmittalTypeBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${TYPE_STYLES[type]}`}
    >
      {TYPE_LABELS[type]}
    </span>
  );
}
