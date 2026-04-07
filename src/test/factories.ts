import { MergedFindingSchema, type MergedFinding } from '../schemas/finding';
import type { Contract, ContractDate } from '../types/contract';
import { z } from 'zod';

// Legal pass schemas
import {
  IndemnificationFindingSchema,
  PaymentContingencyFindingSchema,
  LiquidatedDamagesFindingSchema,
  RetainageFindingSchema,
  InsuranceFindingSchema,
  TerminationFindingSchema,
  FlowDownFindingSchema,
  NoDamageDelayFindingSchema,
  LienRightsFindingSchema,
  DisputeResolutionFindingSchema,
  ChangeOrderFindingSchema,
} from '../schemas/legalAnalysis';

// Scope pass schemas
import {
  ScopeOfWorkFindingSchema,
  DatesDeadlinesFindingSchema,
  VerbiageFindingSchema,
  LaborComplianceFindingSchema,
  SpecReconciliationFindingSchema,
  ExclusionStressTestFindingSchema,
  BidReconciliationFindingSchema,
} from '../schemas/scopeComplianceAnalysis';

let _findingCounter = 0;
let _contractCounter = 0;

/**
 * Creates a valid MergedFinding with sensible defaults.
 * The result is validated against MergedFindingSchema -- throws ZodError if invalid.
 */
export function createFinding(overrides?: Partial<MergedFinding>): MergedFinding {
  const n = _findingCounter++;
  const defaults: MergedFinding = {
    id: `finding-${n}`,
    severity: 'Medium',
    category: 'Scope of Work',
    title: `Test Finding ${n}`,
    description: 'Test description for finding.',
    recommendation: 'Test recommendation.',
    clauseReference: 'Section 1.1',
    negotiationPosition: 'Request amendment.',
    actionPriority: 'monitor',
    resolved: false,
    note: '',
  };
  return MergedFindingSchema.parse({ ...defaults, ...overrides });
}

/**
 * Creates a Contract object with sensible defaults.
 * No Zod validation (Contract is a plain interface).
 */
export function createContract(overrides?: Partial<Contract>): Contract {
  const n = _contractCounter++;
  const defaults: Contract = {
    id: `contract-${n}`,
    name: `Test Contract ${n}`,
    client: 'Test Client',
    type: 'Subcontract',
    uploadDate: new Date().toISOString(),
    status: 'Reviewed',
    lifecycleStatus: 'Draft',
    findings: [],
    dates: [],
    submittals: [],
    riskScore: 45,
  };
  return { ...defaults, ...overrides };
}

/**
 * Creates a ContractDate with sensible defaults.
 */
export function createContractDate(overrides?: Partial<ContractDate>): ContractDate {
  const defaults: ContractDate = {
    label: 'Substantial Completion',
    date: '2026-06-15',
    type: 'Deadline',
  };
  return { ...defaults, ...overrides };
}

// ---------------------------------------------------------------------------
// Pass-specific factory functions (15 total)
// ---------------------------------------------------------------------------

// Common base fields shared by all pass-specific factories
function passBase(passName: string, counter: number, category: string) {
  return {
    severity: 'Medium' as const,
    title: `Test ${passName} Finding ${counter}`,
    description: `Test description for ${passName} finding.`,
    recommendation: `Test recommendation for ${passName}.`,
    clauseReference: 'Section X.X',
    clauseText: 'Sample clause text',
    explanation: 'Sample explanation',
    crossReferences: [] as string[],
    negotiationPosition: 'Request amendment',
    actionPriority: 'monitor' as const,
  };
}

// --- Legal pass factories (11) ---

let _indemnificationCounter = 0;
export function createIndemnificationFinding(
  overrides?: Partial<z.infer<typeof IndemnificationFindingSchema>>
): z.infer<typeof IndemnificationFindingSchema> {
  const n = _indemnificationCounter++;
  return IndemnificationFindingSchema.parse({
    ...passBase('Indemnification', n, 'Legal Issues'),
    category: 'Legal Issues',
    riskType: 'limited',
    hasInsuranceGap: false,
    ...overrides,
  });
}

let _paymentContingencyCounter = 0;
export function createPaymentContingencyFinding(
  overrides?: Partial<z.infer<typeof PaymentContingencyFindingSchema>>
): z.infer<typeof PaymentContingencyFindingSchema> {
  const n = _paymentContingencyCounter++;
  return PaymentContingencyFindingSchema.parse({
    ...passBase('PaymentContingency', n, 'Financial Terms'),
    category: 'Financial Terms',
    paymentType: 'pay-when-paid',
    enforceabilityContext: 'Standard in CA',
    ...overrides,
  });
}

