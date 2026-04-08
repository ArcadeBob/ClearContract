import { z } from 'zod';
import { MergedFindingSchema } from './finding.js';
import { ContractDateSchema } from './analysis.js';

/**
 * Client-side AnalysisResult schema.
 *
 * Validates the full response shape that the client receives from the
 * /api/analyze endpoint. This includes fields added after merge (id on
 * findings, bidSignal) that are NOT in MergedAnalysisResultSchema.
 *
 * Plan 02 will use this for client-side response validation.
 */

const ContractTypeEnum = z.enum([
  'Prime Contract',
  'Subcontract',
  'Purchase Order',
  'Change Order',
]);

// --- Bid signal sub-schemas ---

const BidFactorSchema = z.object({
  name: z.string(),
  score: z.number(),
  weight: z.number(),
});

const BidSignalSchema = z.object({
  level: z.enum(['bid', 'caution', 'no-bid']),
  label: z.string(),
  score: z.number(),
  factors: z.array(BidFactorSchema),
});

// --- Pass status ---

const PassStatusSchema = z.object({
  passName: z.string(),
  status: z.enum(['success', 'failed']),
  error: z.string().optional(),
});

// --- Score breakdown ---

const ScoreBreakdownSchema = z.object({
  name: z.string(),
  points: z.number(),
});

// --- Full client-side analysis result ---

export const AnalysisResultSchema = z.object({
  client: z.string(),
  contractType: ContractTypeEnum,
  riskScore: z.number(),
  scoreBreakdown: z.array(ScoreBreakdownSchema).optional(),
  bidSignal: BidSignalSchema.optional(),
  findings: z.array(MergedFindingSchema),
  dates: z.array(ContractDateSchema),
  passResults: z.array(PassStatusSchema),
});

export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;
