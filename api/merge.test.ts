// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { mergePassResults, type AnalysisPassInfo } from './merge.js';
import type { PassResult, RiskOverviewResult } from '../src/schemas/analysis.js';
import { MergedFindingSchema } from '../src/schemas/finding.js';
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
  createScopeOfWorkFinding,
  createDatesDeadlinesFinding,
  createVerbiageFinding,
  createLaborComplianceFinding,
  createSpecReconciliationFinding,
  createExclusionStressTestFinding,
  createBidReconciliationFinding,
} from '../src/test/factories.js';

// Mock the knowledge registry (avoids filesystem dependency)
vi.mock('../src/knowledge/registry.js', () => ({
  getAllModules: () => [],
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fulfilled(
  passName: string,
  findings: PassResult['findings'],
  dates: PassResult['dates'] = []
) {
  return {
    status: 'fulfilled' as const,
    value: { passName, result: { findings, dates } as PassResult },
  };
}

function fulfilledOverview(
  passName: string,
  findings: RiskOverviewResult['findings'],
  client: string,
  contractType: string,
  dates: RiskOverviewResult['dates'] = []
) {
  return {
    status: 'fulfilled' as const,
    value: { passName, result: { findings, dates, client, contractType } as RiskOverviewResult },
  };
}

function rejected(passName: string, reason: Error) {
  return { status: 'rejected' as const, reason };
}

const pass = (
  name: string,
  isOverview = false,
  isLegal = false,
  isScope = false
): AnalysisPassInfo => ({ name, isOverview, isLegal, isScope });

// ---------------------------------------------------------------------------
// Specialized pass handler tests (15 tests)
// ---------------------------------------------------------------------------

describe('mergePassResults - specialized pass handlers', () => {
  it('converts legal-indemnification findings with legalMeta', () => {
    const finding = createIndemnificationFinding({
      riskType: 'broad',
      hasInsuranceGap: true,
    });
    const result = mergePassResults(
      [fulfilled('legal-indemnification', [finding])],
      [pass('legal-indemnification')]
    );
    expect(result.findings).toHaveLength(1);
    const f = result.findings[0];
    expect(f.legalMeta?.clauseType).toBe('indemnification');
    expect(f.legalMeta && 'riskType' in f.legalMeta && f.legalMeta.riskType).toBe('broad');
    expect(f.legalMeta && 'hasInsuranceGap' in f.legalMeta && f.legalMeta.hasInsuranceGap).toBe(true);
    expect(f.sourcePass).toBe('legal-indemnification');
  });

  it('converts legal-payment-contingency findings with legalMeta', () => {
    const finding = createPaymentContingencyFinding({
      paymentType: 'pay-if-paid',
      enforceabilityContext: 'Void in CA',
    });
    const result = mergePassResults(
      [fulfilled('legal-payment-contingency', [finding])],
      [pass('legal-payment-contingency')]
    );
    expect(result.findings).toHaveLength(1);
    const f = result.findings[0];
    expect(f.legalMeta?.clauseType).toBe('payment-contingency');
    expect(f.legalMeta && 'paymentType' in f.legalMeta && f.legalMeta.paymentType).toBe('pay-if-paid');
    expect(f.legalMeta && 'enforceabilityContext' in f.legalMeta && f.legalMeta.enforceabilityContext).toBe('Void in CA');
    expect(f.sourcePass).toBe('legal-payment-contingency');
  });

  it('converts legal-liquidated-damages findings with legalMeta', () => {
    const finding = createLiquidatedDamagesFinding({
      amountOrRate: '$1000/day',
      capStatus: 'uncapped',
      proportionalityAssessment: 'Excessive',
    });
    const result = mergePassResults(
      [fulfilled('legal-liquidated-damages', [finding])],
      [pass('legal-liquidated-damages')]
    );
    expect(result.findings).toHaveLength(1);
    const f = result.findings[0];
    expect(f.legalMeta?.clauseType).toBe('liquidated-damages');
    expect(f.legalMeta && 'amountOrRate' in f.legalMeta && f.legalMeta.amountOrRate).toBe('$1000/day');
    expect(f.legalMeta && 'capStatus' in f.legalMeta && f.legalMeta.capStatus).toBe('uncapped');
    expect(f.sourcePass).toBe('legal-liquidated-damages');
  });

  it('converts legal-retainage findings with legalMeta', () => {
    const finding = createRetainageFinding({
      percentage: '10%',
      releaseCondition: 'Final completion',
      tiedTo: 'sub-work',
    });
    const result = mergePassResults(
      [fulfilled('legal-retainage', [finding])],
      [pass('legal-retainage')]
    );
    expect(result.findings).toHaveLength(1);
    const f = result.findings[0];
    expect(f.legalMeta?.clauseType).toBe('retainage');
    expect(f.legalMeta && 'percentage' in f.legalMeta && f.legalMeta.percentage).toBe('10%');
    expect(f.legalMeta && 'releaseCondition' in f.legalMeta && f.legalMeta.releaseCondition).toBe('Final completion');
    expect(f.legalMeta && 'tiedTo' in f.legalMeta && f.legalMeta.tiedTo).toBe('sub-work');
    expect(f.sourcePass).toBe('legal-retainage');
  });

  it('converts legal-insurance findings with legalMeta', () => {
    const finding = createInsuranceFinding({
      coverageItems: [{ coverageType: 'GL', requiredLimit: '$2M', isAboveStandard: true }],
      endorsements: [{ endorsementType: 'Additional Insured', isNonStandard: false }],
      certificateHolder: 'Owner LLC',
    });
    const result = mergePassResults(
      [fulfilled('legal-insurance', [finding])],
      [pass('legal-insurance')]
    );
    expect(result.findings).toHaveLength(1);
    const f = result.findings[0];
    expect(f.legalMeta?.clauseType).toBe('insurance');
    expect(f.legalMeta && 'coverageItems' in f.legalMeta && f.legalMeta.coverageItems).toHaveLength(1);
    expect(f.legalMeta && 'endorsements' in f.legalMeta && f.legalMeta.endorsements).toHaveLength(1);
    expect(f.legalMeta && 'certificateHolder' in f.legalMeta && f.legalMeta.certificateHolder).toBe('Owner LLC');
    expect(f.sourcePass).toBe('legal-insurance');
  });

  it('converts legal-termination findings with legalMeta', () => {
    const finding = createTerminationFinding({
      terminationType: 'for-convenience',
      noticePeriod: '14 days',
      compensation: 'None',
      curePeriod: '0 days',
    });
    const result = mergePassResults(
      [fulfilled('legal-termination', [finding])],
      [pass('legal-termination')]
    );
    expect(result.findings).toHaveLength(1);
    const f = result.findings[0];
    expect(f.legalMeta?.clauseType).toBe('termination');
    expect(f.legalMeta && 'terminationType' in f.legalMeta && f.legalMeta.terminationType).toBe('for-convenience');
    expect(f.legalMeta && 'noticePeriod' in f.legalMeta && f.legalMeta.noticePeriod).toBe('14 days');
    expect(f.legalMeta && 'compensation' in f.legalMeta && f.legalMeta.compensation).toBe('None');
    expect(f.legalMeta && 'curePeriod' in f.legalMeta && f.legalMeta.curePeriod).toBe('0 days');
    expect(f.sourcePass).toBe('legal-termination');
  });

  it('converts legal-flow-down findings with legalMeta', () => {
    const finding = createFlowDownFinding({
      flowDownScope: 'blanket',
      problematicObligations: ['Indemnification', 'Insurance'],
      primeContractAvailable: false,
    });
    const result = mergePassResults(
      [fulfilled('legal-flow-down', [finding])],
      [pass('legal-flow-down')]
    );
    expect(result.findings).toHaveLength(1);
    const f = result.findings[0];
    expect(f.legalMeta?.clauseType).toBe('flow-down');
    expect(f.legalMeta && 'flowDownScope' in f.legalMeta && f.legalMeta.flowDownScope).toBe('blanket');
    expect(f.legalMeta && 'problematicObligations' in f.legalMeta && f.legalMeta.problematicObligations).toEqual(['Indemnification', 'Insurance']);
    expect(f.legalMeta && 'primeContractAvailable' in f.legalMeta && f.legalMeta.primeContractAvailable).toBe(false);
    expect(f.sourcePass).toBe('legal-flow-down');
  });

  it('converts legal-no-damage-delay findings with legalMeta', () => {
    const finding = createNoDamageDelayFinding({
      waiverScope: 'broad-with-exceptions',
      exceptions: ['Force majeure'],
      enforceabilityContext: 'Enforceable with exceptions',
    });
    const result = mergePassResults(
      [fulfilled('legal-no-damage-delay', [finding])],
      [pass('legal-no-damage-delay')]
    );
    expect(result.findings).toHaveLength(1);
    const f = result.findings[0];
    expect(f.legalMeta?.clauseType).toBe('no-damage-delay');
    expect(f.legalMeta && 'waiverScope' in f.legalMeta && f.legalMeta.waiverScope).toBe('broad-with-exceptions');
    expect(f.legalMeta && 'exceptions' in f.legalMeta && f.legalMeta.exceptions).toEqual(['Force majeure']);
    expect(f.sourcePass).toBe('legal-no-damage-delay');
  });

  it('converts legal-lien-rights findings with legalMeta', () => {
    const finding = createLienRightsFinding({
      waiverType: 'unconditional-before-payment',
      lienFilingDeadline: '60 days',
      enforceabilityContext: 'Risky timeline',
    });
    const result = mergePassResults(
      [fulfilled('legal-lien-rights', [finding])],
      [pass('legal-lien-rights')]
    );
    expect(result.findings).toHaveLength(1);
    const f = result.findings[0];
    expect(f.legalMeta?.clauseType).toBe('lien-rights');
    expect(f.legalMeta && 'waiverType' in f.legalMeta && f.legalMeta.waiverType).toBe('unconditional-before-payment');
    expect(f.legalMeta && 'lienFilingDeadline' in f.legalMeta && f.legalMeta.lienFilingDeadline).toBe('60 days');
    expect(f.sourcePass).toBe('legal-lien-rights');
  });

  it('converts legal-dispute-resolution findings with legalMeta', () => {
    const finding = createDisputeResolutionFinding({
      mechanism: 'litigation',
      venue: 'Los Angeles County',
      feeShifting: 'one-sided',
      mediationRequired: false,
    });
    const result = mergePassResults(
      [fulfilled('legal-dispute-resolution', [finding])],
      [pass('legal-dispute-resolution')]
    );
    expect(result.findings).toHaveLength(1);
    const f = result.findings[0];
    expect(f.legalMeta?.clauseType).toBe('dispute-resolution');
    expect(f.legalMeta && 'mechanism' in f.legalMeta && f.legalMeta.mechanism).toBe('litigation');
    expect(f.legalMeta && 'venue' in f.legalMeta && f.legalMeta.venue).toBe('Los Angeles County');
    expect(f.legalMeta && 'feeShifting' in f.legalMeta && f.legalMeta.feeShifting).toBe('one-sided');
    expect(f.legalMeta && 'mediationRequired' in f.legalMeta && f.legalMeta.mediationRequired).toBe(false);
    expect(f.sourcePass).toBe('legal-dispute-resolution');
  });

  it('converts legal-change-order findings with legalMeta', () => {
    const finding = createChangeOrderFinding({
      changeType: 'unilateral-no-adjustment',
      noticeRequired: '3 days written',
      pricingMechanism: 'Fixed price',
      proceedPending: false,
    });
    const result = mergePassResults(
      [fulfilled('legal-change-order', [finding])],
      [pass('legal-change-order')]
    );
    expect(result.findings).toHaveLength(1);
    const f = result.findings[0];
    expect(f.legalMeta?.clauseType).toBe('change-order');
    expect(f.legalMeta && 'changeType' in f.legalMeta && f.legalMeta.changeType).toBe('unilateral-no-adjustment');
    expect(f.legalMeta && 'noticeRequired' in f.legalMeta && f.legalMeta.noticeRequired).toBe('3 days written');
    expect(f.legalMeta && 'pricingMechanism' in f.legalMeta && f.legalMeta.pricingMechanism).toBe('Fixed price');
    expect(f.legalMeta && 'proceedPending' in f.legalMeta && f.legalMeta.proceedPending).toBe(false);
    expect(f.sourcePass).toBe('legal-change-order');
  });

  it('converts scope-extraction findings with scopeMeta', () => {
    const finding = createScopeOfWorkFinding({
      scopeItemType: 'exclusion',
      specificationReference: 'Section 08 80 00',
      affectedTrade: 'Glazing',
    });
    const result = mergePassResults(
      [fulfilled('scope-extraction', [finding])],
      [pass('scope-extraction')]
    );
    expect(result.findings).toHaveLength(1);
    const f = result.findings[0];
    expect(f.scopeMeta?.passType).toBe('scope-extraction');
    expect(f.scopeMeta && 'scopeItemType' in f.scopeMeta && f.scopeMeta.scopeItemType).toBe('exclusion');
    expect(f.scopeMeta && 'specificationReference' in f.scopeMeta && f.scopeMeta.specificationReference).toBe('Section 08 80 00');
    expect(f.scopeMeta && 'affectedTrade' in f.scopeMeta && f.scopeMeta.affectedTrade).toBe('Glazing');
    expect(f.sourcePass).toBe('scope-extraction');
  });

  it('converts dates-deadlines findings with scopeMeta', () => {
    const finding = createDatesDeadlinesFinding({
      periodType: 'notice-period',
      duration: '10 days',
      triggerEvent: 'Written notice received',
    });
    const result = mergePassResults(
      [fulfilled('dates-deadlines', [finding])],
      [pass('dates-deadlines')]
    );
    expect(result.findings).toHaveLength(1);
    const f = result.findings[0];
    expect(f.scopeMeta?.passType).toBe('dates-deadlines');
    expect(f.scopeMeta && 'periodType' in f.scopeMeta && f.scopeMeta.periodType).toBe('notice-period');
    expect(f.scopeMeta && 'duration' in f.scopeMeta && f.scopeMeta.duration).toBe('10 days');
    expect(f.scopeMeta && 'triggerEvent' in f.scopeMeta && f.scopeMeta.triggerEvent).toBe('Written notice received');
    expect(f.sourcePass).toBe('dates-deadlines');
  });

  it('converts verbiage-analysis findings with scopeMeta', () => {
    const finding = createVerbiageFinding({
      issueType: 'one-sided-term',
      affectedParty: 'subcontractor',
      suggestedClarification: 'Add mutual obligation',
    });
    const result = mergePassResults(
      [fulfilled('verbiage-analysis', [finding])],
      [pass('verbiage-analysis')]
    );
    expect(result.findings).toHaveLength(1);
    const f = result.findings[0];
    expect(f.scopeMeta?.passType).toBe('verbiage');
    expect(f.scopeMeta && 'issueType' in f.scopeMeta && f.scopeMeta.issueType).toBe('one-sided-term');
    expect(f.scopeMeta && 'affectedParty' in f.scopeMeta && f.scopeMeta.affectedParty).toBe('subcontractor');
    expect(f.scopeMeta && 'suggestedClarification' in f.scopeMeta && f.scopeMeta.suggestedClarification).toBe('Add mutual obligation');
    expect(f.sourcePass).toBe('verbiage-analysis');
  });

  it('converts labor-compliance findings with scopeMeta', () => {
    const finding = createLaborComplianceFinding({
      requirementType: 'prevailing-wage',
      responsibleParty: 'Subcontractor',
      contactInfo: 'DIR',
      deadline: 'Pre-job',
      checklistItems: [{
        item: 'Certified payroll',
        deadline: 'Weekly',
        responsibleParty: 'Sub',
        contactInfo: 'DIR',
        status: 'required',
      }],
    });
    const result = mergePassResults(
      [fulfilled('labor-compliance', [finding])],
      [pass('labor-compliance')]
    );
    expect(result.findings).toHaveLength(1);
    const f = result.findings[0];
    expect(f.scopeMeta?.passType).toBe('labor-compliance');
    expect(f.scopeMeta && 'requirementType' in f.scopeMeta && f.scopeMeta.requirementType).toBe('prevailing-wage');
    expect(f.scopeMeta && 'responsibleParty' in f.scopeMeta && f.scopeMeta.responsibleParty).toBe('Subcontractor');
    expect(f.scopeMeta && 'checklistItems' in f.scopeMeta && f.scopeMeta.checklistItems).toHaveLength(1);
    expect(f.sourcePass).toBe('labor-compliance');
  });

  it('converts spec-reconciliation findings with scopeMeta', () => {
    const finding = createSpecReconciliationFinding({
      specSection: '08 44 13',
      typicalDeliverable: 'Shop drawings',
      gapType: 'missing-submittal',
    });
    const result = mergePassResults(
      [fulfilled('spec-reconciliation', [finding])],
      [pass('spec-reconciliation')]
    );
    expect(result.findings).toHaveLength(1);
    const f = result.findings[0];
    expect(f.scopeMeta?.passType).toBe('spec-reconciliation');
    expect(f.scopeMeta && 'specSection' in f.scopeMeta && f.scopeMeta.specSection).toBe('08 44 13');
    expect(f.scopeMeta && 'typicalDeliverable' in f.scopeMeta && f.scopeMeta.typicalDeliverable).toBe('Shop drawings');
    expect(f.scopeMeta && 'gapType' in f.scopeMeta && f.scopeMeta.gapType).toBe('missing-submittal');
    expect(f.sourcePass).toBe('spec-reconciliation');
  });

  it('converts exclusion-stress-test findings with scopeMeta', () => {
    const finding = createExclusionStressTestFinding({
      exclusionQuote: 'Structural calculations are excluded.',
      tensionQuote: 'AAMA 501.4 requires structural adequacy verification.',
      specSection: '08 44 13',
      tensionType: 'spec-requires-excluded-item',
    });
    const result = mergePassResults(
      [fulfilled('exclusion-stress-test', [finding])],
      [pass('exclusion-stress-test')]
    );
    expect(result.findings).toHaveLength(1);
    const f = result.findings[0];
    expect(f.scopeMeta?.passType).toBe('exclusion-stress-test');
    expect(f.scopeMeta && 'exclusionQuote' in f.scopeMeta && f.scopeMeta.exclusionQuote).toBe('Structural calculations are excluded.');
    expect(f.scopeMeta && 'tensionQuote' in f.scopeMeta && f.scopeMeta.tensionQuote).toBe('AAMA 501.4 requires structural adequacy verification.');
    expect(f.scopeMeta && 'specSection' in f.scopeMeta && f.scopeMeta.specSection).toBe('08 44 13');
    expect(f.scopeMeta && 'tensionType' in f.scopeMeta && f.scopeMeta.tensionType).toBe('spec-requires-excluded-item');
    expect(f.sourcePass).toBe('exclusion-stress-test');
  });
});

// ---------------------------------------------------------------------------
// Deduplication tests
// ---------------------------------------------------------------------------

describe('mergePassResults - deduplication', () => {
  it('prefers specialized pass over generic for same clauseRef+category', () => {
    const specialized = createIndemnificationFinding({
      clauseReference: 'Section 5.1',
      severity: 'High',
    });
    const generic = {
      severity: 'Critical' as const,
      category: 'Legal Issues' as const,
      title: 'Generic Indemnification Issue',
      clauseReference: 'Section 5.1',
      description: 'Generic description',
      recommendation: 'Generic recommendation',
      negotiationPosition: '',
      actionPriority: 'monitor' as const,
    };
    const result = mergePassResults(
      [
        fulfilled('legal-indemnification', [specialized]),
        fulfilled('risk-overview', [generic]),
      ],
      [
        pass('legal-indemnification'),
        pass('risk-overview', true),
      ]
    );
    // Should keep the specialized one (with legalMeta), not the generic
    const matching = result.findings.filter(
      (f) => f.clauseReference === 'Section 5.1' && f.category === 'Legal Issues'
    );
    expect(matching).toHaveLength(1);
    expect(matching[0].legalMeta?.clauseType).toBe('indemnification');
    expect(matching[0].sourcePass).toBe('legal-indemnification');
  });

  it('keeps higher severity when same pass type and same clauseRef+category', () => {
    const critical = createIndemnificationFinding({
      clauseReference: 'Section 3.2',
      severity: 'Critical',
      title: 'Critical Indemnification',
    });
    const medium = createIndemnificationFinding({
      clauseReference: 'Section 3.2',
      severity: 'Medium',
      title: 'Medium Indemnification',
    });
    const result = mergePassResults(
      [fulfilled('legal-indemnification', [critical, medium])],
      [pass('legal-indemnification')]
    );
    const matching = result.findings.filter(
      (f) => f.clauseReference === 'Section 3.2'
    );
    expect(matching).toHaveLength(1);
    expect(matching[0].severity).toBe('Critical');
  });

  it('keeps both findings with different clauseRef+category (no dedup)', () => {
    const finding1 = createIndemnificationFinding({
      clauseReference: 'Section 1.1',
      title: 'Finding A',
    });
    const finding2 = createRetainageFinding({
      clauseReference: 'Section 7.3',
      title: 'Finding B',
    });
    const result = mergePassResults(
      [
        fulfilled('legal-indemnification', [finding1]),
        fulfilled('legal-retainage', [finding2]),
      ],
      [
        pass('legal-indemnification'),
        pass('legal-retainage'),
      ]
    );
    expect(result.findings.length).toBeGreaterThanOrEqual(2);
  });

  it('deduplicates by title when clauseRef is N/A', () => {
    const finding1 = createIndemnificationFinding({
      clauseReference: 'N/A',
      title: 'Duplicate Title',
      severity: 'High',
    });
    const finding2 = createIndemnificationFinding({
      clauseReference: 'N/A',
      title: 'Duplicate Title',
      severity: 'Medium',
    });
    const result = mergePassResults(
      [fulfilled('legal-indemnification', [finding1, finding2])],
      [pass('legal-indemnification')]
    );
    const matching = result.findings.filter((f) => f.title === 'Duplicate Title');
    expect(matching).toHaveLength(1);
    expect(matching[0].severity).toBe('High');
  });

  it('prefers spec-reconciliation over risk-overview for same clauseRef+category (isSpecializedPass)', () => {
    const specialized = createSpecReconciliationFinding({
      clauseReference: 'Section 08 44 13',
      title: 'Missing Submittal: Shop Drawings',
      severity: 'Medium',
    });
    const generic = {
      severity: 'Medium' as const,
      category: 'Scope of Work' as const,
      title: 'Missing Submittal: Shop Drawings',
      clauseReference: 'Section 08 44 13',
      description: 'Generic description',
      recommendation: 'Generic recommendation',
      negotiationPosition: '',
      actionPriority: 'monitor' as const,
    };
    const result = mergePassResults(
      [
        fulfilled('spec-reconciliation', [specialized]),
        fulfilled('risk-overview', [generic]),
      ],
      [
        pass('spec-reconciliation'),
        pass('risk-overview', true),
      ]
    );
    const matching = result.findings.filter(
      (f) => f.clauseReference === 'Section 08 44 13' && f.category === 'Scope of Work'
    );
    expect(matching).toHaveLength(1);
    expect(matching[0].scopeMeta?.passType).toBe('spec-reconciliation');
    expect(matching[0].sourcePass).toBe('spec-reconciliation');
  });

  it('prefers exclusion-stress-test over risk-overview for same clauseRef+category (isSpecializedPass)', () => {
    const specialized = createExclusionStressTestFinding({
      clauseReference: 'Section 08 44 13',
      title: 'Exclusion Tension',
      severity: 'Medium',
    });
    const generic = {
      severity: 'Medium' as const,
      category: 'Scope of Work' as const,
      title: 'Exclusion Tension',
      clauseReference: 'Section 08 44 13',
      description: 'Generic description',
      recommendation: 'Generic recommendation',
      negotiationPosition: '',
      actionPriority: 'monitor' as const,
    };
    const result = mergePassResults(
      [
        fulfilled('exclusion-stress-test', [specialized]),
        fulfilled('risk-overview', [generic]),
      ],
      [
        pass('exclusion-stress-test'),
        pass('risk-overview', true),
      ]
    );
    const matching = result.findings.filter(
      (f) => f.clauseReference === 'Section 08 44 13' && f.category === 'Scope of Work'
    );
    expect(matching).toHaveLength(1);
    expect(matching[0].scopeMeta?.passType).toBe('exclusion-stress-test');
    expect(matching[0].sourcePass).toBe('exclusion-stress-test');
  });

  it('deduplicates cross-pass: clauseRef finding in Phase 1, N/A in Phase 2 title dedup', () => {
    // Phase 1 keeps the clauseRef one; Phase 2 deduplicates N/A one by title with different title
    const withRef = createIndemnificationFinding({
      clauseReference: 'Section 2.1',
      title: 'Shared Title',
      severity: 'High',
    });
    const withoutRef = createRetainageFinding({
      clauseReference: 'N/A',
      title: 'Shared Title',
      severity: 'Critical',
    });
    const result = mergePassResults(
      [
        fulfilled('legal-indemnification', [withRef]),
        fulfilled('legal-retainage', [withoutRef]),
      ],
      [
        pass('legal-indemnification'),
        pass('legal-retainage'),
      ]
    );
    // Both go through different phases of dedup but title match in Phase 2 merges them
    const matching = result.findings.filter((f) => f.title === 'Shared Title');
    expect(matching).toHaveLength(1);
    // The Critical severity one should win in the title-based dedup
    expect(matching[0].severity).toBe('Critical');
  });
});

// ---------------------------------------------------------------------------
// Generic/overview handler tests
// ---------------------------------------------------------------------------

describe('mergePassResults - generic/overview handler', () => {
  it('extracts client and contractType from overview pass', () => {
    const finding = {
      severity: 'Medium' as const,
      category: 'Risk Assessment' as const,
      title: 'Overall Risk Assessment',
      description: 'General risk overview',
      recommendation: 'Review all findings',
      clauseReference: 'N/A',
      negotiationPosition: '',
      actionPriority: 'monitor' as const,
    };
    const result = mergePassResults(
      [fulfilledOverview('risk-overview', [finding], 'Acme Corp', 'Prime Contract')],
      [pass('risk-overview', true)]
    );
    expect(result.client).toBe('Acme Corp');
    expect(result.contractType).toBe('Prime Contract');
  });

  it('uses generic handler for unknown pass name (no meta)', () => {
    const finding = {
      severity: 'Low' as const,
      category: 'Scope of Work' as const,
      title: 'Unknown Pass Finding',
      description: 'From unknown pass',
      recommendation: 'Review manually',
      clauseReference: 'Section 9.9',
      negotiationPosition: '',
      actionPriority: 'monitor' as const,
    };
    const result = mergePassResults(
      [fulfilled('unknown-pass', [finding])],
      [pass('unknown-pass')]
    );
    expect(result.findings).toHaveLength(1);
    const f = result.findings[0];
    expect(f.legalMeta).toBeUndefined();
    expect(f.scopeMeta).toBeUndefined();
    expect(f.sourcePass).toBe('unknown-pass');
  });
});

// ---------------------------------------------------------------------------
// Failed pass handling
// ---------------------------------------------------------------------------

describe('mergePassResults - failed passes', () => {
  it('produces Critical finding for rejected promise', () => {
    const result = mergePassResults(
      [rejected('legal-indemnification', new Error('API timeout'))],
      [pass('legal-indemnification')]
    );
    const failed = result.findings.filter((f) =>
      f.title.startsWith('Analysis Pass Failed:')
    );
    expect(failed).toHaveLength(1);
    expect(failed[0].severity).toBe('Critical');
    expect(failed[0].title).toBe('Analysis Pass Failed: legal-indemnification');
    expect(failed[0].description).toContain('API timeout');

    const passStatus = result.passResults.find(
      (p) => p.passName === 'legal-indemnification'
    );
    expect(passStatus?.status).toBe('failed');
    expect(passStatus?.error).toBe('API timeout');
  });
});

// ---------------------------------------------------------------------------
// Risk score integration
// ---------------------------------------------------------------------------

describe('mergePassResults - risk score', () => {
  it('returns numeric riskScore and scoreBreakdown array', () => {
    const finding = createIndemnificationFinding({ severity: 'Critical' });
    const result = mergePassResults(
      [fulfilled('legal-indemnification', [finding])],
      [pass('legal-indemnification')]
    );
    expect(typeof result.riskScore).toBe('number');
    expect(Array.isArray(result.scoreBreakdown)).toBe(true);
  });

  it('returns riskScore 0 with no findings', () => {
    const result = mergePassResults(
      [fulfilled('legal-indemnification', [])],
      [pass('legal-indemnification')]
    );
    expect(result.riskScore).toBe(0);
    expect(result.scoreBreakdown).toHaveLength(0);
  });

  it('computes expected score for a single Critical Legal Issues finding', () => {
    const finding = createIndemnificationFinding({ severity: 'Critical' });
    const result = mergePassResults(
      [fulfilled('legal-indemnification', [finding])],
      [pass('legal-indemnification')]
    );
    // Critical=25 * Legal Issues=1.0 = 25 raw
    // score = min(100, max(0, round(50 * log2(1 + 25/25)))) = round(50 * 1) = 50
    expect(result.riskScore).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// MergedFindingSchema validation (UNIT-06)
// ---------------------------------------------------------------------------

describe('mergePassResults - MergedFindingSchema validation (UNIT-06)', () => {
  const passConfigs: Array<{
    name: string;
    factory: () => PassResult['findings'][number];
  }> = [
    { name: 'legal-indemnification', factory: () => createIndemnificationFinding() },
    { name: 'legal-payment-contingency', factory: () => createPaymentContingencyFinding() },
    { name: 'legal-liquidated-damages', factory: () => createLiquidatedDamagesFinding() },
    { name: 'legal-retainage', factory: () => createRetainageFinding() },
    { name: 'legal-insurance', factory: () => createInsuranceFinding() },
    { name: 'legal-termination', factory: () => createTerminationFinding() },
    { name: 'legal-flow-down', factory: () => createFlowDownFinding() },
    { name: 'legal-no-damage-delay', factory: () => createNoDamageDelayFinding() },
    { name: 'legal-lien-rights', factory: () => createLienRightsFinding() },
    { name: 'legal-dispute-resolution', factory: () => createDisputeResolutionFinding() },
    { name: 'legal-change-order', factory: () => createChangeOrderFinding() },
    { name: 'scope-extraction', factory: () => createScopeOfWorkFinding() },
    { name: 'dates-deadlines', factory: () => createDatesDeadlinesFinding() },
    { name: 'verbiage-analysis', factory: () => createVerbiageFinding() },
    { name: 'labor-compliance', factory: () => createLaborComplianceFinding() },
    { name: 'spec-reconciliation', factory: () => createSpecReconciliationFinding() },
    { name: 'exclusion-stress-test', factory: () => createExclusionStressTestFinding() },
    { name: 'bid-reconciliation', factory: () => createBidReconciliationFinding() },
  ];

  for (const { name, factory } of passConfigs) {
    it(`${name} output validates against MergedFindingSchema`, () => {
      const finding = factory();
      const result = mergePassResults(
        [fulfilled(name, [finding])],
        [pass(name)]
      );
      expect(result.findings.length).toBeGreaterThanOrEqual(1);
      for (const f of result.findings) {
        // merge output is UnifiedFinding -- add client-side fields for schema validation
        const merged = {
          id: 'test-id',
          ...f,
          resolved: false,
          note: '',
          negotiationPosition: f.negotiationPosition || '',
          actionPriority: f.actionPriority || 'monitor',
        };
        expect(() => MergedFindingSchema.parse(merged)).not.toThrow();
      }
    });
  }
});

// ---------------------------------------------------------------------------
// ARCH-02: inferenceBasis enforcement (drop model-prior, clamp knowledge-module)
// ---------------------------------------------------------------------------

describe('mergePassResults - inferenceBasis enforcement', () => {
  function genericFinding(overrides: Record<string, unknown> = {}) {
    return {
      severity: 'Medium' as const,
      category: 'Scope of Work' as const,
      title: 'Generic Finding',
      description: 'Generic description',
      recommendation: 'Review',
      clauseReference: 'Section 1.1',
      negotiationPosition: '',
      actionPriority: 'monitor' as const,
      ...overrides,
    };
  }

  it('drops findings with inferenceBasis: model-prior', () => {
    const modelPrior = genericFinding({
      title: 'Model Prior Finding',
      clauseReference: 'Section 1.1',
      inferenceBasis: 'model-prior',
      severity: 'Critical',
    });
    const kept = genericFinding({
      title: 'Kept Finding',
      clauseReference: 'Section 2.2',
    });
    const result = mergePassResults(
      [fulfilled('unknown-pass', [modelPrior, kept] as PassResult['findings'])],
      [pass('unknown-pass')]
    );
    const titles = result.findings.map((f) => f.title);
    expect(titles).not.toContain('Model Prior Finding');
    expect(titles).toContain('Kept Finding');
  });

  it('clamps knowledge-module findings with Critical severity to Medium and sets downgradedFrom', () => {
    const finding = genericFinding({
      title: 'KM Critical Finding',
      severity: 'Critical',
      inferenceBasis: 'knowledge-module:ca-title24',
    });
    const result = mergePassResults(
      [fulfilled('unknown-pass', [finding] as PassResult['findings'])],
      [pass('unknown-pass')]
    );
    expect(result.findings).toHaveLength(1);
    const f = result.findings[0];
    expect(f.severity).toBe('Medium');
    expect(f.downgradedFrom).toBe('Critical');
  });

  it('clamps knowledge-module findings with High severity to Medium', () => {
    const finding = genericFinding({
      title: 'KM High Finding',
      severity: 'High',
      inferenceBasis: 'knowledge-module:div08-scope',
    });
    const result = mergePassResults(
      [fulfilled('unknown-pass', [finding] as PassResult['findings'])],
      [pass('unknown-pass')]
    );
    expect(result.findings).toHaveLength(1);
    const f = result.findings[0];
    expect(f.severity).toBe('Medium');
    expect(f.downgradedFrom).toBe('High');
  });

  it('leaves knowledge-module findings with Low severity unchanged', () => {
    const finding = genericFinding({
      title: 'KM Low Finding',
      severity: 'Low',
      inferenceBasis: 'knowledge-module:anything',
    });
    const result = mergePassResults(
      [fulfilled('unknown-pass', [finding] as PassResult['findings'])],
      [pass('unknown-pass')]
    );
    expect(result.findings).toHaveLength(1);
    const f = result.findings[0];
    expect(f.severity).toBe('Low');
    expect(f.downgradedFrom).toBeUndefined();
  });

  it('leaves knowledge-module findings with Medium severity unchanged and does not set downgradedFrom', () => {
    const finding = genericFinding({
      title: 'KM Medium Finding',
      severity: 'Medium',
      inferenceBasis: 'knowledge-module:anything',
    });
    const result = mergePassResults(
      [fulfilled('unknown-pass', [finding] as PassResult['findings'])],
      [pass('unknown-pass')]
    );
    expect(result.findings).toHaveLength(1);
    const f = result.findings[0];
    expect(f.severity).toBe('Medium');
    expect(f.downgradedFrom).toBeUndefined();
  });

  it('leaves contract-quoted findings unchanged', () => {
    const finding = genericFinding({
      title: 'Contract Quoted Finding',
      severity: 'Critical',
      inferenceBasis: 'contract-quoted',
    });
    const result = mergePassResults(
      [fulfilled('unknown-pass', [finding] as PassResult['findings'])],
      [pass('unknown-pass')]
    );
    expect(result.findings).toHaveLength(1);
    const f = result.findings[0];
    expect(f.severity).toBe('Critical');
    expect(f.downgradedFrom).toBeUndefined();
  });

  it('leaves findings without inferenceBasis unchanged', () => {
    const finding = genericFinding({
      title: 'No Basis Finding',
      severity: 'Critical',
    });
    const result = mergePassResults(
      [fulfilled('unknown-pass', [finding] as PassResult['findings'])],
      [pass('unknown-pass')]
    );
    expect(result.findings).toHaveLength(1);
    const f = result.findings[0];
    expect(f.severity).toBe('Critical');
    expect(f.downgradedFrom).toBeUndefined();
  });

  it('drops model-prior findings from spec-reconciliation pass', () => {
    const finding = createSpecReconciliationFinding({
      title: 'Model Prior Spec Recon',
      clauseReference: 'Section 08 44 13',
      inferenceBasis: 'model-prior',
    });
    const result = mergePassResults(
      [fulfilled('spec-reconciliation', [finding])],
      [pass('spec-reconciliation')]
    );
    const titles = result.findings.map((f) => f.title);
    expect(titles).not.toContain('Model Prior Spec Recon');
  });

  it('drops model-prior findings from exclusion-stress-test pass', () => {
    const finding = createExclusionStressTestFinding({
      title: 'Model Prior Exclusion',
      clauseReference: 'Section 08 44 13',
      inferenceBasis: 'model-prior',
    });
    const result = mergePassResults(
      [fulfilled('exclusion-stress-test', [finding])],
      [pass('exclusion-stress-test')]
    );
    const titles = result.findings.map((f) => f.title);
    expect(titles).not.toContain('Model Prior Exclusion');
  });

  it('clamps knowledge-module findings from spec-reconciliation to Medium', () => {
    const finding = createSpecReconciliationFinding({
      title: 'KM High Spec Recon',
      severity: 'High',
      clauseReference: 'Section 08 44 13',
      inferenceBasis: 'knowledge-module:div08-deliverables',
    });
    const result = mergePassResults(
      [fulfilled('spec-reconciliation', [finding])],
      [pass('spec-reconciliation')]
    );
    const f = result.findings.find((ff) => ff.title === 'KM High Spec Recon');
    expect(f).toBeDefined();
    expect(f!.severity).toBe('Medium');
    expect(f!.downgradedFrom).toBe('High');
  });

  it('clamps knowledge-module findings from exclusion-stress-test to Medium', () => {
    const finding = createExclusionStressTestFinding({
      title: 'KM High Exclusion',
      severity: 'High',
      clauseReference: 'Section 08 44 13',
      inferenceBasis: 'knowledge-module:aama-submittal-standards',
    });
    const result = mergePassResults(
      [fulfilled('exclusion-stress-test', [finding])],
      [pass('exclusion-stress-test')]
    );
    const f = result.findings.find((ff) => ff.title === 'KM High Exclusion');
    expect(f).toBeDefined();
    expect(f!.severity).toBe('Medium');
    expect(f!.downgradedFrom).toBe('High');
  });

  it('drops model-prior findings before risk-score computation', () => {
    const modelPrior = genericFinding({
      title: 'Dropped Critical',
      category: 'Legal Issues' as const,
      severity: 'Critical',
      clauseReference: 'Section A',
      inferenceBasis: 'model-prior',
    });
    const keptLow = genericFinding({
      title: 'Kept Low',
      category: 'Legal Issues' as const,
      severity: 'Low',
      clauseReference: 'Section B',
      inferenceBasis: 'contract-quoted',
    });
    const result = mergePassResults(
      [fulfilled('unknown-pass', [modelPrior, keptLow] as PassResult['findings'])],
      [pass('unknown-pass')]
    );
    // Only the Low finding should contribute; Critical-as-dropped must not inflate score.
    expect(result.riskScore).toBeLessThan(20);
    const titles = result.findings.map((f) => f.title);
    expect(titles).not.toContain('Dropped Critical');
    expect(titles).toContain('Kept Low');
  });
});

// ---------------------------------------------------------------------------
// Bid-reconciliation pass handler tests
// ---------------------------------------------------------------------------

describe('mergePassResults - bid-reconciliation', () => {
  it('converts bid-reconciliation findings with correct scopeMeta', () => {
    const finding = createBidReconciliationFinding({
      contractQuote: 'Subcontractor shall provide all curtain wall per Section 08 44 13.',
      bidQuote: 'Curtain wall system: 200 SF at $85/SF.',
      reconciliationType: 'exclusion-parity',
      directionOfRisk: 'Contract includes structural calculations in scope but bid excludes engineering.',
    });
    const result = mergePassResults(
      [fulfilled('bid-reconciliation', [finding])],
      [pass('bid-reconciliation')]
    );
    expect(result.findings).toHaveLength(1);
    const f = result.findings[0];
    expect(f.scopeMeta?.passType).toBe('bid-reconciliation');
    expect(f.scopeMeta && 'contractQuote' in f.scopeMeta && f.scopeMeta.contractQuote).toBe('Subcontractor shall provide all curtain wall per Section 08 44 13.');
    expect(f.scopeMeta && 'bidQuote' in f.scopeMeta && f.scopeMeta.bidQuote).toBe('Curtain wall system: 200 SF at $85/SF.');
    expect(f.scopeMeta && 'reconciliationType' in f.scopeMeta && f.scopeMeta.reconciliationType).toBe('exclusion-parity');
    expect(f.scopeMeta && 'directionOfRisk' in f.scopeMeta && f.scopeMeta.directionOfRisk).toBe('Contract includes structural calculations in scope but bid excludes engineering.');
    expect(f.sourcePass).toBe('bid-reconciliation');
  });

  it('bid-reconciliation findings survive dedup as specialized pass', () => {
    const specialized = createBidReconciliationFinding({
      clauseReference: 'Section 08 44 13',
      title: 'Bid Recon Finding',
      severity: 'High',
    });
    const generic = {
      severity: 'High' as const,
      category: 'Scope of Work' as const,
      title: 'Bid Recon Finding',
      clauseReference: 'Section 08 44 13',
      description: 'Generic description',
      recommendation: 'Generic recommendation',
      negotiationPosition: '',
      actionPriority: 'monitor' as const,
    };
    const result = mergePassResults(
      [
        fulfilled('bid-reconciliation', [specialized]),
        fulfilled('risk-overview', [generic]),
      ],
      [
        pass('bid-reconciliation'),
        pass('risk-overview', true),
      ]
    );
    const matching = result.findings.filter(
      (f) => f.clauseReference === 'Section 08 44 13' && f.category === 'Scope of Work'
    );
    expect(matching).toHaveLength(1);
    expect(matching[0].scopeMeta?.passType).toBe('bid-reconciliation');
    expect(matching[0].sourcePass).toBe('bid-reconciliation');
  });

  it('enforceInferenceBasis does NOT alter bid-reconciliation findings (contract-quoted basis)', () => {
    const finding = createBidReconciliationFinding({
      title: 'Contract Quoted Bid Recon',
      severity: 'Critical',
      clauseReference: 'Section 08 44 13',
    });
    const result = mergePassResults(
      [fulfilled('bid-reconciliation', [finding])],
      [pass('bid-reconciliation')]
    );
    const f = result.findings.find((ff) => ff.title === 'Contract Quoted Bid Recon');
    expect(f).toBeDefined();
    expect(f!.severity).toBe('Critical');
    expect(f!.downgradedFrom).toBeUndefined();
  });
});
