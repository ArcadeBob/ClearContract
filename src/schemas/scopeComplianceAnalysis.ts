import { z } from 'zod';

/**
 * Zod schemas for the 4 specialized scope/compliance/verbiage analysis passes.
 *
 * Each pass has its own schema with pass-type-specific metadata as
 * REQUIRED fields (not optional). This leverages structured outputs
 * effectively -- the model must populate every field.
 *
 * IMPORTANT: No .min()/.max()/.minLength()/.maxLength() constraints --
 * structured outputs does not support them (per Phase 1 convention).
 *
 * These schemas are self-contained (do not import from analysis.ts or
 * legalAnalysis.ts) to avoid cross-dependency issues during structured
 * output compilation.
 */

// --- Local enum values (self-contained for structured output compilation) ---

const SeverityEnum = z.enum(['Critical', 'High', 'Medium', 'Low', 'Info']);

const DateTypeEnum = z.enum(['Start', 'Milestone', 'Deadline', 'Expiry']);

const ContractDateSchema = z.object({
  label: z.string(),
  date: z.string(),
  type: DateTypeEnum,
});

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
  ]),
  specificationReference: z.string(),
  affectedTrade: z.string(),
  negotiationPosition: z.string(),
});

export const ScopeOfWorkPassResultSchema = z.object({
  findings: z.array(ScopeOfWorkFindingSchema),
  dates: z.array(ContractDateSchema),
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
});

export const LaborCompliancePassResultSchema = z.object({
  findings: z.array(LaborComplianceFindingSchema),
  dates: z.array(ContractDateSchema),
});
