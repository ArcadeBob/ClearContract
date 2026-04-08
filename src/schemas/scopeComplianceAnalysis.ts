import { z } from 'zod';
import { SEVERITIES } from '../types/contract.js';
import { ContractDateSchema, ActionPriorityEnum } from './analysis.js';
import { InferenceBasisSchema } from './inferenceBasis.js';

/**
 * Zod schemas for the specialized scope/compliance/verbiage analysis passes.
 *
 * Each pass has its own schema with pass-type-specific metadata as
 * REQUIRED fields (not optional). This leverages structured outputs
 * effectively -- the model must populate every field.
 *
 * IMPORTANT: No .min()/.max()/.minLength()/.maxLength() constraints --
 * structured outputs does not support them (per Phase 1 convention).
 */

const SeverityEnum = z.enum(SEVERITIES);

// ---------------------------------------------------------------------------
// Submittal Entry Schema (SCOPE-05)
// ---------------------------------------------------------------------------

export const SubmittalEntrySchema = z.object({
  type: z.enum(['shop-drawing', 'sample', 'mockup', 'product-data']),
  description: z.string(),
  reviewDuration: z.number(),
  responsibleParty: z.string(),
  reviewCycles: z.number(),
  resubmittalBuffer: z.number(),
  specSection: z.string(),
  leadTime: z.number(),
  clauseReference: z.string(),
  statedFields: z.array(z.string()),
});

export type SubmittalEntry = z.infer<typeof SubmittalEntrySchema>;

// ---------------------------------------------------------------------------
// Scope of Work Finding Schema (SCOPE-01)
// ---------------------------------------------------------------------------

export const ScopeOfWorkFindingSchema = z.object({
  severity: SeverityEnum,
  category: z.literal('Scope of Work'),
  title: z.string(),
  description: z.string(),
  recommendation: z.string(),
  clauseReference: z.string(),
  clauseText: z.string(),
  explanation: z.string(),
  crossReferences: z.array(z.string()),
  scopeItemType: z.enum([
    'inclusion',
    'exclusion',
    'specification-reference',
    'scope-rule',
    'ambiguity',
    'gap',
    'quantity-ambiguity',
  ]),
  specificationReference: z.string(),
  affectedTrade: z.string(),
  negotiationPosition: z.string(),
  downgradedFrom: SeverityEnum.optional(),
  actionPriority: ActionPriorityEnum,
});

export const ScopeOfWorkPassResultSchema = z.object({
  findings: z.array(ScopeOfWorkFindingSchema),
  dates: z.array(ContractDateSchema),
  submittals: z.array(SubmittalEntrySchema),
});

// ---------------------------------------------------------------------------
// Dates & Deadlines Finding Schema (SCOPE-02)
// ---------------------------------------------------------------------------

export const DatesDeadlinesFindingSchema = z.object({
  severity: SeverityEnum,
  category: z.literal('Important Dates'),
  title: z.string(),
  description: z.string(),
  recommendation: z.string(),
  clauseReference: z.string(),
  clauseText: z.string(),
  explanation: z.string(),
  crossReferences: z.array(z.string()),
  periodType: z.enum([
    'notice-period',
    'cure-period',
    'payment-term',
    'project-milestone',
    'submittal-deadline',
    'warranty-period',
    'closeout-deadline',
  ]),
  duration: z.string(),
  triggerEvent: z.string(),
  negotiationPosition: z.string(),
  downgradedFrom: SeverityEnum.optional(),
  actionPriority: ActionPriorityEnum,
});

export const DatesDeadlinesPassResultSchema = z.object({
  findings: z.array(DatesDeadlinesFindingSchema),
  dates: z.array(ContractDateSchema),
});

// ---------------------------------------------------------------------------
// Verbiage Analysis Finding Schema (SCOPE-03)
// ---------------------------------------------------------------------------

