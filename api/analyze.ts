import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';

// 2A: Allow larger base64-encoded PDFs through Vercel body parser
export const config = { api: { bodyParser: { sizeLimit: '15mb' } } };
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
import type { AnalysisPassInfo, UnifiedFinding } from './merge';
import { SynthesisPassResultSchema } from '../src/schemas/synthesisAnalysis';
import { ANALYSIS_PASSES, SYNTHESIS_SYSTEM_PROMPT } from './passes';
import type { AnalysisPass } from './passes';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// 2B: Zod schema for server-side validation of companyProfile
const CompanyProfileSchema = z.object({
  glPerOccurrence: z.string().max(50),
  glAggregate: z.string().max(50),
  umbrellaLimit: z.string().max(50),
  autoLimit: z.string().max(50),
  wcStatutoryState: z.string().max(50),
  wcEmployerLiability: z.string().max(50),
  bondingSingleProject: z.string().max(50),
  bondingAggregate: z.string().max(50),
  contractorLicenseType: z.string().max(50),
  contractorLicenseNumber: z.string().max(50),
  contractorLicenseExpiry: z.string().max(50),
  dirRegistration: z.string().max(50),
  dirExpiry: z.string().max(50),
  sbeCertId: z.string().max(50),
  sbeCertIssuer: z.string().max(50),
  lausdVendorNumber: z.string().max(50),
  employeeCount: z.string().max(50),
  serviceArea: z.string().max(100),
  typicalProjectSizeMin: z.string().max(50),
  typicalProjectSizeMax: z.string().max(50),
}).partial();

// 2B+: Zod schema for full request body validation
const AnalyzeRequestSchema = z.object({
  pdfBase64: z.string().min(1, 'pdfBase64 is required'),
  fileName: z.string().max(255).optional(),
  companyProfile: CompanyProfileSchema.optional(),
});
type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;

// 2C: Sanitize user-controlled filenames
function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._\- ]/g, '_').slice(0, 200) || 'contract.pdf';
}

const BETAS = ['files-api-2025-04-14'];
const MODEL = 'claude-sonnet-4-5-20250929';
const MAX_TOKENS_PER_PASS = 8192;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

// Passes that receive company profile for comparison instructions
const PASSES_RECEIVING_PROFILE = new Set([
  'risk-overview',
  'legal-insurance',
  'legal-retainage',
  'scope-of-work',
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
  // Remove the $schema meta key — Anthropic does not expect it
  const { $schema: _, ...schema } = raw as Record<string, unknown>;
  return {
    type: 'json_schema' as const,
    schema,
  };
}

// ---------------------------------------------------------------------------
// Run a single analysis pass
// ---------------------------------------------------------------------------

async function runAnalysisPass(
  client: Anthropic,
  fileId: string,
  pass: AnalysisPass,
  companyProfile?: CompanyProfile
): Promise<{ passName: string; result: PassResult | RiskOverviewResult }> {
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

  // Use streaming to avoid HeadersTimeoutError — headers are sent immediately
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
  });

  // Collect streamed text chunks into complete response
  let responseText = '';
  for await (const event of response) {
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
  return { passName: pass.name, result: parsed };
}






