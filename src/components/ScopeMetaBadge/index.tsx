import React from 'react';
import { ScopeMeta } from '../../types/contract';
import { ScopeOfWorkBadge } from './ScopeOfWorkBadge';
import { DatesDeadlinesBadge } from './DatesDeadlinesBadge';
import { VerbiageBadge } from './VerbiageBadge';
import { LaborComplianceBadge } from './LaborComplianceBadge';
import { SpecReconciliationBadge } from './SpecReconciliationBadge';
import { ExclusionStressTestBadge } from './ExclusionStressTestBadge';

type PassType = ScopeMeta['passType'];

const BADGE_MAP: Record<PassType, React.FC<{ meta: any }>> = {
  'scope-extraction': ScopeOfWorkBadge,
  'dates-deadlines': DatesDeadlinesBadge,
  'verbiage': VerbiageBadge,
  'labor-compliance': LaborComplianceBadge,
  'spec-reconciliation': SpecReconciliationBadge,
  'exclusion-stress-test': ExclusionStressTestBadge,
};

interface ScopeMetaBadgeProps {
  meta: ScopeMeta;
}

export function ScopeMetaBadge({ meta }: ScopeMetaBadgeProps) {
  const Badge = BADGE_MAP[meta.passType];
  if (!Badge) return null;

  return <Badge meta={meta} />;
}
