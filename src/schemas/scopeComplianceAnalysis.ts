import { z } from 'zod';
import { SEVERITIES } from '../types/contract';
import { ContractDateSchema, ActionPriorityEnum } from './analysis';

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