async function runSynthesisPass(
  client: Anthropic,
  findings: UnifiedFinding[]
): Promise<UnifiedFinding[]> {
  try {
    // Not enough findings to detect compound risk patterns
    if (findings.length < 3) {
      console.log('[analyze] Synthesis pass skipped: fewer than 3 findings');
      return [];
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
    });

    // Collect streamed text chunks into complete response
    let responseText = '';
    for await (const event of response) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        responseText += event.delta.text;
      }
    }

    if (!responseText.trim()) {
      console.log('[analyze] Synthesis pass returned empty response');
      return [];
    }

    const parsed = SynthesisPassResultSchema.parse(JSON.parse(responseText));

    // Convert synthesis findings to UnifiedFinding format
    return parsed.findings.map((sf) => ({
      severity: 'High',
      category: 'Compound Risk',
      title: sf.title,
      description: sf.description,
      recommendation: sf.recommendation,
      clauseReference: 'N/A',
      sourcePass: 'synthesis',
      isSynthesis: true,
      crossReferences: sf.constituentFindings,
      actionPriority: sf.actionPriority,
    }));
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[analyze] Synthesis pass failed (non-fatal): ${msg}`);
    return [];
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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res
      .status(500)
      .json({ error: 'Server configuration error: missing API key' });
  }

  let fileId: string | null = null;
  let client: Anthropic | null = null;
  let dispatcher: Agent | null = null;

  try {
    const parseResult = AnalyzeRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: parseResult.error.flatten().fieldErrors,
      });
    }
    const { pdfBase64, fileName: rawFileName, companyProfile } = parseResult.data;
    const fileName = rawFileName ? sanitizeFileName(rawFileName) : 'contract.pdf';

    // Decode and validate size
    const pdfBuffer = Buffer.from(pdfBase64, 'base64');
    if (pdfBuffer.length > MAX_FILE_SIZE_BYTES) {
      return res.status(400).json({
        error: `File too large. Maximum size is 10MB, received ${(pdfBuffer.length / (1024 * 1024)).toFixed(1)}MB.`,
      });
    }

    // Use npm undici's fetch for message API calls to control timeouts.
    // Node's built-in fetch uses an internal bundled undici whose headersTimeout
    // cannot be configured via the npm undici Agent (different module instances).
    // However, undici's fetch doesn't support FormData file uploads, so we use
    // a separate client with the default fetch for file uploads.
    dispatcher = new Agent({
      headersTimeout: 0, // disabled — let SDK AbortController handle timeout
      bodyTimeout: 0, // disabled — streaming responses can be long
      connectTimeout: 30_000, // 30s to establish TCP connection
      connections: 20, // pool size — peak concurrency is 16 parallel API calls
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
    client = new Anthropic({
      apiKey,
      timeout: 280 * 1000, // 280s — under Vercel maxDuration (300s), allows room for cleanup
      maxRetries: 0, // Don't retry inside serverless function — wastes budget
      fetch: customFetch,
    });

    // Upload PDF to Files API (or fallback to text extraction)
    console.log(
      `[analyze] PDF size: ${(pdfBuffer.length / 1024).toFixed(1)}KB, uploading...`
    );
    const uploadStart = Date.now();
    const prepared = await preparePdfForAnalysis(
      pdfBuffer,
      fileName || 'contract.pdf',
      uploadClient
    );
    fileId = prepared.fileId;
    console.log(
      `[analyze] Upload complete in ${((Date.now() - uploadStart) / 1000).toFixed(1)}s, fileId: ${fileId}, fallback: ${prepared.usedFallback}`
    );

    // Execute all analysis passes in parallel (production allows 300s via
    // vercel.json maxDuration; vercel dev defaults to 120s).
    console.log(
      `[analyze] Running all ${ANALYSIS_PASSES.length} passes in parallel...`
    );
    const passStart = Date.now();
    const settledResults = await Promise.allSettled(
      ANALYSIS_PASSES.map((pass) =>
        runAnalysisPass(client!, fileId!, pass, companyProfile)
      )
    );
    const failed = settledResults.filter((r) => r.status === 'rejected').length;
    console.log(
      `[analyze] All passes done in ${((Date.now() - passStart) / 1000).toFixed(1)}s (${failed} failed)`
    );

    // Merge results from all passes
    const merged = mergePassResults(settledResults, ANALYSIS_PASSES);

    // Run synthesis pass with deduplicated findings (17th pass)
    const synthStart = Date.now();
    const synthFindings = await runSynthesisPass(client!, merged.findings as unknown as UnifiedFinding[]);
    console.log(`[analyze] Synthesis pass done in ${((Date.now() - synthStart) / 1000).toFixed(1)}s, ${synthFindings.length} compound risks`);

    // Append synthesis findings (excluded from score via Compound Risk category weight 0,
    // and appended after mergePassResults which already computed the risk score)
    merged.findings.push(...synthFindings as unknown as typeof merged.findings[number][]);

    // Assign unique IDs to all findings (use crypto.randomUUID to avoid collisions)
    const findingsWithIds = merged.findings.map((f) => ({
      id: `f-${crypto.randomUUID()}`,
      ...f,
    }));

    // Compute bid/no-bid signal from findings
    const bidSignal = computeBidSignal(
      findingsWithIds as unknown as import('../src/types/contract').Finding[]
    );

    return res.status(200).json({
      client: merged.client,
      contractType: merged.contractType,
      riskScore: merged.riskScore,
      scoreBreakdown: merged.scoreBreakdown,
      bidSignal,
      findings: findingsWithIds,
      dates: merged.dates,
      passResults: merged.passResults,
    });
  } catch (error: unknown) {
    const classified = classifyError(error);
    console.error('Analysis error:', classified.userMessage);
    const statusCode = classified.type === 'timeout' ? 504
      : classified.type === 'api' && (error as { status?: number }).status === 429 ? 429
      : classified.type === 'api' && (error as { status?: number }).status === 401 ? 500
      : 500;
    return res.status(statusCode).json(formatApiError(classified));
  } finally {
    // Clean up: delete the uploaded file from Files API (best-effort)
    if (client && fileId) {
      try {
        await client.beta.files.delete(fileId, { betas: BETAS });
      } catch (cleanupError) {
        console.error(
          'File cleanup failed (non-critical):',
          cleanupError instanceof Error ? cleanupError.message : cleanupError
        );
      }
    }
    // Close the undici Agent to drain its connection pool (prevents socket leaks on warm starts)
    if (dispatcher) {
      dispatcher.close();
    }
  }
}
