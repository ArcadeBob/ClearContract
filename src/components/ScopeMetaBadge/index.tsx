import React from 'react';
import { ScopeMeta } from '../../types/contract';
import { ScopeOfWorkBadge } from './ScopeOfWorkBadge';
import { DatesDeadlinesBadge } from './DatesDeadlinesBadge';
import { VerbiageBadge } from './VerbiageBadge';
import { LaborComplianceBadge } from './LaborComplianceBadge';
import { SpecReconciliationBadge } from './SpecReconciliationBadge';
import { ExclusionStressTestBadge } from './ExclusionStressTestBadge';
import { BidReconciliationBadge } from './BidReconciliationBadge';

type PassType = ScopeMeta['passType'];

// Stub badge for passes whose UI is deferred to Plan 02
const StubBadge: React.FC<{ meta: any }> = () => null;

const BADGE_MAP: Record<PassType, React.FC<{ meta: any }>> = {
  'scope-extraction': ScopeOfWorkBadge,
  'dates-deadlines': DatesDeadlinesBadge,
  'verbiage': VerbiageBadge,
  'labor-compliance': LaborComplianceBadge,
  'spec-reconciliation': SpecReconciliationBadge,
  'exclusion-stress-test': ExclusionStressTestBadge,
  'bid-reconciliation': BidReconciliationBadge,
  'warranty': StubBadge,
  'safety-osha': StubBadge,
};

interface ScopeMetaBadgeProps {
  meta: ScopeMeta;
}

export function ScopeMetaBadge({ meta }: ScopeMetaBadgeProps) {
  const Badge = BADGE_MAP[meta.passType];
  if (!Badge) return null;

  return <Badge meta={meta} />;
}