let _liquidatedDamagesCounter = 0;
export function createLiquidatedDamagesFinding(
  overrides?: Partial<z.infer<typeof LiquidatedDamagesFindingSchema>>
): z.infer<typeof LiquidatedDamagesFindingSchema> {
  const n = _liquidatedDamagesCounter++;
  return LiquidatedDamagesFindingSchema.parse({
    ...passBase('LiquidatedDamages', n, 'Financial Terms'),
    category: 'Financial Terms',
    amountOrRate: '$500/day',
    capStatus: 'capped',
    proportionalityAssessment: 'Reasonable',
    ...overrides,
  });
}

let _retainageCounter = 0;
export function createRetainageFinding(
  overrides?: Partial<z.infer<typeof RetainageFindingSchema>>
): z.infer<typeof RetainageFindingSchema> {
  const n = _retainageCounter++;
  return RetainageFindingSchema.parse({
    ...passBase('Retainage', n, 'Financial Terms'),
    category: 'Financial Terms',
    percentage: '10%',
    releaseCondition: 'Final completion',
    tiedTo: 'sub-work',
    ...overrides,
  });
}

let _insuranceCounter = 0;
export function createInsuranceFinding(
  overrides?: Partial<z.infer<typeof InsuranceFindingSchema>>
): z.infer<typeof InsuranceFindingSchema> {
  const n = _insuranceCounter++;
  return InsuranceFindingSchema.parse({
    ...passBase('Insurance', n, 'Insurance Requirements'),
    category: 'Insurance Requirements',
    coverageItems: [{ coverageType: 'GL', requiredLimit: '$1M', isAboveStandard: false }],
    endorsements: [],
    certificateHolder: 'Owner',
    ...overrides,
  });
}

let _terminationCounter = 0;
export function createTerminationFinding(
  overrides?: Partial<z.infer<typeof TerminationFindingSchema>>
): z.infer<typeof TerminationFindingSchema> {
  const n = _terminationCounter++;
  return TerminationFindingSchema.parse({
    ...passBase('Termination', n, 'Legal Issues'),
    category: 'Legal Issues',
    terminationType: 'for-cause',
    noticePeriod: '30 days',
    compensation: 'Work completed to date',
    curePeriod: '10 days',
    ...overrides,
  });
}

let _flowDownCounter = 0;
export function createFlowDownFinding(
  overrides?: Partial<z.infer<typeof FlowDownFindingSchema>>
): z.infer<typeof FlowDownFindingSchema> {
  const n = _flowDownCounter++;
  return FlowDownFindingSchema.parse({
    ...passBase('FlowDown', n, 'Legal Issues'),
    category: 'Legal Issues',
    flowDownScope: 'blanket',
    problematicObligations: [],
    primeContractAvailable: false,
    ...overrides,
  });
}

let _noDamageDelayCounter = 0;
export function createNoDamageDelayFinding(
  overrides?: Partial<z.infer<typeof NoDamageDelayFindingSchema>>
): z.infer<typeof NoDamageDelayFindingSchema> {
  const n = _noDamageDelayCounter++;
  return NoDamageDelayFindingSchema.parse({
    ...passBase('NoDamageDelay', n, 'Legal Issues'),
    category: 'Legal Issues',
    waiverScope: 'absolute',
    exceptions: [],
    enforceabilityContext: 'Enforceable in CA',
    ...overrides,
  });
}

let _lienRightsCounter = 0;
export function createLienRightsFinding(
  overrides?: Partial<z.infer<typeof LienRightsFindingSchema>>
): z.infer<typeof LienRightsFindingSchema> {
  const n = _lienRightsCounter++;
  return LienRightsFindingSchema.parse({
    ...passBase('LienRights', n, 'Financial Terms'),
    category: 'Financial Terms',
    waiverType: 'conditional',
    lienFilingDeadline: '90 days',
    enforceabilityContext: 'Standard timeline',
    ...overrides,
  });
}

let _disputeResolutionCounter = 0;
export function createDisputeResolutionFinding(
  overrides?: Partial<z.infer<typeof DisputeResolutionFindingSchema>>
): z.infer<typeof DisputeResolutionFindingSchema> {
  const n = _disputeResolutionCounter++;
  return DisputeResolutionFindingSchema.parse({
    ...passBase('DisputeResolution', n, 'Legal Issues'),
    category: 'Legal Issues',
    mechanism: 'mandatory-arbitration',
    venue: 'County of project',
    feeShifting: 'none',
    mediationRequired: true,
    ...overrides,
  });
}

let _changeOrderCounter = 0;
export function createChangeOrderFinding(
  overrides?: Partial<z.infer<typeof ChangeOrderFindingSchema>>
): z.infer<typeof ChangeOrderFindingSchema> {
  const n = _changeOrderCounter++;
  return ChangeOrderFindingSchema.parse({
    ...passBase('ChangeOrder', n, 'Contract Compliance'),
    category: 'Contract Compliance',
    changeType: 'mutual',
    noticeRequired: '5 days written',
    pricingMechanism: 'Time and materials',
    proceedPending: true,
    ...overrides,
  });
}

