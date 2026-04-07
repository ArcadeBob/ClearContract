import { z } from 'zod';
import { SEVERITIES, CATEGORIES } from '../types/contract';
import { ActionPriorityEnum } from './analysis';

/**
 * Canonical Zod schema for the merged Finding type.
 *
 * This is the single source of truth for the Finding shape used across
 * the client. The TypeScript `Finding` type in types/contract.ts is
 * re-exported as `z.infer<typeof MergedFindingSchema>`.
 *
 * IMPORTANT: No .min()/.max()/.minLength()/.maxLength() constraints --
 * structured outputs does not support them (per Phase 1 convention).
 */

const SeverityEnum = z.enum(SEVERITIES);
const CategoryEnum = z.enum(CATEGORIES);

// ---------------------------------------------------------------------------
// LegalMeta discriminated union (11 variants)
// ---------------------------------------------------------------------------

const InsuranceCoverageItemSchema = z.object({
  coverageType: z.string(),
  requiredLimit: z.string(),
  isAboveStandard: z.boolean(),
});

const InsuranceEndorsementSchema = z.object({
  endorsementType: z.string(),
  isNonStandard: z.boolean(),
});

export const LegalMetaSchema = z.discriminatedUnion('clauseType', [
  z.object({
    clauseType: z.literal('indemnification'),
    riskType: z.enum(['limited', 'intermediate', 'broad']),
    hasInsuranceGap: z.boolean(),
  }),
  z.object({
    clauseType: z.literal('payment-contingency'),
    paymentType: z.enum(['pay-if-paid', 'pay-when-paid']),
    enforceabilityContext: z.string(),
  }),
  z.object({
    clauseType: z.literal('liquidated-damages'),
    amountOrRate: z.string(),
    capStatus: z.enum(['capped', 'uncapped']),
    proportionalityAssessment: z.string(),
  }),
  z.object({
    clauseType: z.literal('retainage'),
    percentage: z.string(),
    releaseCondition: z.string(),
    tiedTo: z.enum(['sub-work', 'project-completion', 'unspecified']),
  }),
  z.object({
    clauseType: z.literal('insurance'),
    coverageItems: z.array(InsuranceCoverageItemSchema),
    endorsements: z.array(InsuranceEndorsementSchema),
    certificateHolder: z.string(),
  }),
  z.object({
    clauseType: z.literal('termination'),
    terminationType: z.string(),
    noticePeriod: z.string(),
    compensation: z.string(),
    curePeriod: z.string(),
  }),
  z.object({
    clauseType: z.literal('flow-down'),
    flowDownScope: z.string(),
    problematicObligations: z.array(z.string()),
    primeContractAvailable: z.boolean(),
  }),
  z.object({
    clauseType: z.literal('no-damage-delay'),
    waiverScope: z.string(),
    exceptions: z.array(z.string()),
    enforceabilityContext: z.string(),
  }),
  z.object({
    clauseType: z.literal('lien-rights'),
    waiverType: z.string(),
    lienFilingDeadline: z.string(),
    enforceabilityContext: z.string(),
  }),
  z.object({
    clauseType: z.literal('dispute-resolution'),
    mechanism: z.string(),
    venue: z.string(),
    feeShifting: z.string(),
    mediationRequired: z.boolean(),
  }),
  z.object({
    clauseType: z.literal('change-order'),
    changeType: z.string(),
    noticeRequired: z.string(),
    pricingMechanism: z.string(),
    proceedPending: z.boolean(),
  }),
]);

// ---------------------------------------------------------------------------
// ScopeMeta discriminated union (4 variants)
// ---------------------------------------------------------------------------

const ComplianceChecklistItemSchema = z.object({
  item: z.string(),
  deadline: z.string(),
  responsibleParty: z.string(),
  contactInfo: z.string(),
  status: z.enum(['required', 'conditional', 'recommended']),
});

export const ScopeMetaSchema = z.discriminatedUnion('passType', [
  z.object({
    passType: z.literal('scope-extraction'),
    scopeItemType: z.string(),
    specificationReference: z.string(),
    affectedTrade: z.string(),
  }),
  z.object({
    passType: z.literal('dates-deadlines'),
    periodType: z.string(),
    duration: z.string(),
    triggerEvent: z.string(),
  }),
  z.object({
    passType: z.literal('verbiage'),
    issueType: z.string(),
    affectedParty: z.string(),
    suggestedClarification: z.string(),
  }),
  z.object({
    passType: z.literal('labor-compliance'),
    requirementType: z.string(),
    responsibleParty: z.string(),
    contactInfo: z.string(),
    deadline: z.string(),
    checklistItems: z.array(ComplianceChecklistItemSchema),
  }),
  z.object({
    passType: z.literal('spec-reconciliation'),
    specSection: z.string(),
    typicalDeliverable: z.string(),
    gapType: z.string(),
  }),
  z.object({
    passType: z.literal('exclusion-stress-test'),
    exclusionQuote: z.string(),
    tensionQuote: z.string(),
    specSection: z.string(),
    tensionType: z.string(),
  }),
]);

// ---------------------------------------------------------------------------
// MergedFindingSchema -- canonical Finding shape
// ---------------------------------------------------------------------------

export const MergedFindingSchema = z.object({
  // Required fields
  id: z.string(),
  severity: SeverityEnum,
  category: CategoryEnum,
  title: z.string(),
  description: z.string(),
  recommendation: z.string(),
  clauseReference: z.string(),
  negotiationPosition: z.string(),
  actionPriority: ActionPriorityEnum,
  resolved: z.boolean(),
  note: z.string(),

  // Optional fields (context-dependent)
  clauseText: z.string().optional(),
  explanation: z.string().optional(),
  crossReferences: z.array(z.string()).optional(),
  legalMeta: LegalMetaSchema.optional(),
  scopeMeta: ScopeMetaSchema.optional(),
  sourcePass: z.string().optional(),
  downgradedFrom: SeverityEnum.optional(),
  isSynthesis: z.boolean().optional(),
});

export type MergedFinding = z.infer<typeof MergedFindingSchema>;
