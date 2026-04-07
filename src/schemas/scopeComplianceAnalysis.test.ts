// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  SpecReconciliationFindingSchema,
  SpecReconciliationPassResultSchema,
  ExclusionStressTestFindingSchema,
  ExclusionStressTestPassResultSchema,
} from './scopeComplianceAnalysis';

// ---------------------------------------------------------------------------
// SpecReconciliationFindingSchema
// ---------------------------------------------------------------------------

describe('SpecReconciliationFindingSchema', () => {
  const validSpecReconciliation = {
    severity: 'Medium',
    category: 'Scope of Work',
    title: 'Missing Submittal: Shop Drawings for Curtain Wall',
    description: 'Spec section 08 44 13 typically requires shop drawings but none are declared.',
    recommendation: 'Request clarification on shop drawing requirements.',
    clauseReference: 'Section 08 44 13',
    clauseText: 'Contractor shall furnish glazing per Section 08 44 13.',
    explanation: 'Div 08 deliverables module lists shop drawings as typical for curtain wall sections.',
    crossReferences: ['Section 01 33 00'],
    specSection: '08 44 13',
    typicalDeliverable: 'Shop drawings',
    gapType: 'missing-submittal',
    inferenceBasis: 'knowledge-module:div08-deliverables',
    negotiationPosition: '',
    actionPriority: 'pre-bid',
  };

  it('parses a valid spec-reconciliation finding', () => {
    const result = SpecReconciliationFindingSchema.safeParse(validSpecReconciliation);
    expect(result.success).toBe(true);
  });

  it('rejects when inferenceBasis is missing', () => {
    const { inferenceBasis, ...noIB } = validSpecReconciliation;
    const result = SpecReconciliationFindingSchema.safeParse(noIB);
    expect(result.success).toBe(false);
  });

  it('rejects an invalid gapType', () => {
    const result = SpecReconciliationFindingSchema.safeParse({
      ...validSpecReconciliation,
      gapType: 'not-a-valid-gap',
    });
    expect(result.success).toBe(false);
  });

  it('accepts all valid gapType values', () => {
    const validGapTypes = [
      'missing-submittal', 'missing-test-report', 'missing-certification',
      'missing-structural-calc', 'missing-warranty', 'missing-mock-up',
      'finish-spec-mismatch', 'other',
    ];
    for (const gapType of validGapTypes) {
      const result = SpecReconciliationFindingSchema.safeParse({
        ...validSpecReconciliation,
        gapType,
      });
      expect(result.success, `gapType '${gapType}' should be valid`).toBe(true);
    }
  });

  it('validates PassResultSchema wraps findings and dates', () => {
    const result = SpecReconciliationPassResultSchema.safeParse({
      findings: [validSpecReconciliation],
      dates: [],
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// ExclusionStressTestFindingSchema
// ---------------------------------------------------------------------------

describe('ExclusionStressTestFindingSchema', () => {
  const validExclusionStressTest = {
    severity: 'Medium',
    category: 'Scope of Work',
    title: 'Exclusion Tension: Structural Calcs vs Curtain Wall Spec',
    description: 'Contract excludes structural calculations but spec section typically requires them.',
    recommendation: 'Clarify responsibility for structural calculations.',
    clauseReference: 'Section 08 44 13',
    clauseText: 'Structural calculations are excluded from subcontractor scope.',
    explanation: 'AAMA standards require structural calculations for curtain wall systems.',
    crossReferences: ['Exhibit A'],
    exclusionQuote: 'Structural calculations are excluded from subcontractor scope.',
    tensionQuote: 'AAMA 501.4 requires structural adequacy verification for curtain wall.',
    specSection: '08 44 13',
    tensionType: 'spec-requires-excluded-item',
    inferenceBasis: 'knowledge-module:aama-submittal-standards',
    negotiationPosition: '',
    actionPriority: 'pre-bid',
  };

  it('parses a valid exclusion-stress-test finding', () => {
    const result = ExclusionStressTestFindingSchema.safeParse(validExclusionStressTest);
    expect(result.success).toBe(true);
  });

  it('rejects when tensionQuote is missing', () => {
    const { tensionQuote, ...noTQ } = validExclusionStressTest;
    const result = ExclusionStressTestFindingSchema.safeParse(noTQ);
    expect(result.success).toBe(false);
  });

  it('rejects an invalid tensionType', () => {
    const result = ExclusionStressTestFindingSchema.safeParse({
      ...validExclusionStressTest,
      tensionType: 'not-a-valid-tension',
    });
    expect(result.success).toBe(false);
  });

  it('rejects when exclusionQuote is missing', () => {
    const { exclusionQuote, ...noEQ } = validExclusionStressTest;
    const result = ExclusionStressTestFindingSchema.safeParse(noEQ);
    expect(result.success).toBe(false);
  });

  it('accepts all valid tensionType values', () => {
    const validTensionTypes = [
      'spec-requires-excluded-item', 'code-requires-excluded-item',
      'standard-practice-conflict', 'warranty-gap', 'other',
    ];
    for (const tensionType of validTensionTypes) {
      const result = ExclusionStressTestFindingSchema.safeParse({
        ...validExclusionStressTest,
        tensionType,
      });
      expect(result.success, `tensionType '${tensionType}' should be valid`).toBe(true);
    }
  });

  it('validates PassResultSchema wraps findings and dates', () => {
    const result = ExclusionStressTestPassResultSchema.safeParse({
      findings: [validExclusionStressTest],
      dates: [],
    });
    expect(result.success).toBe(true);
  });
});
