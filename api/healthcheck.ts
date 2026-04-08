import type { VercelRequest, VercelResponse } from '@vercel/node';

// Test each import from analyze.ts one by one
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { PassResultSchema, RiskOverviewResultSchema } from '../src/schemas/analysis';
import { DEFAULT_COMPANY_PROFILE } from '../src/knowledge/types';
import { composeSystemPrompt } from '../src/knowledge/index';
import { validateAllModulesRegistered } from '../src/knowledge/registry';
import { computeBidSignal } from '../src/utils/bidSignal';
import { classifyError, formatApiError } from '../src/utils/errors';
import '../src/knowledge/regulatory/index';
import '../src/knowledge/trade/index';
import '../src/knowledge/standards/index';
import { preparePdfForAnalysis } from './pdf';
import { mergePassResults } from './merge';
import { computeScheduleConflicts } from './conflicts';
import { SynthesisPassResultSchema } from '../src/schemas/synthesisAnalysis';
import { ANALYSIS_PASSES, SYNTHESIS_SYSTEM_PROMPT } from './passes/index';
import { computePassCost } from './cost';
import { uploadPdf, downloadPdf } from '../src/lib/supabaseStorage';
import { MAX_FILE_SIZE, MAX_BID_FILE_SIZE } from '../src/constants/limits';
import { checkRateLimit } from './rateLimit';
import { mapToSnake, mapRow, mapRows } from '../src/lib/mappers';

// These two are heavy - test separately
import Anthropic from '@anthropic-ai/sdk';
import { fetch as undiciFetch, Agent } from 'undici';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    status: 'all imports loaded',
    passCount: ANALYSIS_PASSES.length,
    hasZod: typeof z !== 'undefined',
    hasAnthropic: typeof Anthropic !== 'undefined',
  });
}
