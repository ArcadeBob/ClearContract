import { describe, it, expect } from 'vitest';
import { computeBidSignal, generateFactorReasons } from './bidSignal';
import { createFinding } from '../test/factories';

describe('computeBidSignal', () => {
  // --- Empty state ---
  it('returns score=100, level=bid, label=Bid Recommended with no findings', () => {
    const result = computeBidSignal([]);
    expect(result.score).toBe(100);
    expect(result.level).toBe('bid');
    expect(result.label).toBe('Bid Recommended');
    expect(result.factors).toHaveLength(5);
    result.factors.forEach((f) => {
      expect(f.score).toBe(100);
    });
  });

  // --- Individual factor isolation ---
  it('applies Critical penalty to Insurance factor only', () => {
    const findings = [
      createFinding({ severity: 'Critical', category: 'Insurance Requirements' }),
    ];
    const result = computeBidSignal(findings);
    const insurance = result.factors.find((f) => f.name === 'Insurance')!;
    expect(insurance.score).toBe(75); // 100 - 25
    // weighted: 75*0.25 + 100*0.25 + 100*0.2 + 100*0.15 + 100*0.15 = 93.75 -> 94
    expect(result.score).toBe(94);
    expect(result.level).toBe('bid');
  });

  it('applies Critical penalty to Scope factor only', () => {
    const findings = [
      createFinding({ severity: 'Critical', category: 'Scope of Work' }),
    ];
    const result = computeBidSignal(findings);
    const scope = result.factors.find((f) => f.name === 'Scope')!;
    expect(scope.score).toBe(75);
    // weighted: 100*0.25 + 100*0.25 + 75*0.2 + 100*0.15 + 100*0.15 = 95
    expect(result.score).toBe(95);
    expect(result.level).toBe('bid');
  });

  it('applies Critical penalty to Payment factor only', () => {
    const findings = [
      createFinding({
        severity: 'Critical',
        category: 'Financial Terms',
        sourcePass: 'legal-payment-contingency',
      }),
    ];
    const result = computeBidSignal(findings);
    const payment = result.factors.find((f) => f.name === 'Payment')!;
    expect(payment.score).toBe(75);
    // weighted: 100*0.25 + 100*0.25 + 100*0.2 + 75*0.15 + 100*0.15 = 96.25 -> 96
    expect(result.score).toBe(96);
    expect(result.level).toBe('bid');
  });

  it('applies Critical penalty to Retainage factor only', () => {
    const findings = [
      createFinding({
        severity: 'Critical',
        category: 'Financial Terms',
        sourcePass: 'legal-retainage',
      }),
    ];
    const result = computeBidSignal(findings);
    const retainage = result.factors.find((f) => f.name === 'Retainage')!;
    expect(retainage.score).toBe(75);
    // weighted: 100*0.25 + 100*0.25 + 100*0.2 + 100*0.15 + 75*0.15 = 96.25 -> 96
    expect(result.score).toBe(96);
    expect(result.level).toBe('bid');
  });

  it('applies Critical penalty to Bonding factor only', () => {
    const findings = [
      createFinding({
        severity: 'Critical',
        category: 'Labor Compliance',
        sourcePass: 'labor-compliance',
        scopeMeta: {
          passType: 'labor-compliance',
          requirementType: 'bonding',
          responsibleParty: 'Sub',
          contactInfo: 'DIR',
          deadline: 'Pre-job',
          checklistItems: [],
        },
      }),
    ];
    const result = computeBidSignal(findings);
    const bonding = result.factors.find((f) => f.name === 'Bonding')!;
    expect(bonding.score).toBe(75);
    // weighted: 75*0.25 + 100*0.25 + 100*0.2 + 100*0.15 + 100*0.15 = 93.75 -> 94
    expect(result.score).toBe(94);
    expect(result.level).toBe('bid');
  });

  // --- Severity penalty tests ---
  it('applies High severity penalty (15) to Insurance factor', () => {
    const findings = [
      createFinding({ severity: 'High', category: 'Insurance Requirements' }),
    ];
    const result = computeBidSignal(findings);
    const insurance = result.factors.find((f) => f.name === 'Insurance')!;
    expect(insurance.score).toBe(85); // 100 - 15
    // weighted: 85*0.25 + 100*0.75 = 96.25 -> 96
    expect(result.score).toBe(96);
  });

  it('applies zero penalty for Info severity', () => {
    const findings = [
      createFinding({ severity: 'Info', category: 'Insurance Requirements' }),
    ];
    const result = computeBidSignal(findings);
    const insurance = result.factors.find((f) => f.name === 'Insurance')!;
    expect(insurance.score).toBe(100);
    expect(result.score).toBe(100);
  });

  // --- Threshold tests ---
  it('returns caution when score is between 40 and 69', () => {
    // Need to push total below 70. Each Critical penalty = 25 on a factor.
    // 4 Critical Insurance (factor=0, wt 0.25) + 4 Critical Scope (factor=0, wt 0.2) + 4 Critical Payment (factor=0, wt 0.15)
    // = 0*0.25 + 100*0.25 + 0*0.2 + 0*0.15 + 100*0.15 = 25 + 15 = 40
    // That's exactly 40 which is caution.
    // Let's do: Insurance zeroed, Scope zeroed, Payment zeroed, Bonding partial
    // Insurance: 4 Critical -> 0 (wt 0.25)
    // Scope: 4 Critical -> 0 (wt 0.2)
    // Payment: 4 Critical -> 0 (wt 0.15)
    // Bonding: 100 (wt 0.25)
    // Retainage: 100 (wt 0.15)
    // Score = 0 + 25 + 0 + 0 + 15 = 40 -> caution
    const findings = [
      // Insurance: 4 Critical findings -> factor = max(0, 100-100) = 0
      ...Array.from({ length: 4 }, () =>
        createFinding({ severity: 'Critical', category: 'Insurance Requirements' })
      ),
      // Scope: 4 Critical -> 0
      ...Array.from({ length: 4 }, () =>
        createFinding({ severity: 'Critical', category: 'Scope of Work' })
      ),
      // Payment: 4 Critical -> 0
      ...Array.from({ length: 4 }, () =>
        createFinding({
          severity: 'Critical',
          category: 'Financial Terms',
          sourcePass: 'legal-payment-contingency',
        })
      ),
    ];
    const result = computeBidSignal(findings);
    expect(result.level).toBe('caution');
    expect(result.score).toBeGreaterThanOrEqual(40);
    expect(result.score).toBeLessThan(70);
  });

  it('returns no-bid when score is below 40', () => {
    // Zero out all 5 factors
    const findings = [
      ...Array.from({ length: 4 }, () =>
        createFinding({ severity: 'Critical', category: 'Insurance Requirements' })
      ),
      ...Array.from({ length: 4 }, () =>
        createFinding({ severity: 'Critical', category: 'Scope of Work' })
      ),
      ...Array.from({ length: 4 }, () =>
        createFinding({
          severity: 'Critical',
          category: 'Financial Terms',
          sourcePass: 'legal-payment-contingency',
        })
      ),
      ...Array.from({ length: 4 }, () =>
        createFinding({
          severity: 'Critical',
          category: 'Financial Terms',
          sourcePass: 'legal-retainage',
        })
      ),
      ...Array.from({ length: 4 }, () =>
        createFinding({
          severity: 'Critical',
          category: 'Labor Compliance',
          sourcePass: 'labor-compliance',
          scopeMeta: {
            passType: 'labor-compliance',
            requirementType: 'bonding',
            responsibleParty: 'Sub',
            contactInfo: 'DIR',
            deadline: 'Pre-job',
            checklistItems: [],
          },
        })
      ),
    ];
    const result = computeBidSignal(findings);
    expect(result.level).toBe('no-bid');
    expect(result.score).toBeLessThan(40);
  });

  it('returns bid at exact boundary score of 70', () => {
    // Need score = 70.
    // Insurance: 0 (wt 0.25), Bonding: 0 (wt 0.25) -> that's 0 contribution from 0.5 weight
    // Scope: 100 (wt 0.2), Payment: 100 (wt 0.15), Retainage: 100 (wt 0.15)
    // Score = 0 + 0 + 20 + 15 + 15 = 50. Too low.
    // Try: Insurance at 30 (wt 0.25 => 7.5) + Bonding at 30 (wt 0.25 => 7.5) + others at 100
    // = 7.5 + 7.5 + 20 + 15 + 15 = 65. Still too low.
    // Insurance at 60 (wt 0.25 => 15) + Bonding at 40 (wt 0.25 => 10) + others at 100
    // = 15 + 10 + 20 + 15 + 15 = 75. Too high.
    // Let me try: Insurance at 0 (0.25 => 0) + Scope at 100 (0.2 => 20) + Payment at 100 (0.15 => 15) + Retainage at 100 (0.15 => 15) + Bonding at 80 (0.25 => 20)
    // = 0 + 20 + 20 + 15 + 15 = 70.
    // Insurance = 0: 4 Critical findings (100 - 4*25 = 0)
    // Bonding = 80: 1 Medium finding on bonding (100 - 8 = 92)... no
    // Bonding = 80 means 100 - 20, that's not a clean penalty. Let me recalculate.
    // Actually need: weighted = 70 exactly.
    // Bonding(wt .25) + Insurance(wt .25) + Scope(wt .2) + Payment(wt .15) + Retainage(wt .15) = 70
    // If Insurance = 0: 0*.25 + B*.25 + S*.2 + P*.15 + R*.15 = 70
    // B=100, S=100, P=100, R=100: 25+20+15+15 = 75. Need 5 less.
    // Bonding at 80 (100-20, not achievable with penalties 25/15/8/3)
    // Bonding at 85 = 100 - 15 = 1 High. 85*0.25 = 21.25. Total = 21.25+20+15+15 = 71.25 -> 71. Close but not 70.
    // Bonding at 75 = 100 - 25 = 1 Critical. 75*0.25 = 18.75. Total = 18.75+20+15+15 = 68.75 -> 69. Too low.
    // Try different approach: Insurance at 80 (1 Medium on Scope missing... no)
    // Insurance = 100-8 = 92 (1 Medium). 92*.25=23. + 100*.25=25. + 100*.2=20 + 100*.15=15 + 100*.15=15 = 98. Too high.
    // OK let me just verify the boundary behavior: score >= 70 is 'bid'.
    // I'll construct something that produces exactly 70.
    // Insurance = 0, Scope = 100, Bonding = 100, Payment = 0, Retainage = 0
    // = 0 + 25 + 20 + 0 + 0 = 45. Not 70.
    // Insurance = 0, Bonding = 100, Scope = 100, Payment = 100, Retainage = 100
    // = 0 + 25 + 20 + 15 + 15 = 75. Need -5 more.
    // + 1 High on Scope: Scope=85. 85*.2=17. Total = 0 + 25 + 17 + 15 + 15 = 72.
    // + 1 Medium on Scope (instead): Scope=92. 92*.2=18.4. Total = 0+25+18.4+15+15 = 73.4 -> 73.
    // + 1 Medium on payment: Payment=92. 92*.15=13.8. Total = 0+25+20+13.8+15 = 73.8 -> 74.
    // Insurance=0, + 1 High Scope: 0+25+17+15+15 = 72.
    // Insurance=0, + 1 Medium + 1 Low on retainage: Ret=89. 89*.15=13.35. 0+25+20+15+13.35=73.35 -> 73.
    // This is hard to hit exactly 70. Let me just test the boundary differently.
    // Score of 70 means level='bid'. I'll find a combo close to 70.
    // Insurance=0 (4 Critical), 1 High Scope (85), 1 Low Payment (97)
    // 0 + 25 + 85*.2 + 97*.15 + 100*.15 = 0 + 25 + 17 + 14.55 + 15 = 71.55 -> 72
    // Insurance=0, 1 Critical Scope(75), others 100
    // 0+25+15+15+15 = 70. Yes! 75*.2=15, 100*.15=15, 100*.15=15, 100*.25=25 = 70!
    const findings = [
      // Zero out Insurance (4 Critical = -100)
      ...Array.from({ length: 4 }, () =>
        createFinding({ severity: 'Critical', category: 'Insurance Requirements' })
      ),
      // 1 Critical Scope (100-25=75)
      createFinding({ severity: 'Critical', category: 'Scope of Work' }),
    ];
    const result = computeBidSignal(findings);
    expect(result.score).toBe(70);
    expect(result.level).toBe('bid');
  });

  // --- Factor clamping ---
  it('clamps factor score to 0 (not negative) with many Critical findings', () => {
    const findings = Array.from({ length: 5 }, () =>
      createFinding({ severity: 'Critical', category: 'Insurance Requirements' })
    );
    const result = computeBidSignal(findings);
    const insurance = result.factors.find((f) => f.name === 'Insurance')!;
    expect(insurance.score).toBe(0); // 100 - 125 clamped to 0
  });

  // --- Accumulation ---
  it('accumulates penalties from multiple findings on same factor', () => {
    const findings = [
      createFinding({ severity: 'Critical', category: 'Insurance Requirements' }),
      createFinding({ severity: 'Critical', category: 'Insurance Requirements' }),
    ];
    const result = computeBidSignal(findings);
    const insurance = result.factors.find((f) => f.name === 'Insurance')!;
    expect(insurance.score).toBe(50); // 100 - 25 - 25
    // weighted: 50*0.25 + 100*0.25 + 100*0.2 + 100*0.15 + 100*0.15 = 12.5+25+20+15+15 = 87.5 -> 88
    expect(result.score).toBe(88);
  });
});

