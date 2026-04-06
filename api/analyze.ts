import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { DEFAULT_COMPANY_PROFILE } from '../src/knowledge/types';
import { mapToSnake, mapRow, mapRows } from '../src/lib/mappers';

// 2A: Allow larger base64-encoded PDFs through Vercel body parser
export const config = { api: { bodyParser: { sizeLimit: '25mb' } } };
import Anthropic from '@anthropic-ai/sdk';
import { zodToJsonSchema } from 'zod-to-json-schema';
import {
  PassResultSchema,
  RiskOverviewResultSchema,
} from '../src/schemas/analysis';
import type {
  PassResult,
  RiskOverviewResult,
} from '../src/schemas/analysis';
import type { CompanyProfile } from '../src/knowledge/types';
import { composeSystemPrompt } from '../src/knowledge/index';
import { validateAllModulesRegistered } from '../src/knowledge/registry';
import { computeBidSignal } from '../src/utils/bidSignal';
import { classifyError, formatApiError } from '../src/utils/errors';
import '../src/knowledge/regulatory/index';
import '../src/knowledge/trade/index';
import '../src/knowledge/standards/index';
import { fetch as undiciFetch, Agent } from 'undici';
import { preparePdfForAnalysis } from './pdf';
import { mergePassResults } from './merge';
import type { UnifiedFinding } from './merge';
import { computeScheduleConflicts } from './conflicts';
import { SynthesisPassResultSchema } from '../src/schemas/synthesisAnalysis';
import { ANALYSIS_PASSES, SYNTHESIS_SYSTEM_PROMPT } from './passes';
import type { AnalysisPass } from './passes';
import type { PassUsage, PassWithUsage } from './types';
import { computePassCost } from './cost';
import { uploadPdf, downloadPdf } from '../src/lib/supabaseStorage';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// 2B+: Zod schema for full request body validation
const AnalyzeRequestSchema = z.object({
  pdfBase64: z.string().min(1, 'pdfBase64 is required'),
  fileName: z.string().max(255).optional(),
  contractId: z.string().uuid().optional(),
  bidPdfBase64: z.string().optional(),
  bidFileName: z.string().max(255).optional(),
  keepCurrentContract: z.boolean().optional(),  // re-analyze: use Storage PDF
  removeBid: z.boolean().optional(),             // re-analyze: clear bid
});

// 2C: Sanitize user-controlled filenames
function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._\- ]/g, '_').slice(0, 200) || 'contract.pdf';
}

