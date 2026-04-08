import { z } from 'zod';

// ---------------------------------------------------------------------------
// Analysis pass interface
// ---------------------------------------------------------------------------

export interface AnalysisPass {
  name: string;
  systemPrompt: string;
  userPrompt: string;
  isOverview: boolean;
  isLegal?: boolean;
  isScope?: boolean;
  schema?: z.ZodTypeAny;
  stage?: 2 | 3;
  requiresBid?: boolean;
}
