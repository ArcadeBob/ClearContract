import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { DEFAULT_COMPANY_PROFILE } from '../src/knowledge/types.js';
import { mapToSnake, mapRow, mapRows } from '../src/lib/mappers.js';

// 2A: Allow larger base64-encoded PDFs through Vercel body parser
export const config = { api: { bodyParser: { sizeLimit: '25mb' } } };
import Anthropic from '@anthropic-ai/sdk';
import { zodToJsonSchema } from 'zod-to-json-schema';
import {
  PassResultSchema,
  RiskOverviewResultSchema,
} from '../src/schemas/analysis.js';
import type {
  PassResult,
  RiskOverviewResult,
} from '../src/schemas/analysis.js';
import type { CompanyProfile } from '../src/knowledge/types.js';
import { composeSystemPrompt } from '../src/knowledge/index.js';
import { validateAllModulesRegistered } from '../src/knowledge/registry.js';
import { computeBidSignal } from '../src/utils/bidSignal.js';
import { classifyError, formatApiError } from '../src/utils/errors.js';
import '../src/knowledge/regulatory/index.js';
import '../src/knowledge/trade/index.js';
import '../src/knowledge/standards/index.js';
// undici import removed — was silently truncating SSE streams
import { preparePdfForAnalysis } from './pdf.js';
import { mergePassResults } from './merge.js';
import type { UnifiedFinding } from './merge.js';
import { computeScheduleConflicts } from './conflicts.js';
import { SynthesisPassResultSchema } from '../src/schemas/synthesisAnalysis.js';
import { ANALYSIS_PASSES, SYNTHESIS_SYSTEM_PROMPT } from './passes/index.js';
import type { AnalysisPass } from './passes/index.js';
import type { PassUsage, PassWithUsage } from './types.js';
import { computePassCost } from './cost.js';
import { uploadPdf, downloadPdf } from '../src/lib/supabaseStorage.js';
import { MAX_FILE_SIZE, MAX_BID_FILE_SIZE } from '../src/constants/limits.js';
import { checkRateLimit } from './rateLimit.js';

// ---------------------------------------------------------------------------
// Logger — silent in production, verbose in development
// ---------------------------------------------------------------------------
const isDev = process.env.VERCEL_ENV !== 'production';
const log = {
  info: (...args: unknown[]) => { if (isDev) console.log(...args); },
  error: (...args: unknown[]) => { console.error(...args); },
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// 2B+: Zod schema for full request body validation
const AnalyzeRequestSchema = z.object({
  storagePath: z.string().optional(),            // client-uploaded PDF path in Supabase Storage
  pdfBase64: z.string().optional(),              // legacy: base64-encoded PDF (kept for small files / compat)
  fileName: z.string().max(255).optional(),
  contractId: z.string().uuid().optional(),
  bidStoragePath: z.string().optional(),         // client-uploaded bid PDF path
  bidPdfBase64: z.string().optional(),           // legacy: base64-encoded bid PDF
  bidFileName: z.string().max(255).optional(),
  keepCurrentContract: z.boolean().optional(),   // re-analyze: use Storage PDF
  removeBid: z.boolean().optional(),             // re-analyze: clear bid
});

// 2C: Sanitize user-controlled filenames
function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._\- ]/g, '_').slice(0, 200) || 'contract.pdf';
}

const BETAS = ['files-api-2025-04-14'];
const MODEL = 'claude-sonnet-4-5-20250929';
const MAX_TOKENS_PER_PASS = 16384;
// Per-pass timeout: 180s for non-streaming (model must generate full response before returning).
// Global timeout (250s) is the safety net under Vercel's 300s maxDuration.
const PER_PASS_TIMEOUT_MS = 180_000;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE;
const MAX_BID_FILE_SIZE_BYTES = MAX_BID_FILE_SIZE;

// Passes that receive company profile for comparison instructions
const PASSES_RECEIVING_PROFILE = new Set([
  'risk-overview',
  'legal-insurance',
  'legal-retainage',
  'scope-extraction',
  'legal-payment-contingency',
  'legal-liquidated-damages',
]);

// ---------------------------------------------------------------------------
// JSON Schema conversion (Zod v3 compatible via zod-to-json-schema)
// ---------------------------------------------------------------------------

/**
 * Convert a Zod schema to the JSON Schema format expected by Anthropic's
 * structured output `output_config.format`. Strips the `$schema` key and
 * wraps in the `{ type: 'json_schema', schema }` envelope.
 */