// --- Scope pass factories (4) ---

let _scopeOfWorkCounter = 0;
export function createScopeOfWorkFinding(
  overrides?: Partial<z.infer<typeof ScopeOfWorkFindingSchema>>
): z.infer<typeof ScopeOfWorkFindingSchema> {
  const n = _scopeOfWorkCounter++;
  return ScopeOfWorkFindingSchema.parse({
    ...passBase('ScopeOfWork', n, 'Scope of Work'),
    category: 'Scope of Work',
    scopeItemType: 'exclusion',
    specificationReference: 'Section 08 80 00',
    affectedTrade: 'Glazing',
    ...overrides,
  });
}

let _datesDeadlinesCounter = 0;
export function createDatesDeadlinesFinding(
  overrides?: Partial<z.infer<typeof DatesDeadlinesFindingSchema>>
): z.infer<typeof DatesDeadlinesFindingSchema> {
  const n = _datesDeadlinesCounter++;
  return DatesDeadlinesFindingSchema.parse({
    ...passBase('DatesDeadlines', n, 'Important Dates'),
    category: 'Important Dates',
    periodType: 'project-milestone',
    duration: '180 days',
    triggerEvent: 'NTP',
    ...overrides,
  });
}

let _verbiageCounter = 0;
export function createVerbiageFinding(
  overrides?: Partial<z.infer<typeof VerbiageFindingSchema>>
): z.infer<typeof VerbiageFindingSchema> {
  const n = _verbiageCounter++;
  return VerbiageFindingSchema.parse({
    ...passBase('Verbiage', n, 'Contract Compliance'),
    category: 'Contract Compliance',
    issueType: 'ambiguous-language',
    affectedParty: 'subcontractor',
    suggestedClarification: 'Clarify scope boundaries',
    ...overrides,
  });
}

let _laborComplianceCounter = 0;
export function createLaborComplianceFinding(
  overrides?: Partial<z.infer<typeof LaborComplianceFindingSchema>>
): z.infer<typeof LaborComplianceFindingSchema> {
  const n = _laborComplianceCounter++;
  return LaborComplianceFindingSchema.parse({
    ...passBase('LaborCompliance', n, 'Labor Compliance'),
    category: 'Labor Compliance',
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
    ...overrides,
  });
}

// --- Stage 3 scope intelligence factories (2) ---

let _specReconciliationCounter = 0;
export function createSpecReconciliationFinding(
  overrides?: Partial<z.infer<typeof SpecReconciliationFindingSchema>>
): z.infer<typeof SpecReconciliationFindingSchema> {
  const n = _specReconciliationCounter++;
  return SpecReconciliationFindingSchema.parse({
    ...passBase('SpecReconciliation', n, 'Scope of Work'),
    category: 'Scope of Work',
    specSection: '08 44 13',
    typicalDeliverable: 'Shop drawings',
    gapType: 'missing-submittal',
    inferenceBasis: 'knowledge-module:div08-deliverables',
    ...overrides,
  });
}

let _exclusionStressTestCounter = 0;
export function createExclusionStressTestFinding(
  overrides?: Partial<z.infer<typeof ExclusionStressTestFindingSchema>>
): z.infer<typeof ExclusionStressTestFindingSchema> {
  const n = _exclusionStressTestCounter++;
  return ExclusionStressTestFindingSchema.parse({
    ...passBase('ExclusionStressTest', n, 'Scope of Work'),
    category: 'Scope of Work',
    exclusionQuote: 'Structural calculations are excluded.',
    tensionQuote: 'AAMA 501.4 requires structural adequacy verification.',
    specSection: '08 44 13',
    tensionType: 'spec-requires-excluded-item',
    inferenceBasis: 'knowledge-module:aama-submittal-standards',
    ...overrides,
  });
}

let _bidReconciliationCounter = 0;
export function createBidReconciliationFinding(
  overrides?: Partial<z.infer<typeof BidReconciliationFindingSchema>>
): z.infer<typeof BidReconciliationFindingSchema> {
  const n = _bidReconciliationCounter++;
  return BidReconciliationFindingSchema.parse({
    ...passBase('BidReconciliation', n, 'Scope of Work'),
    category: 'Scope of Work',
    contractQuote: 'Curtain wall installation per Section 08 44 13.',
    bidQuote: 'Curtain wall: 200 SF at $85/SF.',
    reconciliationType: 'exclusion-parity',
    directionOfRisk: 'Contract excludes structural calculations but bid includes engineering line item.',
    inferenceBasis: 'contract-quoted',
    ...overrides,
  });
}
