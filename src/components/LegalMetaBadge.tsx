import React from 'react';
import { LegalMeta } from '../types/contract';

interface LegalMetaBadgeProps {
  meta: LegalMeta;
}

const pillBase = 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mr-2';

export function LegalMetaBadge({ meta }: LegalMetaBadgeProps) {
  return (
    <div className="flex flex-wrap items-center gap-1 mt-2">
      {meta.clauseType === 'indemnification' && (
        <>
          <span
            className={`${pillBase} ${
              meta.riskType === 'broad'
                ? 'bg-red-100 text-red-700'
                : meta.riskType === 'intermediate'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-green-100 text-green-700'
            }`}
          >
            {meta.riskType === 'broad'
              ? 'Broad Form'
              : meta.riskType === 'intermediate'
                ? 'Intermediate Form'
                : 'Limited Form'}
          </span>
          {meta.hasInsuranceGap && (
            <span className={`${pillBase} bg-red-100 text-red-700`}>
              Insurance Gap
            </span>
          )}
        </>
      )}

      {meta.clauseType === 'payment-contingency' && (
        <div>
          <div>
            <span
              className={`${pillBase} ${
                meta.paymentType === 'pay-if-paid'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-amber-100 text-amber-700'
              }`}
            >
              {meta.paymentType === 'pay-if-paid' ? 'Pay-if-Paid' : 'Pay-when-Paid'}
            </span>
          </div>
          {meta.enforceabilityContext && (
            <p className="text-xs text-slate-500 mt-1 italic">
              {meta.enforceabilityContext}
            </p>
          )}
        </div>
      )}

      {meta.clauseType === 'liquidated-damages' && (
        <div>
          <div className="flex flex-wrap items-center gap-1">
            <span
              className={`${pillBase} ${
                meta.capStatus === 'uncapped'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-green-100 text-green-700'
              }`}
            >
              {meta.capStatus === 'uncapped' ? 'Uncapped' : 'Capped'}
            </span>
            <span className={`${pillBase} bg-slate-100 text-slate-700`}>
              {meta.amountOrRate}
            </span>
          </div>
          {meta.proportionalityAssessment && (
            <p className="text-xs text-slate-500 mt-1 italic">
              {meta.proportionalityAssessment}
            </p>
          )}
        </div>
      )}

      {meta.clauseType === 'retainage' && (
        <div>
          <div className="flex flex-wrap items-center gap-1">
            <span className={`${pillBase} bg-slate-100 text-slate-700`}>
              {meta.percentage}
            </span>
            <span
              className={`${pillBase} ${
                meta.tiedTo === 'sub-work'
                  ? 'bg-green-100 text-green-700'
                  : meta.tiedTo === 'project-completion'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-red-100 text-red-700'
              }`}
            >
              {meta.tiedTo === 'sub-work'
                ? "Tied to Sub's Work"
                : meta.tiedTo === 'project-completion'
                  ? 'Tied to Project Completion'
                  : 'Release Unspecified'}
            </span>
          </div>
          {meta.releaseCondition && (
            <p className="text-xs text-slate-500 mt-1 italic">
              {meta.releaseCondition}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