function zodToOutputFormat(zodSchema: Parameters<typeof zodToJsonSchema>[0]) {
  const raw = zodToJsonSchema(zodSchema, {
    target: 'jsonSchema7',
    $refStrategy: 'none',
  });
  // Remove the $schema meta key -- Anthropic does not expect it
  const { $schema: _, ...schema } = raw as Record<string, unknown>;
  return {
    type: 'json_schema' as const,
    schema,
  };
}

// ---------------------------------------------------------------------------
// Run a single analysis pass (with usage capture and AbortSignal support)
// ---------------------------------------------------------------------------

async function runAnalysisPass(
  client: Anthropic,
  fileId: string,
  pass: AnalysisPass,
  companyProfile?: CompanyProfile,
  signal?: AbortSignal,
  bidFileId?: string | null
): Promise<PassWithUsage> {
  const startTime = Date.now();
  const passUsage: PassUsage = {
    inputTokens: 0,
    outputTokens: 0,
    cacheCreationTokens: 0,
    cacheReadTokens: 0,
  };

  const outputFormat = pass.schema
    ? zodToOutputFormat(pass.schema)
    : pass.isOverview
      ? zodToOutputFormat(RiskOverviewResultSchema)
      : zodToOutputFormat(PassResultSchema);

  // Compose system prompt: injects domain knowledge and company profile
  // (profile only for passes in PASSES_RECEIVING_PROFILE)
  const systemPrompt = composeSystemPrompt(
    pass.systemPrompt,
    pass.name,
    PASSES_RECEIVING_PROFILE.has(pass.name) ? companyProfile : undefined
  );

  // Use SDK's .stream() + finalMessage() for best of both worlds:
  // - Streaming keeps the HTTP connection alive (avoids timeout waiting for first byte)
  // - finalMessage() assembles the complete response (avoids manual SSE collection bugs)
  const stream = client.beta.messages.stream({
    model: MODEL,
    max_tokens: MAX_TOKENS_PER_PASS,
    betas: BETAS,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'file', file_id: fileId },
            cache_control: { type: 'ephemeral' },
          } as unknown as Anthropic.Beta.Messages.BetaContentBlockParam,
          // Bid document — only for bid-requiring passes
          ...(bidFileId ? [{
            type: 'document',
            source: { type: 'file', file_id: bidFileId },
          } as unknown as Anthropic.Beta.Messages.BetaContentBlockParam] : []),
          {
            type: 'text',
            text: pass.userPrompt,
          },
        ],
      },
    ],
    output_config: { format: outputFormat },
  });

  // If caller provides an abort signal, wire it to the stream
  if (signal) {
    signal.addEventListener('abort', () => stream.abort(), { once: true });
  }

  const message = await stream.finalMessage();

  // Extract usage from the assembled message
  const usage = message.usage;
  passUsage.inputTokens = usage?.input_tokens ?? 0;
  passUsage.outputTokens = usage?.output_tokens ?? 0;
  passUsage.cacheCreationTokens = (usage as Record<string, number>)?.cache_creation_input_tokens ?? 0;
  passUsage.cacheReadTokens = (usage as Record<string, number>)?.cache_read_input_tokens ?? 0;

  // Extract text from content blocks
  const responseText = message.content
    .filter((block): block is Anthropic.Beta.Messages.BetaTextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('');

  if (!responseText.trim()) {
    throw new Error(`Empty response from model for pass "${pass.name}"`);
  }

  if (message.stop_reason === 'max_tokens') {
    throw new Error(
      `Pass "${pass.name}" output truncated (hit max_tokens=${MAX_TOKENS_PER_PASS}). ` +
      `Got ${passUsage.outputTokens} output tokens.`
    );
  }

  const parsed = JSON.parse(responseText);
  if (!Array.isArray(parsed.findings)) parsed.findings = [];
  if (!Array.isArray(parsed.dates)) parsed.dates = [];
  return { passName: pass.name, result: parsed, usage: passUsage, durationMs: Date.now() - startTime };
}


// ---------------------------------------------------------------------------
// Run synthesis pass (with usage capture and AbortSignal support)
// ---------------------------------------------------------------------------

