import { z } from 'zod';

/**
 * Zod schemas for the multi-pass contract analysis pipeline.
 *
 * These schemas define the exact shape of every analysis pass response
 * and the merged result sent to the client. They are used with Claude's
 * structured outputs to guarantee type-safe responses.
 *
 * IMPORTANT: No .min()/.max()/.minLength()/.maxLength() constraints —
 * structured outputs does not support them.
 */

// --- Enum values (kept in sync with src/types/contract.ts) ---

const SeverityEnum = z.enum(['Critical', 'High', 'Medium', 'Low', 'Info']);

const CategoryEnum = z.enum([
  'Legal Issues',
  'Scope of Work',
  'Contract Compliance',
  'Labor Compliance',
  'Insurance Requirements',
  'Important Dates',
  'Financial Terms',
  'Technical Standards',
  'Risk Assessment',
]);

const DateTypeEnum = z.enum(['Start', 'Milestone', 'Deadline', 'Expiry']);

const ContractTypeEnum = z.enum([
  'Prime Contract',
  'Subcontract',
  'Purchase Order',
  'Change Order',
]);

// --- Core schemas ---

export const FindingSchema = z.object({
  severity: SeverityEnum,
  category: CategoryEnum,
  title: z.string(),
  description: z.string(),
  recommendation: z.string(),
  clauseReference: z.string(),
  clauseText: z.string().optional(),
  explanation: z.string().optional(),
  negotiationPosition: z.string(),
  downgradedFrom: SeverityEnum.optional(),
});

export const ContractDateSchema = z.object({
  label: z.string(),
  date: z.string(),
  type: DateTypeEnum,
});

// --- Pass-level schema (returned by each analysis pass) ---

export const PassResultSchema = z.object({
  findings: z.array(FindingSchema),
  dates: z.array(ContractDateSchema),
});

// --- Risk overview pass schema (extends PassResult with client/contract metadata) ---

export const RiskOverviewResultSchema = z.object({
  client: z.string(),
  contractType: ContractTypeEnum,
  findings: z.array(FindingSchema),
  dates: z.array(ContractDateSchema),
});

// --- Pass status tracking ---

const PassStatusSchema = z.object({
  passName: z.string(),
  status: z.enum(['success', 'failed']),
  error: z.string().optional(),
});

// --- Merged result (final response sent to client) ---

export const MergedAnalysisResultSchema = z.object({
  client: z.string(),
  contractType: ContractTypeEnum,
  riskScore: z.number(),
  findings: z.array(FindingSchema),
  dates: z.array(ContractDateSchema),
  passResults: z.array(PassStatusSchema),
});

// --- Inferred TypeScript types ---

export type FindingResult = z.infer<typeof FindingSchema>;
export type ContractDateResult = z.infer<typeof ContractDateSchema>;
export type PassResult = z.infer<typeof PassResultSchema>;
export type RiskOverviewResult = z.infer<typeof RiskOverviewResultSchema>;
export type MergedAnalysisResult = z.infer<typeof MergedAnalysisResultSchema>;
