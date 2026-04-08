export type { AnalysisPass } from './types.js';
export { overviewPasses } from './overview.js';
export { legalPasses } from './legal.js';
export { scopePasses } from './scope.js';
export { SYNTHESIS_SYSTEM_PROMPT } from './synthesis.js';

import { overviewPasses } from './overview.js';
import { legalPasses } from './legal.js';
import { scopePasses } from './scope.js';

// ---------------------------------------------------------------------------
// Composed ANALYSIS_PASSES array -- EXACT same order as original passes.ts
// ---------------------------------------------------------------------------
// Order:
//   1. risk-overview (overview)
//   2. dates-deadlines (scope)
//   3. scope-extraction (scope)
//   4. legal-indemnification .. legal-change-order (11 legal passes)
//   5. verbiage-analysis, labor-compliance, warranty, safety-osha (scope)
//   6. spec-reconciliation, exclusion-stress-test, bid-reconciliation (scope stage 3)
// ---------------------------------------------------------------------------

export const ANALYSIS_PASSES = [
  ...overviewPasses,          // [0] risk-overview
  ...scopePasses.slice(0, 2), // [1-2] dates-deadlines, scope-extraction
  ...legalPasses,             // [3-13] all 11 legal passes
  ...scopePasses.slice(2),    // [14-20] verbiage, labor, warranty, safety, spec-recon, exclusion, bid-recon
];