const BETAS = ['files-api-2025-04-14'];
const MODEL = 'claude-sonnet-4-5-20250929';
const MAX_TOKENS_PER_PASS = 8192;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_BID_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB (bid PDFs are typically small)

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
  signal?: AbortSignal
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

  // Use streaming to avoid HeadersTimeoutError -- headers are sent immediately
  // via SSE, keeping the connection alive while Claude processes the document.
  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS_PER_PASS,
    betas: BETAS,
    stream: true,
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
          {
            type: 'text',
            text: pass.userPrompt,
          },
        ],
      },
    ],
    output_config: { format: outputFormat },
  }, signal ? { signal } : {});

  // Collect streamed text chunks and capture usage from streaming events
  let responseText = '';
  for await (const event of response) {
    if (event.type === 'message_start') {
      const usage = (event as { message?: { usage?: { input_tokens?: number; cache_creation_input_tokens?: number | null; cache_read_input_tokens?: number | null } } }).message?.usage;
      if (usage) {
        passUsage.inputTokens = usage.input_tokens ?? 0;
        passUsage.cacheCreationTokens = usage.cache_creation_input_tokens ?? 0;
        passUsage.cacheReadTokens = usage.cache_read_input_tokens ?? 0;
      }
    }
    if (event.type === 'message_delta') {
      const deltaUsage = (event as { usage?: { output_tokens?: number } }).usage;
      if (deltaUsage) {
        passUsage.outputTokens = deltaUsage.output_tokens ?? 0;
      }
    }
    if (
      event.type === 'content_block_delta' &&
      event.delta.type === 'text_delta'
    ) {
      responseText += event.delta.text;
    }
  }

  if (!responseText.trim()) {
    throw new Error(`Empty response from model for pass "${pass.name}"`);
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
      console.log('[analyze] Synthesis pass skipped: fewer than 3 findings');
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

    // Use streaming to avoid HeadersTimeoutError (same pattern as runAnalysisPass)
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 4096,
      betas: BETAS,
      stream: true,
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
    }, signal ? { signal } : {});

    // Collect streamed text chunks and capture usage from streaming events
    let responseText = '';
    for await (const event of response) {
      if (event.type === 'message_start') {
        const usage = (event as { message?: { usage?: { input_tokens?: number; cache_creation_input_tokens?: number | null; cache_read_input_tokens?: number | null } } }).message?.usage;
        if (usage) {
          passUsage.inputTokens = usage.input_tokens ?? 0;
          passUsage.cacheCreationTokens = usage.cache_creation_input_tokens ?? 0;
          passUsage.cacheReadTokens = usage.cache_read_input_tokens ?? 0;
        }
      }
      if (event.type === 'message_delta') {
        const deltaUsage = (event as { usage?: { output_tokens?: number } }).usage;
        if (deltaUsage) {
          passUsage.outputTokens = deltaUsage.output_tokens ?? 0;
        }
      }
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        responseText += event.delta.text;
      }
    }

    if (!responseText.trim()) {
      console.log('[analyze] Synthesis pass returned empty response');
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
    console.error(`[analyze] Synthesis pass failed (non-fatal): ${msg}`);
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

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res
      .status(500)
      .json({ error: 'Server configuration error: missing API key' });
  }

  let fileId: string | null = null;
  let bidFileId: string | null = null;
  let client: Anthropic | null = null;
  let dispatcher: Agent | null = null;
  let globalTimeout: ReturnType<typeof setTimeout> | null = null;

  try {
    const parseResult = AnalyzeRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: parseResult.error.flatten().fieldErrors,
      });
    }
    const { pdfBase64, fileName: rawFileName, contractId: existingContractId, bidPdfBase64, bidFileName: rawBidFileName, keepCurrentContract, removeBid } = parseResult.data;

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

    // Resolve contract PDF: either from request body or Supabase Storage (re-analyze keep-current)
    let pdfBuffer: Buffer;
    if (keepCurrentContract && existingContractId) {
      const storedPdf = await downloadPdf(supabaseAdmin, userId, existingContractId, 'contract');
      if (!storedPdf) {
        return res.status(400).json({ error: 'No stored contract PDF found. Please upload a new PDF.' });
      }
      pdfBuffer = storedPdf;
    } else {
      pdfBuffer = Buffer.from(pdfBase64, 'base64');
      if (pdfBuffer.length > MAX_FILE_SIZE_BYTES) {
        return res.status(400).json({
          error: `File too large. Maximum size is 10MB, received ${(pdfBuffer.length / (1024 * 1024)).toFixed(1)}MB.`,
        });
      }
    }

    // Decode and validate bid PDF (optional)
    let bidBuffer: Buffer | null = null;
    let bidFileName = rawBidFileName ? sanitizeFileName(rawBidFileName) : null;
    if (bidPdfBase64) {
      bidBuffer = Buffer.from(bidPdfBase64, 'base64');
      if (bidBuffer.length > MAX_BID_FILE_SIZE_BYTES) {
        return res.status(400).json({
          error: `Bid file too large. Maximum size is 5MB, received ${(bidBuffer.length / (1024 * 1024)).toFixed(1)}MB.`,
        });
      }
      bidFileName = bidFileName || 'bid.pdf';
    }

    // Use npm undici's fetch for message API calls to control timeouts.
    // Node's built-in fetch uses an internal bundled undici whose headersTimeout
    // cannot be configured via the npm undici Agent (different module instances).
    // However, undici's fetch doesn't support FormData file uploads, so we use
    // a separate client with the default fetch for file uploads.
    dispatcher = new Agent({
      headersTimeout: 0, // disabled -- let SDK AbortController handle timeout
      bodyTimeout: 0, // disabled -- streaming responses can be long
      connectTimeout: 30_000, // 30s to establish TCP connection
      connections: 20, // pool size -- peak concurrency is 16 parallel API calls
    });
    const customFetch: typeof globalThis.fetch = (input, init) =>
      undiciFetch(
        input as Parameters<typeof undiciFetch>[0],
        {
          ...init,
          dispatcher,
        } as Parameters<typeof undiciFetch>[1]
      ) as Promise<Response>;

    // Upload client uses default fetch (supports FormData for file uploads)
    const uploadClient = new Anthropic({
      apiKey,
      timeout: 60 * 1000,
      maxRetries: 0,
    });

    // Message client uses custom undici fetch (configurable timeouts)
    // 280s SDK timeout kept as last-resort safety net -- per-pass AbortControllers
    // at 90s and global 250s timeout handle all normal timeout scenarios
    client = new Anthropic({
      apiKey,
      timeout: 280 * 1000, // 280s -- under Vercel maxDuration (300s), allows room for cleanup
      maxRetries: 0, // Don't retry inside serverless function -- wastes budget
      fetch: customFetch,
    });

    // Upload PDF(s) to Files API (or fallback to text extraction)
    console.log(`[analyze] PDF size: ${(pdfBuffer.length / 1024).toFixed(1)}KB${bidBuffer ? `, bid: ${(bidBuffer.length / 1024).toFixed(1)}KB` : ''}, uploading...`);
    const uploadStart = Date.now();
    const [contractPrepared, bidPrepared] = await Promise.all([
      preparePdfForAnalysis(pdfBuffer, fileName || 'contract.pdf', uploadClient),
      bidBuffer
        ? preparePdfForAnalysis(bidBuffer, bidFileName || 'bid.pdf', uploadClient)
        : Promise.resolve(null),
    ]);
    fileId = contractPrepared.fileId;
    bidFileId = bidPrepared?.fileId ?? null;
    console.log(
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
      console.log('[analyze] Global 250s timeout fired -- aborting in-flight passes');
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

    console.log('[analyze] Stage 1: Running primer pass (risk-overview)...');
    const primerController = new AbortController();
    allControllers.push(primerController);
    const primerTimeout = setTimeout(() => primerController.abort(), 90_000);

    let primerResult: PassWithUsage;
    try {
      primerResult = await runAnalysisPass(
        client!, fileId!, primerPass, companyProfile, primerController.signal
      );
    } catch (primerError) {
      clearTimeout(primerTimeout);
      // If primer fails, abort entire analysis per locked decision
      const msg = primerError instanceof Error ? primerError.message : String(primerError);
      console.error(`[analyze] Primer pass failed -- aborting analysis: ${msg}`);
      throw new Error(`Analysis aborted: primer pass failed (${msg})`);
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

    console.log(
      `[analyze] Primer done in ${(primerResult.durationMs / 1000).toFixed(1)}s, ` +
      `cache_creation=${primerResult.usage.cacheCreationTokens}, ` +
      `cache_read=${primerResult.usage.cacheReadTokens}`
    );

    // --- STAGE 2: Remaining 15 passes in parallel ---
    console.log(`[analyze] Stage 2: Running ${stage2Passes.length} passes in parallel...`);
    const passStart = Date.now();

    const settledResults = await Promise.allSettled(
      stage2Passes.map((pass) => {
        const ctrl = new AbortController();
        allControllers.push(ctrl);
        const timeout = setTimeout(() => {
          console.log(`[analyze] Pass "${pass.name}" timed out at 90s`);
          ctrl.abort();
        }, 90_000);

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
    if (stage3Passes.length === 0) {
      console.log('[analyze] Stage 3: no passes registered, skipping');
    } else {
      const stage2Elapsed = Date.now() - passStart;
      if (stage2Elapsed > 150_000) {
        console.log(
          `[analyze] Stage 2 overrun: ${(stage2Elapsed / 1000).toFixed(1)}s — running Stage 3 on partial Stage 2 output`
        );
      }
      console.log(`[analyze] Stage 3: Running ${stage3Passes.length} reconciliation passes...`);
      const stage3Start = Date.now();

      stage3Settled = await Promise.allSettled(
        stage3Passes.map((pass) => {
          const ctrl = new AbortController();
          allControllers.push(ctrl);
          const timeout = setTimeout(() => {
            console.log(`[analyze] Stage 3 pass "${pass.name}" timed out at 90s`);
            ctrl.abort();
          }, 90_000);

          return runAnalysisPass(client!, fileId!, pass, companyProfile, ctrl.signal)
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
      console.log(
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
    const allPasses = [primerPass, ...stage2Passes, ...stage3Passes];

    const nonAbortSettled = allSettled.filter((s, i) => {
      if (s.status === 'rejected') {
        const reason = s.reason;
        const isAbort = reason instanceof Error && (reason.name === 'AbortError' || reason.message?.includes('abort'));
        if (isAbort) {
          const passName = allPasses[i]?.name ?? 'unknown';
          const stageLabel = i > stage2Passes.length ? 'Stage 3 ' : '';
          console.log(`[analyze] ${stageLabel}pass "${passName}" dropped (timed out)`);
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
    console.log(
      `[analyze] Stage 2 done in ${((Date.now() - passStart) / 1000).toFixed(1)}s (${failed} failed/timed-out)`
    );

    // --- MERGE ---
    const merged = mergePassResults(nonAbortSettled, nonAbortPasses);

    // --- SCHEDULE-CONFLICT COMPUTATION (deterministic, no LLM call) ---
    const conflictResult = computeScheduleConflicts(merged.submittals, merged.dates);
    if (conflictResult.findings.length > 0) {
      console.log(`[analyze] Schedule conflicts: ${conflictResult.findings.length} conflicts detected`);
      merged.findings.push(...conflictResult.findings);
    }

    // --- SYNTHESIS (skip on timeout path) ---
    let synthUsage: PassUsage = { inputTokens: 0, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0 };
    let synthDuration = 0;

    if (!isGlobalTimeout) {
      const synthController = new AbortController();
      allControllers.push(synthController);
      const synthTimeout = setTimeout(() => synthController.abort(), 90_000);

      const synthResult = await runSynthesisPass(
        client!, merged.findings as unknown as UnifiedFinding[], synthController.signal
      );
      clearTimeout(synthTimeout);

      synthUsage = synthResult.usage;
      synthDuration = synthResult.durationMs;

      console.log(
        `[analyze] Synthesis pass done in ${(synthResult.durationMs / 1000).toFixed(1)}s, ${synthResult.findings.length} compound risks`
      );

      merged.findings.push(...synthResult.findings as unknown as typeof merged.findings[number][]);
    } else {
      console.log('[analyze] Synthesis pass skipped (global timeout path)');
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

    // Persist PDFs to Supabase Storage (non-blocking, best-effort)
    const storagePromises: Promise<void>[] = [];
    if (!keepCurrentContract) {
      storagePromises.push(uploadPdf(supabaseAdmin, userId, contractId, 'contract', pdfBuffer));
    }
    if (bidBuffer) {
      storagePromises.push(uploadPdf(supabaseAdmin, userId, contractId, 'bid', bidBuffer));
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
      console.error(`[analyze] Findings insert failed: ${findingsError.message}`);
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
        console.error(`[analyze] Dates insert failed: ${datesError.message}`);
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
        console.error(`[analyze] Usage insert failed: ${usageError.message}`);
      } else {
        const totalCost = usageRows.reduce((sum, r) => sum + r.cost_usd, 0);
        console.log(`[analyze] Usage saved: ${usageRows.length} rows, total cost $${totalCost.toFixed(4)}`);
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
    console.error('Analysis error:', classified.userMessage);
    const statusCode = classified.type === 'timeout' ? 504
      : classified.type === 'api' && (error as { status?: number }).status === 429 ? 429
      : classified.type === 'api' && (error as { status?: number }).status === 401 ? 500
      : 500;
    return res.status(statusCode).json(formatApiError(classified));
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
          console.error(
            'File cleanup failed (non-critical):',
            cleanupError instanceof Error ? cleanupError.message : cleanupError
          );
        }
      }
    }
    // Close the undici Agent to drain its connection pool (prevents socket leaks on warm starts)
    if (dispatcher) {
      dispatcher.close();
    }
  }
}
