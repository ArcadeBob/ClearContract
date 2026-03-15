import { LegalMeta } from '../../types/contract';
import { pillBase } from './shared';

type ChangeOrderMeta = Extract<LegalMeta, { clauseType: 'change-order' }>;

interface ChangeOrderBadgeProps {
  meta: ChangeOrderMeta;
}

export function ChangeOrderBadge({ meta }: ChangeOrderBadgeProps) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-1">
        <span
          className={`${pillBase} ${
            meta.changeType === 'unilateral-no-adjustment'
              ? 'bg-red-100 text-red-700'
              : meta.changeType === 'unilateral-with-adjustment'
                ? 'bg-amber-100 text-amber-700'
                : meta.changeType === 'mutual'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-slate-100 text-slate-700'
          }`}
        >
          {meta.changeType === 'unilateral-no-adjustment'
            ? 'Unilateral (No Adjustment)'
            : meta.changeType === 'unilateral-with-adjustment'
              ? 'Unilateral (With Adjustment)'
              : meta.changeType === 'mutual'
                ? 'Mutual'
                : meta.changeType === 'unspecified'
                  ? 'Unspecified'
                  : meta.changeType}
        </span>
        {meta.proceedPending && (
          <span className={`${pillBase} bg-red-100 text-red-700`}>
            Must Proceed Before Approval
          </span>
        )}
        <span className={`${pillBase} bg-slate-100 text-slate-700`}>
          Notice: {meta.noticeRequired}
        </span>
        <span className={`${pillBase} bg-slate-100 text-slate-700`}>
          Pricing: {meta.pricingMechanism}
        </span>
      </div>
    </div>
  );
}
