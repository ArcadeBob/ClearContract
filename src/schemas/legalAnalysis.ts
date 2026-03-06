import { z } from 'zod';

/**
 * Zod schemas for the 4 specialized legal analysis passes.
 *
 * Each pass has its own schema with clause-type-specific metadata as
 * REQUIRED fields (not optional). This leverages structured outputs
 * effectively -- the model must populate every field.
 *
 * IMPORTANT: No .min()/.max()/.minLength()/.maxLength() constraints --
 * structured outputs does not support them (per Phase 1 convention).
 *
 * These schemas are self-contained (do not import from analysis.ts)
 * to avoid cross-dependency issues during structured output compilation.
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
// Indemnification Finding Schema
// ---------------------------------------------------------------------------

export const IndemnificationFindingSchema = z.object({
  severity: SeverityEnum,
  category: z.literal('Legal Issues'),
  title: z.string(),
  description: z.string(),
  recommendation: z.string(),
  clauseReference: z.string(),
  clauseText: z.string(),
  explanation: z.string(),
  crossReferences: z.array(z.string()),
  riskType: z.enum(['limited', 'intermediate', 'broad']),
  hasInsuranceGap: z.boolean(),
  negotiationPosition: z.string(),
});

export const IndemnificationPassResultSchema = z.object({
  findings: z.array(IndemnificationFindingSchema),
  dates: z.array(ContractDateSchema),
});

// ---------------------------------------------------------------------------
// Payment Contingency Finding Schema
// ---------------------------------------------------------------------------

export const PaymentContingencyFindingSchema = z.object({
  severity: SeverityEnum,
  category: z.literal('Financial Terms'),
  title: z.string(),
  description: z.string(),
  recommendation: z.string(),
  clauseReference: z.string(),
  clauseText: z.string(),
  explanation: z.string(),
  crossReferences: z.array(z.string()),
  paymentType: z.enum(['pay-if-paid', 'pay-when-paid']),
  enforceabilityContext: z.string(),
  negotiationPosition: z.string(),
});

export const PaymentContingencyPassResultSchema = z.object({
  findings: z.array(PaymentContingencyFindingSchema),
  dates: z.array(ContractDateSchema),
});

// ---------------------------------------------------------------------------
// Liquidated Damages Finding Schema
// ---------------------------------------------------------------------------

export const LiquidatedDamagesFindingSchema = z.object({
  severity: SeverityEnum,
  category: z.literal('Financial Terms'),
  title: z.string(),
  description: z.string(),
  recommendation: z.string(),
  clauseReference: z.string(),
  clauseText: z.string(),
  explanation: z.string(),
  crossReferences: z.array(z.string()),
  amountOrRate: z.string(),
  capStatus: z.enum(['capped', 'uncapped']),
  proportionalityAssessment: z.string(),
  negotiationPosition: z.string(),
});

export const LiquidatedDamagesPassResultSchema = z.object({
  findings: z.array(LiquidatedDamagesFindingSchema),
  dates: z.array(ContractDateSchema),
});

// ---------------------------------------------------------------------------
// Retainage Finding Schema
// ---------------------------------------------------------------------------

export const RetainageFindingSchema = z.object({
  severity: SeverityEnum,
  category: z.literal('Financial Terms'),
  title: z.string(),
  description: z.string(),
  recommendation: z.string(),
  clauseReference: z.string(),
  clauseText: z.string(),
  explanation: z.string(),
  crossReferences: z.array(z.string()),
  percentage: z.string(),
  releaseCondition: z.string(),
  tiedTo: z.enum(['sub-work', 'project-completion', 'unspecified']),
  negotiationPosition: z.string(),
});

export const RetainagePassResultSchema = z.object({
  findings: z.array(RetainageFindingSchema),
  dates: z.array(ContractDateSchema),
});

// ---------------------------------------------------------------------------
// Insurance Finding Schema (LEGAL-06)
// ---------------------------------------------------------------------------

export const InsuranceCoverageItemSchema = z.object({
  coverageType: z.string(),
  requiredLimit: z.string(),
  isAboveStandard: z.boolean(),
});

export const InsuranceEndorsementSchema = z.object({
  endorsementType: z.string(),
  isNonStandard: z.boolean(),
});

export const InsuranceFindingSchema = z.object({
  severity: SeverityEnum,
  category: z.literal('Insurance Requirements'),
  title: z.string(),
  description: z.string(),
  recommendation: z.string(),
  clauseReference: z.string(),
  clauseText: z.string(),
  explanation: z.string(),
  crossReferences: z.array(z.string()),
  coverageItems: z.array(InsuranceCoverageItemSchema),
  endorsements: z.array(InsuranceEndorsementSchema),
  certificateHolder: z.string(),
  negotiationPosition: z.string(),
});

export const InsurancePassResultSchema = z.object({
  findings: z.array(InsuranceFindingSchema),
  dates: z.array(ContractDateSchema),
});

// ---------------------------------------------------------------------------
// Termination Finding Schema (LEGAL-07)
// ---------------------------------------------------------------------------

export const TerminationFindingSchema = z.object({
  severity: SeverityEnum,
  category: z.literal('Legal Issues'),
  title: z.string(),
  description: z.string(),
  recommendation: z.string(),
  clauseReference: z.string(),
  clauseText: z.string(),
  explanation: z.string(),
  crossReferences: z.array(z.string()),
  terminationType: z.enum(['for-convenience', 'for-cause', 'mutual']),
  noticePeriod: z.string(),
  compensation: z.string(),
  curePeriod: z.string(),
  negotiationPosition: z.string(),
});

export const TerminationPassResultSchema = z.object({
  findings: z.array(TerminationFindingSchema),
  dates: z.array(ContractDateSchema),
});

// ---------------------------------------------------------------------------
// Flow-Down Finding Schema (LEGAL-08)
// ---------------------------------------------------------------------------

export const FlowDownFindingSchema = z.object({
  severity: SeverityEnum,
  category: z.literal('Legal Issues'),
  title: z.string(),
  description: z.string(),
  recommendation: z.string(),
  clauseReference: z.string(),
  clauseText: z.string(),
  explanation: z.string(),
  crossReferences: z.array(z.string()),
  flowDownScope: z.enum(['blanket', 'specific-sections', 'targeted-with-exceptions']),
  problematicObligations: z.array(z.string()),
  primeContractAvailable: z.boolean(),
  negotiationPosition: z.string(),
});

export const FlowDownPassResultSchema = z.object({
  findings: z.array(FlowDownFindingSchema),
  dates: z.array(ContractDateSchema),
});

// ---------------------------------------------------------------------------
// No-Damage-for-Delay Finding Schema (LEGAL-09)
// ---------------------------------------------------------------------------

export const NoDamageDelayFindingSchema = z.object({
  severity: SeverityEnum,
  category: z.literal('Legal Issues'),
  title: z.string(),
  description: z.string(),
  recommendation: z.string(),
  clauseReference: z.string(),
  clauseText: z.string(),
  explanation: z.string(),
  crossReferences: z.array(z.string()),
  waiverScope: z.enum(['absolute', 'broad-with-exceptions', 'reasonable-exceptions']),
  exceptions: z.array(z.string()),
  enforceabilityContext: z.string(),
  negotiationPosition: z.string(),
});

export const NoDamageDelayPassResultSchema = z.object({
  findings: z.array(NoDamageDelayFindingSchema),
  dates: z.array(ContractDateSchema),
});

// ---------------------------------------------------------------------------
// Lien Rights Finding Schema (LEGAL-10)
// ---------------------------------------------------------------------------

export const LienRightsFindingSchema = z.object({
  severity: SeverityEnum,
  category: z.literal('Financial Terms'),
  title: z.string(),
  description: z.string(),
  recommendation: z.string(),
  clauseReference: z.string(),
  clauseText: z.string(),
  explanation: z.string(),
  crossReferences: z.array(z.string()),
  waiverType: z.enum(['no-lien-clause', 'unconditional-before-payment', 'broad-release', 'conditional', 'missing']),
  lienFilingDeadline: z.string(),
  enforceabilityContext: z.string(),
  negotiationPosition: z.string(),
});

export const LienRightsPassResultSchema = z.object({
  findings: z.array(LienRightsFindingSchema),
  dates: z.array(ContractDateSchema),
});

// ---------------------------------------------------------------------------
// Dispute Resolution Finding Schema (LEGAL-11)
// ---------------------------------------------------------------------------

export const DisputeResolutionFindingSchema = z.object({
  severity: SeverityEnum,
  category: z.literal('Legal Issues'),
  title: z.string(),
  description: z.string(),
  recommendation: z.string(),
  clauseReference: z.string(),
  clauseText: z.string(),
  explanation: z.string(),
  crossReferences: z.array(z.string()),
  mechanism: z.enum(['mandatory-arbitration', 'litigation', 'mediation-then-arbitration', 'mediation-then-litigation', 'unspecified']),
  venue: z.string(),
  feeShifting: z.enum(['one-sided', 'mutual', 'none', 'unspecified']),
  mediationRequired: z.boolean(),
  negotiationPosition: z.string(),
});

export const DisputeResolutionPassResultSchema = z.object({
  findings: z.array(DisputeResolutionFindingSchema),
  dates: z.array(ContractDateSchema),
});

// ---------------------------------------------------------------------------
// Change Order Finding Schema (LEGAL-12)
// ---------------------------------------------------------------------------

export const ChangeOrderFindingSchema = z.object({
  severity: SeverityEnum,
  category: z.literal('Contract Compliance'),
  title: z.string(),
  description: z.string(),
  recommendation: z.string(),
  clauseReference: z.string(),
  clauseText: z.string(),
  explanation: z.string(),
  crossReferences: z.array(z.string()),
  changeType: z.enum(['unilateral-no-adjustment', 'unilateral-with-adjustment', 'mutual', 'unspecified']),
  noticeRequired: z.string(),
  pricingMechanism: z.string(),
  proceedPending: z.boolean(),
  negotiationPosition: z.string(),
});

export const ChangeOrderPassResultSchema = z.object({
  findings: z.array(ChangeOrderFindingSchema),
  dates: z.array(ContractDateSchema),
});
