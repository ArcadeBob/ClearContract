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
});

export const RetainagePassResultSchema = z.object({
  findings: z.array(RetainageFindingSchema),
  dates: z.array(ContractDateSchema),
});