export const VerbiageFindingSchema = z.object({
  severity: SeverityEnum,
  category: z.enum([
    'Scope of Work',
    'Contract Compliance',
    'Legal Issues',
    'Financial Terms',
  ]),
  title: z.string(),
  description: z.string(),
  recommendation: z.string(),
  clauseReference: z.string(),
  clauseText: z.string(),
  explanation: z.string(),
  crossReferences: z.array(z.string()),
  issueType: z.enum([
    'ambiguous-language',
    'one-sided-term',
    'missing-protection',
    'undefined-term',
    'overreach-clause',
  ]),
  affectedParty: z.enum([
    'subcontractor',
    'general-contractor',
    'both',
    'unspecified',
  ]),
  suggestedClarification: z.string(),
  negotiationPosition: z.string(),
  downgradedFrom: SeverityEnum.optional(),
  actionPriority: ActionPriorityEnum,
});

export const VerbiagePassResultSchema = z.object({
  findings: z.array(VerbiageFindingSchema),
  dates: z.array(ContractDateSchema),
});

// ---------------------------------------------------------------------------
// Labor Compliance Finding Schema (COMP-01)
// ---------------------------------------------------------------------------

export const ComplianceChecklistItemSchema = z.object({
  item: z.string(),
  deadline: z.string(),
  responsibleParty: z.string(),
  contactInfo: z.string(),
  status: z.enum(['required', 'conditional', 'recommended']),
});

export const LaborComplianceFindingSchema = z.object({
  severity: SeverityEnum,
  category: z.literal('Labor Compliance'),
  title: z.string(),
  description: z.string(),
  recommendation: z.string(),
  clauseReference: z.string(),
  clauseText: z.string(),
  explanation: z.string(),
  crossReferences: z.array(z.string()),
  requirementType: z.enum([
    'prevailing-wage',
    'certified-payroll',
    'apprenticeship',
    'safety-training',
    'drug-testing',
    'background-check',
    'licensing',
    'bonding',
    'reporting',
    'other',
  ]),
  responsibleParty: z.string(),
  contactInfo: z.string(),
  deadline: z.string(),
  checklistItems: z.array(ComplianceChecklistItemSchema),
  negotiationPosition: z.string(),
  downgradedFrom: SeverityEnum.optional(),
  actionPriority: ActionPriorityEnum,
});

export const LaborCompliancePassResultSchema = z.object({
  findings: z.array(LaborComplianceFindingSchema),
  dates: z.array(ContractDateSchema),
});

// ---------------------------------------------------------------------------
// Spec Reconciliation Finding Schema (SCOPE-03)
// ---------------------------------------------------------------------------

export const SpecReconciliationFindingSchema = z.object({
  severity: SeverityEnum,
  category: z.literal('Scope of Work'),
  title: z.string(),
  description: z.string(),
  recommendation: z.string(),
  clauseReference: z.string(),
  clauseText: z.string(),
  explanation: z.string(),
  crossReferences: z.array(z.string()),
  specSection: z.string(),
  typicalDeliverable: z.string(),
  gapType: z.enum([
    'missing-submittal',
    'missing-test-report',
    'missing-certification',
    'missing-structural-calc',
    'missing-warranty',
    'missing-mock-up',
    'finish-spec-mismatch',
    'other',
  ]),
  inferenceBasis: InferenceBasisSchema,
  negotiationPosition: z.string(),
  downgradedFrom: SeverityEnum.optional(),
  actionPriority: ActionPriorityEnum,
});

export const SpecReconciliationPassResultSchema = z.object({
  findings: z.array(SpecReconciliationFindingSchema),
  dates: z.array(ContractDateSchema),
});

// ---------------------------------------------------------------------------
// Exclusion Stress-Test Finding Schema (SCOPE-04)
// ---------------------------------------------------------------------------