async function runSynthesisPass(
  client: Anthropic,
  findings: UnifiedFinding[],
  signal?: AbortSignal
): Promise<{ findings: UnifiedFinding[]; usage: PassUsage; durationMs: number }> {
  const startTime = Date.now();
  const passUsage: PassUsage = {
    inputTokens: 0,
    outputTokens: 0,
    cacheCreationTokens: 0,
    cacheReadTokens: 0,
  };

  try {
    // Not enough findings to detect compound risk patterns
    if (findings.length < 3) {
      log.info('[analyze] Synthesis pass skipped: fewer than 3 findings');
      return { findings: [], usage: passUsage, durationMs: Date.now() - startTime };
    }

    // Build compact summaries to stay within token limits
    const compactFindings = findings.map((f) => ({
      title: f.title,
      severity: f.severity,
      category: f.category,
      description: f.description,
    }));

    const outputFormat = zodToOutputFormat(SynthesisPassResultSchema);

    // Use SDK's .stream() + finalMessage() (same pattern as runAnalysisPass)
    const stream = client.beta.messages.stream({
      model: MODEL,
      max_tokens: 4096,
      betas: BETAS,
      system: SYNTHESIS_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: JSON.stringify(compactFindings),
            },
          ],
        },
      ],
      output_config: { format: outputFormat },
    });

    if (signal) {
      signal.addEventListener('abort', () => stream.abort(), { once: true });
    }

    const message = await stream.finalMessage();

    // Extract usage
    const usage = message.usage;
    passUsage.inputTokens = usage?.input_tokens ?? 0;
    passUsage.outputTokens = usage?.output_tokens ?? 0;
    passUsage.cacheCreationTokens = (usage as Record<string, number>)?.cache_creation_input_tokens ?? 0;
    passUsage.cacheReadTokens = (usage as Record<string, number>)?.cache_read_input_tokens ?? 0;

    // Extract text from content blocks
    const responseText = message.content
      .filter((block): block is Anthropic.Beta.Messages.BetaTextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    if (!responseText.trim()) {
      log.info('[analyze] Synthesis pass returned empty response');
      return { findings: [], usage: passUsage, durationMs: Date.now() - startTime };
    }

    const parsed = SynthesisPassResultSchema.parse(JSON.parse(responseText));

    // Convert synthesis findings to UnifiedFinding format
    const converted = parsed.findings.map((sf) => ({
      severity: 'High' as const,
      category: 'Compound Risk' as const,
      title: sf.title,
      description: sf.description,
      recommendation: sf.recommendation,
      clauseReference: 'N/A',
      sourcePass: 'synthesis',
      isSynthesis: true,
      crossReferences: sf.constituentFindings,
      actionPriority: sf.actionPriority,
    }));

    return { findings: converted as unknown as UnifiedFinding[], usage: passUsage, durationMs: Date.now() - startTime };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log.error(`[analyze] Synthesis pass failed (non-fatal): ${msg}`);
    return { findings: [], usage: passUsage, durationMs: Date.now() - startTime };
  }
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

