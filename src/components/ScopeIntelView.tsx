import type { Contract } from '../types/contract';
import { SubmittalTimeline } from './SubmittalTimeline';
import { SpecGapMatrix } from './SpecGapMatrix';
import { BidContractDiff } from './BidContractDiff';

interface ScopeIntelViewProps {
  contract: Contract;
}

export function ScopeIntelView({ contract }: ScopeIntelViewProps) {
  const submittals = contract.submittals ?? [];
  const specGapFindings = contract.findings.filter(
    (f) => f.sourcePass === 'spec-reconciliation'
  );
  const bidReconcFindings = contract.findings.filter(
    (f) => f.sourcePass === 'bid-reconciliation'
  );

  return (
    <div className="space-y-6">
      <SubmittalTimeline submittals={submittals} dates={contract.dates} />
      <SpecGapMatrix findings={specGapFindings} />
      <BidContractDiff findings={bidReconcFindings} hasBid={!!contract.bidFileName} />
    </div>
  );
}