describe('generateFactorReasons', () => {
  it('returns "No {factor} issues found" for all factors with no findings', () => {
    const reasons = generateFactorReasons([]);
    expect(reasons['Bonding']).toBe('No bonding issues found');
    expect(reasons['Insurance']).toBe('No insurance issues found');
    expect(reasons['Scope']).toBe('No scope issues found');
    expect(reasons['Payment']).toBe('No payment issues found');
    expect(reasons['Retainage']).toBe('No retainage issues found');
  });

  it('returns worst-severity finding title when multiple findings match', () => {
    const findings = [
      createFinding({
        severity: 'Medium',
        category: 'Insurance Requirements',
        title: 'Medium Insurance Issue',
      }),
      createFinding({
        severity: 'Critical',
        category: 'Insurance Requirements',
        title: 'Critical Insurance Issue',
      }),
    ];
    const reasons = generateFactorReasons(findings);
    expect(reasons['Insurance']).toBe('Critical Insurance Issue');
  });

  it('returns finding title for matched factor and default for others', () => {
    const findings = [
      createFinding({
        severity: 'High',
        category: 'Scope of Work',
        title: 'Ambiguous Scope Definition',
      }),
    ];
    const reasons = generateFactorReasons(findings);
    expect(reasons['Scope']).toBe('Ambiguous Scope Definition');
    expect(reasons['Insurance']).toBe('No insurance issues found');
    expect(reasons['Bonding']).toBe('No bonding issues found');
    expect(reasons['Payment']).toBe('No payment issues found');
    expect(reasons['Retainage']).toBe('No retainage issues found');
  });
});
