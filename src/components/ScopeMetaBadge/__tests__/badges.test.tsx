import { describe, it, expect } from 'vitest';
import { render } from '../../../test/render';
import { ScopeOfWorkBadge } from '../ScopeOfWorkBadge';
import { DatesDeadlinesBadge } from '../DatesDeadlinesBadge';
import { VerbiageBadge } from '../VerbiageBadge';
import { LaborComplianceBadge } from '../LaborComplianceBadge';
import {
  createScopeOfWorkFinding,
  createDatesDeadlinesFinding,
  createVerbiageFinding,
  createLaborComplianceFinding,
} from '../../../test/factories';

const BADGES = [
  { Badge: ScopeOfWorkBadge, factory: createScopeOfWorkFinding, name: 'ScopeOfWorkBadge' },
  { Badge: DatesDeadlinesBadge, factory: createDatesDeadlinesFinding, name: 'DatesDeadlinesBadge' },
  { Badge: VerbiageBadge, factory: createVerbiageFinding, name: 'VerbiageBadge' },
  { Badge: LaborComplianceBadge, factory: createLaborComplianceFinding, name: 'LaborComplianceBadge' },
] as const;

describe.each(BADGES)('$name', ({ Badge, factory }) => {
  it('renders without error', () => {
    const finding = factory();
    const { container } = render(<Badge meta={finding as any} />);
    expect(container.firstChild).not.toBeNull();
  });
});
