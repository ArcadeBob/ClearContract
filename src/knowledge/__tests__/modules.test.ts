import { describe, it, expect } from 'vitest';

// Regulatory modules
import { caLienLaw } from '../regulatory/ca-lien-law';
import { caPrevailingWage } from '../regulatory/ca-prevailing-wage';
import { caTitle24 } from '../regulatory/ca-title24';
import { caCalosha } from '../regulatory/ca-calosha';
import { caInsuranceLaw } from '../regulatory/ca-insurance-law';
import { caPublicWorksPayment } from '../regulatory/ca-public-works-payment';
import { caDisputeResolution } from '../regulatory/ca-dispute-resolution';
import { caLiquidatedDamages } from '../regulatory/ca-liquidated-damages';

// Trade modules
import { div08Scope } from '../trade/div08-scope';
import { glazingSubProtections } from '../trade/glazing-sub-protections';

// Standards modules
import { standardsValidation } from '../standards/standards-validation';
import { contractForms } from '../standards/contract-forms';

import { TOKEN_CAP_PER_MODULE } from '../tokenBudget';

const ALL_MODULES = [
  { mod: caLienLaw, domain: 'regulatory' as const },
  { mod: caPrevailingWage, domain: 'regulatory' as const },
  { mod: caTitle24, domain: 'regulatory' as const },
  { mod: caCalosha, domain: 'regulatory' as const },
  { mod: caInsuranceLaw, domain: 'regulatory' as const },
  { mod: caPublicWorksPayment, domain: 'regulatory' as const },
  { mod: caDisputeResolution, domain: 'regulatory' as const },
  { mod: caLiquidatedDamages, domain: 'regulatory' as const },
  { mod: div08Scope, domain: 'trade' as const },
  { mod: glazingSubProtections, domain: 'trade' as const },
  { mod: standardsValidation, domain: 'standards' as const },
  { mod: contractForms, domain: 'standards' as const },
];

describe.each(ALL_MODULES)('Knowledge: $mod.id', ({ mod, domain }) => {
  it('has all required fields', () => {
    expect(mod.id).toBeTruthy();
    expect(mod.title).toBeTruthy();
    expect(mod.domain).toBe(domain);
    expect(mod.effectiveDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(mod.reviewByDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(mod.expirationDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(mod.content).toBeTruthy();
    expect(mod.tokenEstimate).toBeGreaterThan(0);
  });

  it('token estimate matches content and is under cap', () => {
    expect(mod.tokenEstimate).toBe(Math.ceil(mod.content.length / 4));
    expect(mod.tokenEstimate).toBeLessThanOrEqual(TOKEN_CAP_PER_MODULE);
  });
});
