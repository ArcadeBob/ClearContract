import React from 'react';
import { ScopeMeta } from '../../types/contract';
import { ScopeOfWorkBadge } from './ScopeOfWorkBadge';
import { DatesDeadlinesBadge } from './DatesDeadlinesBadge';
import { VerbiageBadge } from './VerbiageBadge';
import { LaborComplianceBadge } from './LaborComplianceBadge';

type PassType = ScopeMeta['passType'];

// Stub badges for Stage 3 passes (UI implementation deferred to Phase 59 Plan 02)
const StubBadge: React.FC<{ meta: any }> = () => null;

const BADGE_MAP: Record<PassType, React.FC<{ meta: any }>> = {
  'scope-extraction': ScopeOfWorkBadge,
  'dates-deadlines': DatesDeadlinesBadge,
  'verbiage': VerbiageBadge,
  'labor-compliance': LaborComplianceBadge,
  'spec-reconciliation': StubBadge,
  'exclusion-stress-test': StubBadge,
};

interface ScopeMetaBadgeProps {
  meta: ScopeMeta;
}

export function ScopeMetaBadge({ meta }: ScopeMetaBadgeProps) {
  const Badge = BADGE_MAP[meta.passType];
  if (!Badge) return null;

  return <Badge meta={meta} />;
}
