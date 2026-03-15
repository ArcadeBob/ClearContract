import React from 'react';
import { LegalMeta } from '../../types/contract';
import { IndemnificationBadge } from './IndemnificationBadge';
import { PaymentContingencyBadge } from './PaymentContingencyBadge';
import { LiquidatedDamagesBadge } from './LiquidatedDamagesBadge';
import { RetainageBadge } from './RetainageBadge';
import { InsuranceBadge } from './InsuranceBadge';
import { TerminationBadge } from './TerminationBadge';
import { FlowDownBadge } from './FlowDownBadge';
import { NoDamageDelayBadge } from './NoDamageDelayBadge';
import { LienRightsBadge } from './LienRightsBadge';
import { DisputeResolutionBadge } from './DisputeResolutionBadge';
import { ChangeOrderBadge } from './ChangeOrderBadge';

type ClauseType = LegalMeta['clauseType'];

const BADGE_MAP: Record<ClauseType, React.FC<{ meta: any }>> = {
  'indemnification': IndemnificationBadge,
  'payment-contingency': PaymentContingencyBadge,
  'liquidated-damages': LiquidatedDamagesBadge,
  'retainage': RetainageBadge,
  'insurance': InsuranceBadge,
  'termination': TerminationBadge,
  'flow-down': FlowDownBadge,
  'no-damage-delay': NoDamageDelayBadge,
  'lien-rights': LienRightsBadge,
  'dispute-resolution': DisputeResolutionBadge,
  'change-order': ChangeOrderBadge,
};

interface LegalMetaBadgeProps {
  meta: LegalMeta;
}

export function LegalMetaBadge({ meta }: LegalMetaBadgeProps) {
  const Badge = BADGE_MAP[meta.clauseType];
  if (!Badge) return null;

  return (
    <div className="flex flex-wrap items-center gap-1 mt-2">
      <Badge meta={meta} />
    </div>
  );
}
