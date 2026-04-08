import type { VercelRequest, VercelResponse } from '@vercel/node';

// Test ../src/ imports only
import { PassResultSchema } from '../src/schemas/analysis';
import { DEFAULT_COMPANY_PROFILE } from '../src/knowledge/types';
import { composeSystemPrompt } from '../src/knowledge/index';
import { validateAllModulesRegistered } from '../src/knowledge/registry';
import { computeBidSignal } from '../src/utils/bidSignal';
import { classifyError } from '../src/utils/errors';
import { mapToSnake, mapRow, mapRows } from '../src/lib/mappers';
import { uploadPdf } from '../src/lib/supabaseStorage';
import { MAX_FILE_SIZE } from '../src/constants/limits';
import { SynthesisPassResultSchema } from '../src/schemas/synthesisAnalysis';
import '../src/knowledge/regulatory/index';
import '../src/knowledge/trade/index';
import '../src/knowledge/standards/index';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.status(200).json({ status: 'src imports ok' });
}