export const ExclusionStressTestFindingSchema = z.object({
  severity: SeverityEnum,
  category: z.literal('Scope of Work'),
  title: z.string(),
  description: z.string(),
  recommendation: z.string(),
  clauseReference: z.string(),
  clauseText: z.string(),
  explanation: z.string(),
  crossReferences: z.array(z.string()),
  exclusionQuote: z.string(),
  tensionQuote: z.string(),
  specSection: z.string(),
  tensionType: z.enum([
    'spec-requires-excluded-item',
    'code-requires-excluded-item',
    'standard-practice-conflict',
    'warranty-gap',
    'other',
  ]),
  inferenceBasis: InferenceBasisSchema,
  negotiationPosition: z.string(),
  downgradedFrom: SeverityEnum.optional(),
  actionPriority: ActionPriorityEnum,
});

export const ExclusionStressTestPassResultSchema = z.object({
  findings: z.array(ExclusionStressTestFindingSchema),
  dates: z.array(ContractDateSchema),
});

// ---------------------------------------------------------------------------
// Bid Reconciliation Finding Schema (BID-02, BID-04)
// ---------------------------------------------------------------------------

export const BidReconciliationFindingSchema = z.object({
  severity: SeverityEnum,
  category: z.literal('Scope of Work'),
  title: z.string(),
  description: z.string(),
  recommendation: z.string(),
  clauseReference: z.string(),
  clauseText: z.string(),
  explanation: z.string(),
  crossReferences: z.array(z.string()),
  contractQuote: z.string().nullable(),
  bidQuote: z.string().nullable(),
  reconciliationType: z.enum(['exclusion-parity', 'quantity-delta', 'unbid-scope']),
  directionOfRisk: z.string(),
  inferenceBasis: z.literal('contract-quoted'),
  negotiationPosition: z.string(),
  downgradedFrom: SeverityEnum.optional(),
  actionPriority: ActionPriorityEnum,
});

export const BidReconciliationPassResultSchema = z.object({
  findings: z.array(BidReconciliationFindingSchema),
  dates: z.array(ContractDateSchema),
});

// ---------------------------------------------------------------------------
// Warranty Clause Finding Schema (CLS-01)
// ---------------------------------------------------------------------------

export const WarrantyFindingSchema = z.object({
  severity: SeverityEnum,
  category: z.literal('Contract Compliance'),
  title: z.string(),
  description: z.string(),
  recommendation: z.string(),
  clauseReference: z.string(),
  clauseText: z.string(),
  explanation: z.string(),
  crossReferences: z.array(z.string()),
  warrantyAspect: z.enum([
    'duration',
    'exclusion',
    'transferability',
    'defect-coverage',
    'call-back-period',
    'missing-warranty',
  ]),
  warrantyDuration: z.string(),
  affectedParty: z.enum(['subcontractor', 'general-contractor', 'manufacturer', 'owner', 'unspecified']),
  negotiationPosition: z.string(),
  downgradedFrom: SeverityEnum.optional(),
  actionPriority: ActionPriorityEnum,
});

export const WarrantyPassResultSchema = z.object({
  findings: z.array(WarrantyFindingSchema),
  dates: z.array(ContractDateSchema),
});

// ---------------------------------------------------------------------------
// Safety/OSHA Compliance Finding Schema (CLS-02)
// ---------------------------------------------------------------------------

export const SafetyOshaFindingSchema = z.object({
  severity: SeverityEnum,
  category: z.literal('Contract Compliance'),
  title: z.string(),
  description: z.string(),
  recommendation: z.string(),
  clauseReference: z.string(),
  clauseText: z.string(),
  explanation: z.string(),
  crossReferences: z.array(z.string()),
  safetyAspect: z.enum([
    'site-safety-program',
    'fall-protection',
    'gc-safety-coordination',
    'scaffolding-responsibility',
    'hazmat-handling',
    'incident-reporting',
    'safety-indemnification',
    'missing-safety-provision',
  ]),
  regulatoryReference: z.string(),
  responsibleParty: z.string(),
  inferenceBasis: InferenceBasisSchema,
  negotiationPosition: z.string(),
  downgradedFrom: SeverityEnum.optional(),
  actionPriority: ActionPriorityEnum,
});

export const SafetyOshaPassResultSchema = z.object({
  findings: z.array(SafetyOshaFindingSchema),
  dates: z.array(ContractDateSchema),
});
