import { LegalMeta } from '../types/contract';

interface LegalMetaBadgeProps {
  meta: LegalMeta;
}

const pillBase =
  'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mr-2';

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

      {meta.clauseType === 'insurance' && (
        <div>
          {meta.coverageItems.length > 0 && (
            <div className="space-y-1 mb-2">
              {meta.coverageItems.map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span
                    className={`w-2 h-2 rounded-full ${item.isAboveStandard ? 'bg-amber-400' : 'bg-green-400'}`}
                  />
                  <span className="font-medium text-slate-700">
                    {item.coverageType}:
                  </span>
                  <span className="text-slate-600">{item.requiredLimit}</span>
                  {item.isAboveStandard && (
                    <span className={`${pillBase} bg-amber-100 text-amber-700`}>
                      Above Standard
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
          {meta.endorsements.length > 0 && (
            <div className="flex flex-wrap items-center gap-1 mb-1">
              {meta.endorsements.map((end, i) => (
                <span
                  key={i}
                  className={`${pillBase} ${end.isNonStandard ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}
                >
                  {end.endorsementType}
                </span>
              ))}
            </div>
          )}
          {meta.certificateHolder && (
            <p className="text-xs text-slate-500 mt-1">
              Certificate Holder: {meta.certificateHolder}
            </p>
          )}
        </div>
      )}

      {meta.clauseType === 'termination' && (
        <div>
          <div className="flex flex-wrap items-center gap-1">
            <span
              className={`${pillBase} ${
                meta.terminationType === 'for-convenience'
                  ? 'bg-red-100 text-red-700'
                  : meta.terminationType === 'for-cause'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-green-100 text-green-700'
              }`}
            >
              {meta.terminationType === 'for-convenience'
                ? 'For Convenience'
                : meta.terminationType === 'for-cause'
                  ? 'For Cause'
                  : meta.terminationType === 'mutual'
                    ? 'Mutual'
                    : meta.terminationType}
            </span>
            <span className={`${pillBase} bg-slate-100 text-slate-700`}>
              Notice: {meta.noticePeriod}
            </span>
            {meta.curePeriod && meta.curePeriod !== 'N/A' && (
              <span className={`${pillBase} bg-slate-100 text-slate-700`}>
                Cure: {meta.curePeriod}
              </span>
            )}
          </div>
          {meta.compensation && (
            <p className="text-xs text-slate-500 mt-1 italic">
              {meta.compensation}
            </p>
          )}
        </div>
      )}

      {meta.clauseType === 'flow-down' && (
        <div>
          <div className="flex flex-wrap items-center gap-1">
            <span
              className={`${pillBase} ${
                meta.flowDownScope === 'blanket'
                  ? 'bg-red-100 text-red-700'
                  : meta.flowDownScope === 'specific-sections'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-green-100 text-green-700'
              }`}
            >
              {meta.flowDownScope === 'blanket'
                ? 'Blanket Flow-Down'
                : meta.flowDownScope === 'specific-sections'
                  ? 'Specific Sections'
                  : meta.flowDownScope === 'targeted-with-exceptions'
                    ? 'Targeted with Exceptions'
                    : meta.flowDownScope}
            </span>
            <span
              className={`${pillBase} ${
                meta.primeContractAvailable
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              {meta.primeContractAvailable
                ? 'Prime Contract Available'
                : 'Prime Contract Not Available'}
            </span>
          </div>
          {meta.problematicObligations.length > 0 && (
            <ul className="mt-1 ml-3 list-disc text-xs text-slate-600">
              {meta.problematicObligations.map((obligation, i) => (
                <li key={i}>{obligation}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {meta.clauseType === 'no-damage-delay' && (
        <div>
          <div className="flex flex-wrap items-center gap-1">
            <span
              className={`${pillBase} ${
                meta.waiverScope === 'absolute'
                  ? 'bg-red-100 text-red-700'
                  : meta.waiverScope === 'broad-with-exceptions'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-yellow-100 text-yellow-700'
              }`}
            >
              {meta.waiverScope === 'absolute'
                ? 'Absolute Waiver'
                : meta.waiverScope === 'broad-with-exceptions'
                  ? 'Broad with Exceptions'
                  : meta.waiverScope === 'reasonable-exceptions'
                    ? 'Reasonable Exceptions'
                    : meta.waiverScope}
            </span>
          </div>
          {meta.exceptions.length > 0 && (
            <div className="flex flex-wrap items-center gap-1 mt-1">
              {meta.exceptions.map((exception, i) => (
                <span
                  key={i}
                  className={`${pillBase} bg-green-100 text-green-700`}
                >
                  {exception}
                </span>
              ))}
            </div>
          )}
          {meta.enforceabilityContext && (
            <p className="text-xs text-slate-500 mt-1 italic">
              {meta.enforceabilityContext}
            </p>
          )}
        </div>
      )}

      {meta.clauseType === 'lien-rights' && (
        <div>
          <div className="flex flex-wrap items-center gap-1">
            <span
              className={`${pillBase} ${
                meta.waiverType === 'no-lien-clause' ||
                meta.waiverType === 'unconditional-before-payment'
                  ? 'bg-red-100 text-red-700'
                  : meta.waiverType === 'broad-release'
                    ? 'bg-amber-100 text-amber-700'
                    : meta.waiverType === 'conditional'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-slate-100 text-slate-700'
              }`}
            >
              {meta.waiverType === 'no-lien-clause'
                ? 'No-Lien Clause'
                : meta.waiverType === 'unconditional-before-payment'
                  ? 'Unconditional Before Payment'
                  : meta.waiverType === 'broad-release'
                    ? 'Broad Release'
                    : meta.waiverType === 'conditional'
                      ? 'Conditional'
                      : meta.waiverType === 'missing'
                        ? 'Missing'
                        : meta.waiverType}
            </span>
            {meta.lienFilingDeadline &&
              meta.lienFilingDeadline !== 'Unknown' && (
                <span className={`${pillBase} bg-slate-100 text-slate-700`}>
                  Filing Deadline: {meta.lienFilingDeadline}
                </span>
              )}
          </div>
          {meta.enforceabilityContext && (
            <p className="text-xs text-slate-500 mt-1 italic">
              {meta.enforceabilityContext}
            </p>
          )}
        </div>
      )}

      {meta.clauseType === 'dispute-resolution' && (
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
      )}

      {meta.clauseType === 'change-order' && (
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
      )}
    </div>
  );
}
