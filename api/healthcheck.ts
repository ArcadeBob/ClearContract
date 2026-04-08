import type { VercelRequest, VercelResponse } from '@vercel/node';
import { MAX_FILE_SIZE, MAX_BID_FILE_SIZE } from '../src/constants/limits.js';
import { preparePdfForAnalysis } from './pdf.js';
import { mergePassResults } from './merge.js';
import { computeScheduleConflicts } from './conflicts.js';
import { ANALYSIS_PASSES, SYNTHESIS_SYSTEM_PROMPT } from './passes/index.js';
import { computePassCost } from './cost.js';
import { checkRateLimit } from './rateLimit.js';
import { computeRiskScore, applySeverityGuard } from './scoring.js';
import type { PassUsage, PassWithUsage } from './types.js';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  // Verify all imports resolved (they would throw at import time if missing)
  const modules = {
    preparePdfForAnalysis: typeof preparePdfForAnalysis,
    mergePassResults: typeof mergePassResults,
    computeScheduleConflicts: typeof computeScheduleConflicts,
    ANALYSIS_PASSES: ANALYSIS_PASSES.length,
    SYNTHESIS_SYSTEM_PROMPT: typeof SYNTHESIS_SYSTEM_PROMPT,
    computePassCost: typeof computePassCost,
    checkRateLimit: typeof checkRateLimit,
    computeRiskScore: typeof computeRiskScore,
    applySeverityGuard: typeof applySeverityGuard,
    MAX_FILE_SIZE,
    MAX_BID_FILE_SIZE,
  };
  res.status(200).json({ status: 'ok', modules });
}
