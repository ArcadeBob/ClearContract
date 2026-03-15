import { LegalMeta } from '../../types/contract';
import { pillBase } from './shared';

type PaymentContingencyMeta = Extract<LegalMeta, { clauseType: 'payment-contingency' }>;

interface PaymentContingencyBadgeProps {
  meta: PaymentContingencyMeta;
}

export function PaymentContingencyBadge({ meta }: PaymentContingencyBadgeProps) {
  return (
    <div>
      <div>
        <span
          className={`${pillBase} ${
            meta.paymentType === 'pay-if-paid'
              ? 'bg-red-100 text-red-700'
              : 'bg-amber-100 text-amber-700'
          }`}
        >
          {meta.paymentType === 'pay-if-paid'
            ? 'Pay-if-Paid'
            : 'Pay-when-Paid'}
        </span>
      </div>
      {meta.enforceabilityContext && (
        <p className="text-xs text-slate-500 mt-1 italic">
          {meta.enforceabilityContext}
        </p>
      )}
    </div>
  );
}
