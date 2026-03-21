import { describe, it, expect } from 'vitest';
import { render } from '../../../test/render';
import { IndemnificationBadge } from '../IndemnificationBadge';
import { PaymentContingencyBadge } from '../PaymentContingencyBadge';
import { LiquidatedDamagesBadge } from '../LiquidatedDamagesBadge';
import { RetainageBadge } from '../RetainageBadge';
import { InsuranceBadge } from '../InsuranceBadge';
import { TerminationBadge } from '../TerminationBadge';
import { FlowDownBadge } from '../FlowDownBadge';
import { NoDamageDelayBadge } from '../NoDamageDelayBadge';
import { LienRightsBadge } from '../LienRightsBadge';
import { DisputeResolutionBadge } from '../DisputeResolutionBadge';
import { ChangeOrderBadge } from '../ChangeOrderBadge';
import {
  createIndemnificationFinding,
  createPaymentContingencyFinding,
  createLiquidatedDamagesFinding,
  createRetainageFinding,
  createInsuranceFinding,
  createTerminationFinding,
  createFlowDownFinding,
  createNoDamageDelayFinding,
  createLienRightsFinding,
  createDisputeResolutionFinding,
  createChangeOrderFinding,
} from '../../../test/factories';

const BADGES = [
  { Badge: IndemnificationBadge, factory: createIndemnificationFinding, name: 'IndemnificationBadge' },
  { Badge: PaymentContingencyBadge, factory: createPaymentContingencyFinding, name: 'PaymentContingencyBadge' },
  { Badge: LiquidatedDamagesBadge, factory: createLiquidatedDamagesFinding, name: 'LiquidatedDamagesBadge' },
  { Badge: RetainageBadge, factory: createRetainageFinding, name: 'RetainageBadge' },
  { Badge: InsuranceBadge, factory: createInsuranceFinding, name: 'InsuranceBadge' },
  { Badge: TerminationBadge, factory: createTerminationFinding, name: 'TerminationBadge' },
  { Badge: FlowDownBadge, factory: createFlowDownFinding, name: 'FlowDownBadge' },
  { Badge: NoDamageDelayBadge, factory: createNoDamageDelayFinding, name: 'NoDamageDelayBadge' },
  { Badge: LienRightsBadge, factory: createLienRightsFinding, name: 'LienRightsBadge' },
  { Badge: DisputeResolutionBadge, factory: createDisputeResolutionFinding, name: 'DisputeResolutionBadge' },
  { Badge: ChangeOrderBadge, factory: createChangeOrderFinding, name: 'ChangeOrderBadge' },
] as const;

describe.each(BADGES)('$name', ({ Badge, factory }) => {
  it('renders without error', () => {
    const finding = factory();
    // Each badge takes a `meta` prop which is a subset of the finding's pass-specific fields
    // The factory returns the full finding; we pass it as meta since the badge reads from it
    const { container } = render(<Badge meta={finding as any} />);
    expect(container.firstChild).not.toBeNull();
  });
});
