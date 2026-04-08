import { z } from 'zod';
import { SEVERITIES, CATEGORIES } from '../types/contract.js';

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

// --- Enum values (derived from single source in types/contract.ts) ---

const SeverityEnum = z.enum(SEVERITIES);
const CategoryEnum = z.enum(CATEGORIES);

export const ActionPriorityEnum = z.enum(['pre-bid', 'pre-sign', 'monitor']);

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
  actionPriority: ActionPriorityEnum,
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

const ScoreBreakdownCategorySchema = z.object({
  name: z.string(),
  points: z.number(),
});

export const MergedAnalysisResultSchema = z.object({
  client: z.string(),
  contractType: ContractTypeEnum,
  riskScore: z.number(),
  scoreBreakdown: z.array(ScoreBreakdownCategorySchema).optional(),
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
