import { LegalMeta } from '../../types/contract';
import { pillBase } from './shared';

type DisputeResolutionMeta = Extract<LegalMeta, { clauseType: 'dispute-resolution' }>;

interface DisputeResolutionBadgeProps {
  meta: DisputeResolutionMeta;
}

export function DisputeResolutionBadge({ meta }: DisputeResolutionBadgeProps) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-1">
        <span
          className={`${pillBase} ${
            meta.mechanism === 'mandatory-arbitration'
              ? 'bg-red-100 text-red-700'
              : meta.mechanism === 'litigation'
                ? 'bg-amber-100 text-amber-700'
                : meta.mechanism === 'mediation-then-arbitration' ||
                    meta.mechanism === 'mediation-then-litigation'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-slate-100 text-slate-700'
          }`}
        >
          {meta.mechanism === 'mandatory-arbitration'
            ? 'Mandatory Arbitration'
            : meta.mechanism === 'litigation'
              ? 'Litigation'
              : meta.mechanism === 'mediation-then-arbitration'
                ? 'Mediation then Arbitration'
                : meta.mechanism === 'mediation-then-litigation'
                  ? 'Mediation then Litigation'
                  : meta.mechanism === 'unspecified'
                    ? 'Unspecified'
                    : meta.mechanism}
        </span>
        <span className={`${pillBase} bg-slate-100 text-slate-700`}>
          Venue: {meta.venue}
        </span>
        <span
          className={`${pillBase} ${
            meta.feeShifting === 'one-sided'
              ? 'bg-red-100 text-red-700'
              : meta.feeShifting === 'mutual'
                ? 'bg-green-100 text-green-700'
                : 'bg-slate-100 text-slate-700'
          }`}
        >
          {meta.feeShifting === 'one-sided'
            ? 'One-Sided Fees'
            : meta.feeShifting === 'mutual'
              ? 'Mutual Fees'
              : meta.feeShifting === 'none'
                ? 'No Fee Shifting'
                : meta.feeShifting === 'unspecified'
                  ? 'Fee Shifting Unspecified'
                  : meta.feeShifting}
        </span>
        {meta.mediationRequired && (
          <span className={`${pillBase} bg-green-100 text-green-700`}>
            Mediation Required
          </span>
        )}
      </div>
    </div>
  );
}