// Validate all knowledge modules are registered at import time
validateAllModulesRegistered();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  const allowedOrigin =
    process.env.ALLOWED_ORIGIN || 'https://clearcontract.vercel.app';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // --- JWT Authentication ---
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const token = authHeader.slice(7);

  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const userId = user.id;

  // --- Rate limiting ---
  const rateCheck = await checkRateLimit(supabaseAdmin, userId);
  if (!rateCheck.allowed) {
    res.setHeader('Retry-After', String(rateCheck.retryAfterSeconds ?? 3600));
    return res.status(429).json({ error: 'Rate limit exceeded. Maximum 10 analyses per hour.' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res
      .status(500)
      .json({ error: 'Server configuration error: missing API key' });
  }

  let fileId: string | null = null;
  let bidFileId: string | null = null;
  let client: Anthropic | null = null;
  // dispatcher removed — undici Agent was silently truncating SSE streams
  let globalTimeout: ReturnType<typeof setTimeout> | null = null;

  try {
    const parseResult = AnalyzeRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: parseResult.error.flatten().fieldErrors,
      });
    }
    const { storagePath: clientStoragePath, pdfBase64, fileName: rawFileName, contractId: existingContractId, bidStoragePath: clientBidStoragePath, bidPdfBase64, bidFileName: rawBidFileName, keepCurrentContract, removeBid } = parseResult.data;

    // --- Read company profile from DB ---
    const { data: profileRow } = await supabaseAdmin
      .from('company_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    const companyProfile: CompanyProfile = profileRow
      ? { ...DEFAULT_COMPANY_PROFILE, ...mapRow<CompanyProfile>(profileRow) }
      : DEFAULT_COMPANY_PROFILE;
    const fileName = rawFileName ? sanitizeFileName(rawFileName) : 'contract.pdf';

    // Resolve contract PDF: storage path (preferred), base64 (legacy), or re-analyze keep-current
    let pdfBuffer: Buffer;
    if (keepCurrentContract && existingContractId) {
      const storedPdf = await downloadPdf(supabaseAdmin, userId, existingContractId, 'contract');
      if (!storedPdf) {
        return res.status(400).json({ error: 'No stored contract PDF found. Please upload a new PDF.' });
      }
      pdfBuffer = storedPdf;
    } else if (clientStoragePath) {
      // Client uploaded to Supabase Storage — download from temp path
      const { data, error: dlError } = await supabaseAdmin.storage
        .from('contract-pdfs')
        .download(clientStoragePath);
      if (dlError || !data) {
        return res.status(400).json({ error: 'Failed to retrieve uploaded PDF from storage.' });
      }
      pdfBuffer = Buffer.from(await data.arrayBuffer());
      if (pdfBuffer.length > MAX_FILE_SIZE_BYTES) {
        return res.status(400).json({
          error: `File too large. Maximum size is 10MB, received ${(pdfBuffer.length / (1024 * 1024)).toFixed(1)}MB.`,
        });
      }
    } else if (pdfBase64) {
      // Legacy base64 path (small files or backward compat)
      pdfBuffer = Buffer.from(pdfBase64, 'base64');
      if (pdfBuffer.length > MAX_FILE_SIZE_BYTES) {
        return res.status(400).json({
          error: `File too large. Maximum size is 10MB, received ${(pdfBuffer.length / (1024 * 1024)).toFixed(1)}MB.`,
        });
      }
    } else {
      return res.status(400).json({ error: 'No PDF provided. Send storagePath or pdfBase64.' });
    }

    // Resolve bid PDF (optional): storage path or base64
    let bidBuffer: Buffer | null = null;
    let bidFileName = rawBidFileName ? sanitizeFileName(rawBidFileName) : null;
    if (clientBidStoragePath) {
      const { data, error: dlError } = await supabaseAdmin.storage
        .from('contract-pdfs')
        .download(clientBidStoragePath);
      if (dlError || !data) {
        return res.status(400).json({ error: 'Failed to retrieve uploaded bid PDF from storage.' });
      }
      bidBuffer = Buffer.from(await data.arrayBuffer());
      if (bidBuffer.length > MAX_BID_FILE_SIZE_BYTES) {
        return res.status(400).json({
          error: `Bid file too large. Maximum size is 5MB, received ${(bidBuffer.length / (1024 * 1024)).toFixed(1)}MB.`,
        });
      }
      bidFileName = bidFileName || 'bid.pdf';
    } else if (bidPdfBase64) {
      bidBuffer = Buffer.from(bidPdfBase64, 'base64');
      if (bidBuffer.length > MAX_BID_FILE_SIZE_BYTES) {
        return res.status(400).json({
          error: `Bid file too large. Maximum size is 5MB, received ${(bidBuffer.length / (1024 * 1024)).toFixed(1)}MB.`,
        });
      }
      bidFileName = bidFileName || 'bid.pdf';
    }

    // Single Anthropic client using Node's built-in fetch for all calls.
    // Previously used a custom undici Agent to avoid HeadersTimeoutError,
    // but streaming (stream: true) sends headers immediately so that's
    // not needed — and undici was silently truncating SSE streams.
    const uploadClient = new Anthropic({
      apiKey,
      timeout: 60 * 1000,
      maxRetries: 0,
    });

    client = new Anthropic({
      apiKey,
      timeout: 280 * 1000, // 280s -- under Vercel maxDuration (300s), allows room for cleanup
      maxRetries: 0, // Don't retry inside serverless function -- wastes budget
    });

    // Upload PDF(s) to Files API (or fallback to text extraction)
    log.info(`[analyze] PDF size: ${(pdfBuffer.length / 1024).toFixed(1)}KB${bidBuffer ? `, bid: ${(bidBuffer.length / 1024).toFixed(1)}KB` : ''}, uploading...`);
    const uploadStart = Date.now();
    const [contractPrepared, bidPrepared] = await Promise.all([
      preparePdfForAnalysis(pdfBuffer, fileName || 'contract.pdf', uploadClient),
      bidBuffer
        ? preparePdfForAnalysis(bidBuffer, bidFileName || 'bid.pdf', uploadClient)
        : Promise.resolve(null),
    ]);
    fileId = contractPrepared.fileId;
    bidFileId = bidPrepared?.fileId ?? null;
    log.info(
      `[analyze] Upload complete in ${((Date.now() - uploadStart) / 1000).toFixed(1)}s, fileId: ${fileId}${bidFileId ? `, bidFileId: ${bidFileId}` : ''}, fallback: ${contractPrepared.usedFallback}`
    );

    // --- Two-stage cache pipeline ---
    const runId = randomUUID();
    const allControllers: AbortController[] = [];
    const usageRows: Array<{
      pass_name: string;
      input_tokens: number;
      output_tokens: number;
      cache_creation_tokens: number;
      cache_read_tokens: number;
      cost_usd: number;
      duration_ms: number;
    }> = [];
    let isGlobalTimeout = false;

    // Global safety timeout: 250s -- leaves ~50s for merge + DB writes before Vercel's 300s kill
    const globalController = new AbortController();
    globalTimeout = setTimeout(() => {
      isGlobalTimeout = true;
      log.info('[analyze] Global 250s timeout fired -- aborting in-flight passes');
      allControllers.forEach(c => c.abort());
      globalController.abort();
    }, 250_000);

    // --- STAGE 1: Primer pass (risk-overview) ---
    // Sent first and alone to create Anthropic prompt cache.
    const primerPass = ANALYSIS_PASSES.find(p => p.name === 'risk-overview')!;
    const stage2Passes = ANALYSIS_PASSES.filter(
      (p) => p.name !== 'risk-overview' && (p.stage ?? 2) === 2
    );
    const stage3Passes = ANALYSIS_PASSES.filter((p) => p.stage === 3);

    log.info('[analyze] Stage 1: Running primer pass (risk-overview)...');
    const primerController = new AbortController();
    allControllers.push(primerController);
    const primerTimeout = setTimeout(() => primerController.abort(), PER_PASS_TIMEOUT_MS);

    let primerResult: PassWithUsage;
    try {
      primerResult = await runAnalysisPass(
        client!, fileId!, primerPass, companyProfile, primerController.signal
      );
    } catch (primerError) {
      clearTimeout(primerTimeout);
      // If primer fails, abort entire analysis per locked decision
      const msg = primerError instanceof Error ? primerError.message : String(primerError);
      log.error(`[analyze] Primer pass failed -- aborting analysis: ${msg}`);
      // Preserve the original error so classifyError can read its `status`
      // (wrapping in new Error() loses Anthropic SDK error properties)
      throw primerError;
    } finally {
      clearTimeout(primerTimeout);
    }

    // Record primer usage
    usageRows.push({
      pass_name: primerResult.passName,
      input_tokens: primerResult.usage.inputTokens,
      output_tokens: primerResult.usage.outputTokens,
      cache_creation_tokens: primerResult.usage.cacheCreationTokens,
      cache_read_tokens: primerResult.usage.cacheReadTokens,
      cost_usd: computePassCost(primerResult.usage),
      duration_ms: primerResult.durationMs,
    });

    log.info(
      `[analyze] Primer done in ${(primerResult.durationMs / 1000).toFixed(1)}s, ` +
      `cache_creation=${primerResult.usage.cacheCreationTokens}, ` +
      `cache_read=${primerResult.usage.cacheReadTokens}`
    );

    // --- STAGE 2: Remaining 15 passes in parallel ---
    log.info(`[analyze] Stage 2: Running ${stage2Passes.length} passes in parallel...`);
    const passStart = Date.now();

    const settledResults = await Promise.allSettled(
      stage2Passes.map((pass) => {
        const ctrl = new AbortController();
        allControllers.push(ctrl);
        const timeout = setTimeout(() => {
          log.info(`[analyze] Pass "${pass.name}" timed out at 90s`);
          ctrl.abort();
        }, PER_PASS_TIMEOUT_MS);

        return runAnalysisPass(client!, fileId!, pass, companyProfile, ctrl.signal)
          .finally(() => clearTimeout(timeout));
      })
    );

    // Record usage for settled parallel passes
    for (const settled of settledResults) {
      if (settled.status === 'fulfilled') {
        const r = settled.value;
        usageRows.push({
          pass_name: r.passName,
          input_tokens: r.usage.inputTokens,
          output_tokens: r.usage.outputTokens,
          cache_creation_tokens: r.usage.cacheCreationTokens,
          cache_read_tokens: r.usage.cacheReadTokens,
          cost_usd: computePassCost(r.usage),
          duration_ms: r.durationMs,
        });
      }
    }

    // --- STAGE 3: Reconciliation wave (parallel, runs after Stage 2 settles) ---
    // Mirrors Stage 2 orchestration: Promise.allSettled + per-pass AbortController
    // + 90s setTimeout + finally(clearTimeout). Empty wave is special-cased.
    // Ship-what-we-have: Stage 3 STILL runs even when Stage 2 overruns its
    // 150s wall-clock budget (per CONTEXT.md Stage 3 failure/Partial policy).
    let stage3Settled: PromiseSettledResult<PassWithUsage>[] = [];
    const activeStage3Passes = stage3Passes.filter(
      (p) => !p.requiresBid || bidFileId
    );

    if (activeStage3Passes.length < stage3Passes.length) {
      const skipped = stage3Passes
        .filter((p) => p.requiresBid && !bidFileId)
        .map((p) => p.name);
      log.info(`[analyze] Stage 3: skipping bid-requiring passes (no bid PDF): ${skipped.join(', ')}`);
    }

    if (activeStage3Passes.length === 0) {
      log.info('[analyze] Stage 3: no passes registered, skipping');
    } else {
      const stage2Elapsed = Date.now() - passStart;
      if (stage2Elapsed > 150_000) {
        log.info(
          `[analyze] Stage 2 overrun: ${(stage2Elapsed / 1000).toFixed(1)}s — running Stage 3 on partial Stage 2 output`
        );
      }
      log.info(`[analyze] Stage 3: Running ${activeStage3Passes.length} reconciliation passes...`);
      const stage3Start = Date.now();

      stage3Settled = await Promise.allSettled(
        activeStage3Passes.map((pass) => {
          const ctrl = new AbortController();
          allControllers.push(ctrl);
          const timeout = setTimeout(() => {
            log.info(`[analyze] Stage 3 pass "${pass.name}" timed out at 90s`);
            ctrl.abort();
          }, PER_PASS_TIMEOUT_MS);

          return runAnalysisPass(client!, fileId!, pass, companyProfile, ctrl.signal, bidFileId)
            .finally(() => clearTimeout(timeout));
        })
      );

      // Record usage for fulfilled Stage 3 passes
      for (const settled of stage3Settled) {
        if (settled.status === 'fulfilled') {
          const r = settled.value;
          usageRows.push({
            pass_name: r.passName,
            input_tokens: r.usage.inputTokens,
            output_tokens: r.usage.outputTokens,
            cache_creation_tokens: r.usage.cacheCreationTokens,
            cache_read_tokens: r.usage.cacheReadTokens,
            cost_usd: computePassCost(r.usage),
            duration_ms: r.durationMs,
          });
        }
      }

      const stage3Failed = stage3Settled.filter((r) => r.status === 'rejected').length;
      log.info(
        `[analyze] Stage 3 done in ${((Date.now() - stage3Start) / 1000).toFixed(1)}s (${stage3Failed} failed/timed-out)`
      );
    }

    // Build the full settled results array for mergePassResults:
    // Primer is index 0, then Stage 2 passes, then Stage 3 passes in order
    const allSettled: PromiseSettledResult<{ passName: string; result: PassResult | RiskOverviewResult }>[] = [
      { status: 'fulfilled' as const, value: { passName: primerResult.passName, result: primerResult.result as PassResult | RiskOverviewResult } },
      ...settledResults.map(s =>
        s.status === 'fulfilled'
          ? { status: 'fulfilled' as const, value: { passName: s.value.passName, result: s.value.result as PassResult | RiskOverviewResult } }
          : s
      ),
      ...stage3Settled.map(s =>
        s.status === 'fulfilled'
          ? { status: 'fulfilled' as const, value: { passName: s.value.passName, result: s.value.result as PassResult | RiskOverviewResult } }
          : s
      ),
    ];

    // Filter out aborted passes before mergePassResults -- timed-out passes
    // are dropped silently (logged but no finding created for the user).
    // mergePassResults creates "Analysis Pass Failed" findings for rejected
    // promises, so we filter out abort errors to prevent those findings.
    // Build matching passes array (same order as allSettled: primer, stage2, stage3)
    const allPasses = [primerPass, ...stage2Passes, ...activeStage3Passes];

    const nonAbortSettled = allSettled.filter((s, i) => {
      if (s.status === 'rejected') {
        const reason = s.reason;
        const isAbort = reason instanceof Error && (reason.name === 'AbortError' || reason.message?.includes('abort'));
        if (isAbort) {
          const passName = allPasses[i]?.name ?? 'unknown';
          const stageLabel = i > stage2Passes.length ? 'Stage 3 ' : '';
          log.info(`[analyze] ${stageLabel}pass "${passName}" dropped (timed out)`);
          return false; // Filter out -- drop silently
        }
      }
      return true;
    });
    const nonAbortPasses = allPasses.filter((_, i) => {
      const s = allSettled[i];
      if (s.status === 'rejected') {
        const reason = s.reason;
        return !(reason instanceof Error && (reason.name === 'AbortError' || reason.message?.includes('abort')));
      }
      return true;
    });

    const failed = settledResults.filter(r => r.status === 'rejected').length;
    log.info(
      `[analyze] Stage 2 done in ${((Date.now() - passStart) / 1000).toFixed(1)}s (${failed} failed/timed-out)`
    );

    // --- MERGE ---
    const merged = mergePassResults(nonAbortSettled, nonAbortPasses);

    // --- SCHEDULE-CONFLICT COMPUTATION (deterministic, no LLM call) ---
    const conflictResult = computeScheduleConflicts(merged.submittals, merged.dates);
    if (conflictResult.findings.length > 0) {
      log.info(`[analyze] Schedule conflicts: ${conflictResult.findings.length} conflicts detected`);
      merged.findings.push(...conflictResult.findings);
    }

    // --- SYNTHESIS (skip on timeout path) ---
    let synthUsage: PassUsage = { inputTokens: 0, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0 };
    let synthDuration = 0;

    if (!isGlobalTimeout) {
      const synthController = new AbortController();
      allControllers.push(synthController);
      const synthTimeout = setTimeout(() => synthController.abort(), PER_PASS_TIMEOUT_MS);

      const synthResult = await runSynthesisPass(
        client!, merged.findings as unknown as UnifiedFinding[], synthController.signal
      );
      clearTimeout(synthTimeout);

      synthUsage = synthResult.usage;
      synthDuration = synthResult.durationMs;

      log.info(
        `[analyze] Synthesis pass done in ${(synthResult.durationMs / 1000).toFixed(1)}s, ${synthResult.findings.length} compound risks`
      );

      merged.findings.push(...synthResult.findings as unknown as typeof merged.findings[number][]);
    } else {
      log.info('[analyze] Synthesis pass skipped (global timeout path)');
    }

    // Record synthesis usage (even if skipped -- zeros)
    usageRows.push({
      pass_name: 'synthesis',
      input_tokens: synthUsage.inputTokens,
      output_tokens: synthUsage.outputTokens,
      cache_creation_tokens: synthUsage.cacheCreationTokens,
      cache_read_tokens: synthUsage.cacheReadTokens,
      cost_usd: computePassCost(synthUsage),
      duration_ms: synthDuration,
    });

    // --- DB WRITES ---
    const contractStatus = isGlobalTimeout ? 'Partial' : 'Reviewed';

    const allFindings = [...merged.findings];

    // Compute bid/no-bid signal from findings
    const bidSignal = computeBidSignal(
      allFindings as unknown as import('../src/types/contract').Finding[]
    );

    // --- Write results to Supabase ---
    // Build contract payload
    const contractPayload = mapToSnake({
      userId,
      name: rawFileName ? sanitizeFileName(rawFileName).replace(/\.pdf$/i, '') : 'contract',
      client: merged.client,
      type: merged.contractType,
      uploadDate: new Date().toISOString().split('T')[0],
      status: contractStatus,
      riskScore: merged.riskScore,
      scoreBreakdown: merged.scoreBreakdown,
      bidSignal,
      passResults: merged.passResults,
      submittals: merged.submittals,
      ...(removeBid ? { bidFileName: null } : bidFileName ? { bidFileName } : {}),
    });
    // Remove meta columns that Postgres auto-generates
    delete contractPayload.id;
    delete contractPayload.created_at;
    delete contractPayload.updated_at;

    let contractRow: Record<string, unknown>;

    if (existingContractId) {
      // Re-analyze: update existing contract row
      const { data, error: updateError } = await supabaseAdmin
        .from('contracts')
        .update(contractPayload)
        .eq('id', existingContractId)
        .eq('user_id', userId)
        .select()
        .single();
      if (updateError || !data) throw new Error(`Failed to update contract: ${updateError?.message || 'not found'}`);
      contractRow = data as Record<string, unknown>;

      // Delete old findings, dates, and usage rows for this contract (new ones inserted below)
      await supabaseAdmin.from('findings').delete().eq('contract_id', existingContractId);
      await supabaseAdmin.from('contract_dates').delete().eq('contract_id', existingContractId);
      await supabaseAdmin.from('analysis_usage').delete().eq('contract_id', existingContractId);
    } else {
      // New analysis: insert contract row
      const { data, error: insertError } = await supabaseAdmin
        .from('contracts')
        .insert(contractPayload)
        .select()
        .single();
      if (insertError || !data) throw new Error(`Failed to save contract: ${insertError?.message}`);
      contractRow = data as Record<string, unknown>;
    }

    const contractId = contractRow.id as string;

    // Persist PDFs to permanent storage path
    // If client uploaded to temp path, move to permanent. Otherwise re-upload from buffer.
    const storagePromises: Promise<void>[] = [];
    if (!keepCurrentContract) {
      if (clientStoragePath) {
        // Move: copy to permanent path, then delete temp
        storagePromises.push(
          supabaseAdmin.storage.from('contract-pdfs')
            .copy(clientStoragePath, `${userId}/${contractId}/contract.pdf`)
            .then(({ error }) => {
              if (error) log.error(`[storage] Copy failed: ${error.message}`);
              // Clean up temp file (best-effort)
              supabaseAdmin.storage.from('contract-pdfs').remove([clientStoragePath]);
            })
        );
      } else {
        storagePromises.push(uploadPdf(supabaseAdmin, userId, contractId, 'contract', pdfBuffer));
      }
    }
    if (bidBuffer) {
      if (clientBidStoragePath) {
        storagePromises.push(
          supabaseAdmin.storage.from('contract-pdfs')
            .copy(clientBidStoragePath, `${userId}/${contractId}/bid.pdf`)
            .then(({ error }) => {
              if (error) log.error(`[storage] Bid copy failed: ${error.message}`);
              supabaseAdmin.storage.from('contract-pdfs').remove([clientBidStoragePath]);
            })
        );
      } else {
        storagePromises.push(uploadPdf(supabaseAdmin, userId, contractId, 'bid', bidBuffer));
      }
    }
    if (storagePromises.length > 0) {
      await Promise.all(storagePromises);
    }

    // Bulk insert findings
    const findingPayloads = allFindings.map((f) => {
      const payload = mapToSnake({
        contractId,
        userId,
        severity: f.severity,
        category: f.category,
        title: f.title,
        description: f.description,
        recommendation: f.recommendation,
        clauseReference: f.clauseReference || 'N/A',
        negotiationPosition: f.negotiationPosition || '',
        actionPriority: f.actionPriority || 'monitor',
        resolved: false,
        note: '',
        clauseText: f.clauseText,
        explanation: f.explanation,
        crossReferences: f.crossReferences,
        legalMeta: f.legalMeta,
        scopeMeta: f.scopeMeta,
        sourcePass: f.sourcePass,
        downgradedFrom: f.downgradedFrom,
        isSynthesis: f.isSynthesis,
      });
      delete payload.id;
      delete payload.created_at;
      delete payload.updated_at;
      return payload;
    });

    const { data: findingRows, error: findingsError } = await supabaseAdmin
      .from('findings')
      .insert(findingPayloads)
      .select();

    if (findingsError) {
      log.error(`[analyze] Findings insert failed: ${findingsError.message}`);
    }

    // Bulk insert dates
    const datePayloads = merged.dates.map((d) => {
      const payload = mapToSnake({
        contractId,
        userId,
        label: d.label,
        date: d.date,
        type: d.type,
      });
      delete payload.id;
      delete payload.created_at;
      return payload;
    });

    let dateRows: Record<string, unknown>[] | null = null;
    if (datePayloads.length > 0) {
      const { data, error: datesError } = await supabaseAdmin
        .from('contract_dates')
        .insert(datePayloads)
        .select();

      if (datesError) {
        log.error(`[analyze] Dates insert failed: ${datesError.message}`);
      }
      dateRows = data;
    }

    // Bulk insert analysis_usage rows
    if (usageRows.length > 0) {
      const usagePayloads = usageRows.map(row => ({
        contract_id: contractId,
        user_id: userId,
        run_id: runId,
        ...row,
      }));

      const { error: usageError } = await supabaseAdmin
        .from('analysis_usage')
        .insert(usagePayloads);

      if (usageError) {
        log.error(`[analyze] Usage insert failed: ${usageError.message}`);
      } else {
        const totalCost = usageRows.reduce((sum, r) => sum + r.cost_usd, 0);
        log.info(`[analyze] Usage saved: ${usageRows.length} rows, total cost $${totalCost.toFixed(4)}`);
      }
    }

    // Return full Contract object with DB-assigned IDs
    const contract = {
      ...mapRow<Record<string, unknown>>(contractRow),
      findings: findingRows ? mapRows(findingRows) : [],
      dates: dateRows ? mapRows(dateRows) : [],
    };

    return res.status(200).json(contract);
  } catch (error: unknown) {
    const classified = classifyError(error);
    // Log the full original error message for debugging (not just the classified user message)
    const rawMessage = error instanceof Error ? error.message : String(error);
    log.error(`Analysis error [${classified.type}]: ${rawMessage}`);
    const statusCode = classified.type === 'timeout' ? 504
      : classified.type === 'api' && (error as { status?: number }).status === 429 ? 429
      : classified.type === 'api' && (error as { status?: number }).status === 401 ? 500
      : 500;
    return res.status(statusCode).json(formatApiError(classified, rawMessage));
  } finally {
    // Clear global timeout to prevent it firing during cleanup
    if (globalTimeout) {
      clearTimeout(globalTimeout);
    }
    // Clean up: delete uploaded files from Files API (best-effort)
    if (client) {
      const cleanupIds = [fileId, bidFileId].filter(Boolean) as string[];
      for (const id of cleanupIds) {
        try {
          await client.beta.files.delete(id, { betas: BETAS });
        } catch (cleanupError) {
          log.error(
            'File cleanup failed (non-critical):',
            cleanupError instanceof Error ? cleanupError.message : cleanupError
          );
        }
      }
    }
    // undici dispatcher cleanup removed — no longer using custom fetch
  }
}
