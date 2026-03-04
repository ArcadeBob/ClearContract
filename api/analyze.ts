import type { VercelRequest, VercelResponse } from '@vercel/node';
import Anthropic from '@anthropic-ai/sdk';
import { toFile } from '@anthropic-ai/sdk';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { PassResultSchema, RiskOverviewResultSchema } from '../src/schemas/analysis';
import type { PassResult, RiskOverviewResult, MergedAnalysisResult } from '../src/schemas/analysis';
import { extractText } from 'unpdf';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BETAS = ['files-api-2025-04-14'];
const MODEL = 'claude-sonnet-4-5-20241022';
const MAX_TOKENS_PER_PASS = 8192;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const PAGE_COUNT_THRESHOLD = 100;

// Severity weights for deterministic risk score computation
const SEVERITY_WEIGHTS: Record<string, number> = {
  Critical: 25,
  High: 15,
  Medium: 8,
  Low: 3,
  Info: 0,
};

// ---------------------------------------------------------------------------
// JSON Schema conversion (Zod v3 compatible via zod-to-json-schema)
// ---------------------------------------------------------------------------

/**
 * Convert a Zod schema to the JSON Schema format expected by Anthropic's
 * structured output `output_config.format`. Strips the `$schema` key and
 * wraps in the `{ type: 'json_schema', schema }` envelope.
 */
function zodToOutputFormat(zodSchema: Parameters<typeof zodToJsonSchema>[0]) {
  const raw = zodToJsonSchema(zodSchema, { target: 'jsonSchema7' });
  // Remove the $schema meta key — Anthropic does not expect it
  const { $schema: _, ...schema } = raw as Record<string, unknown>;
  return {
    type: 'json_schema' as const,
    schema,
  };
}

// ---------------------------------------------------------------------------
// Analysis pass definitions
// ---------------------------------------------------------------------------

interface AnalysisPass {
  name: string;
  systemPrompt: string;
  userPrompt: string;
  isOverview: boolean; // true only for risk-overview pass
}

const ANALYSIS_PASSES: AnalysisPass[] = [
  {
    name: 'risk-overview',
    isOverview: true,
    systemPrompt: `You are a construction contract analyst specializing in glazing and glass installation contracts. You are reviewing this contract from the perspective of a glazing/glass installation subcontractor.

Your task is to identify the client name, determine the contract type, and find the most significant risks across all categories.

Guidelines:
- Identify the contracting parties and determine the client/owner name
- Classify the contract type (Prime Contract, Subcontract, Purchase Order, or Change Order)
- Focus on the top risks: indemnification clauses, payment terms, insurance requirements, scope clarity, and compliance requirements
- Be thorough but precise — only report genuine findings, not standard boilerplate
- Include specific clause references (section numbers, article numbers) where possible
- For each finding, provide actionable recommendations
- If you can quote the relevant clause text, include it in the clauseText field
- Do NOT assess or provide a risk score — that is computed separately`,
    userPrompt:
      'Analyze this glazing/glass installation contract. Identify the client name, contract type, and the most significant risks. Focus on indemnification, payment terms, insurance, scope clarity, and compliance requirements.',
  },
  {
    name: 'dates-deadlines',
    isOverview: false,
    systemPrompt: `You are a construction contract analyst specializing in glazing and glass installation contracts. You are reviewing this contract from the perspective of a glazing/glass installation subcontractor.

Your task is to extract all dates, deadlines, milestones, notice periods, cure periods, payment terms, and time-sensitive obligations from the contract.

Guidelines:
- Extract project start and completion dates
- Identify all milestone dates and deadlines
- Note notice periods and cure periods with their durations
- Find payment due dates and payment schedule terms
- Identify insurance certificate submission deadlines
- Flag any unreasonable or ambiguous time-bound obligations as findings
- Include specific clause references (section numbers, article numbers) where possible
- For each finding, provide actionable recommendations
- If you can quote the relevant clause text, include it in the clauseText field
- Do NOT assess or provide a risk score — that is computed separately`,
    userPrompt:
      'Extract all dates, deadlines, and time-sensitive terms from this contract. Include project start/completion dates, notice periods, cure periods, payment due dates, milestone dates, insurance certificate deadlines, and any other time-bound obligations.',
  },
  {
    name: 'scope-financial',
    isOverview: false,
    systemPrompt: `You are a construction contract analyst specializing in glazing and glass installation contracts. You are reviewing this contract from the perspective of a glazing/glass installation subcontractor.

Your task is to analyze the scope of work definitions, financial terms, and potential scope gaps.

Guidelines:
- Identify scope inclusions and exclusions
- Flag ambiguous scope language that could lead to disputes
- Analyze retainage terms and conditions
- Review payment schedules and conditions for payment
- Examine change order procedures and pricing mechanisms
- Identify financial risk areas (liquidated damages, back-charges, pay-if-paid clauses)
- Include specific clause references (section numbers, article numbers) where possible
- For each finding, provide actionable recommendations
- If you can quote the relevant clause text, include it in the clauseText field
- Do NOT assess or provide a risk score — that is computed separately`,
    userPrompt:
      'Analyze the scope of work and financial terms in this contract. Identify scope inclusions/exclusions, ambiguous scope language, retainage terms, payment schedules, change order procedures, and financial risk areas.',
  },
];

// ---------------------------------------------------------------------------
// PDF preparation — upload to Files API with fallback to text extraction
// ---------------------------------------------------------------------------

async function preparePdfForAnalysis(
  pdfBuffer: Buffer,
  fileName: string,
  client: Anthropic,
): Promise<{ fileId: string; usedFallback: boolean }> {
  // Rough page count estimate: count "/Type /Page" or "/Type/Page" markers.
  // This is a heuristic — exact count is not critical, just need to know
  // whether the PDF is over ~100 pages.
  const pdfString = pdfBuffer.toString('latin1');
  const pageMatches = pdfString.match(/\/Type\s*\/Page[^s]/g);
  const estimatedPages = pageMatches ? pageMatches.length : 0;

  if (estimatedPages <= PAGE_COUNT_THRESHOLD) {
    // Try native PDF upload first
    try {
      const file = await client.beta.files.upload({
        file: await toFile(pdfBuffer, fileName || 'contract.pdf', {
          type: 'application/pdf',
        }),
        betas: BETAS,
      });
      return { fileId: file.id, usedFallback: false };
    } catch (uploadError) {
      console.error(
        'Native PDF upload failed, falling back to text extraction:',
        uploadError instanceof Error ? uploadError.message : uploadError,
      );
      // Fall through to text extraction
    }
  }

  // Fallback: extract text with unpdf and upload as .txt
  const { text } = await extractText(new Uint8Array(pdfBuffer), {
    mergePages: true,
  });
  const textContent = Array.isArray(text) ? text.join('\n') : String(text);

  if (textContent.trim().length < 100) {
    throw new Error(
      'Could not extract sufficient text from this PDF. It may be a scanned/image-based document.',
    );
  }

  const textBuffer = Buffer.from(textContent, 'utf-8');
  const textFileName = (fileName || 'contract').replace(/\.pdf$/i, '') + '.txt';

  const file = await client.beta.files.upload({
    file: await toFile(textBuffer, textFileName, { type: 'text/plain' }),
    betas: BETAS,
  });
  return { fileId: file.id, usedFallback: true };
}

// ---------------------------------------------------------------------------
// Run a single analysis pass
// ---------------------------------------------------------------------------

async function runAnalysisPass(
  client: Anthropic,
  fileId: string,
  pass: AnalysisPass,
): Promise<{ passName: string; result: PassResult | RiskOverviewResult }> {
  const outputFormat = pass.isOverview
    ? zodToOutputFormat(RiskOverviewResultSchema)
    : zodToOutputFormat(PassResultSchema);

  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS_PER_PASS,
    betas: BETAS,
    stream: false,
    system: pass.systemPrompt,
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

  const responseText = response.content
    .filter((b): b is Anthropic.Beta.Messages.BetaTextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');

  const parsed = JSON.parse(responseText);
  return { passName: pass.name, result: parsed };
}

// ---------------------------------------------------------------------------
// Deterministic risk score computation
// ---------------------------------------------------------------------------

function computeRiskScore(findings: Array<{ severity: string }>): number {
  const rawScore = findings.reduce((sum, f) => {
    return sum + (SEVERITY_WEIGHTS[f.severity] || 0);
  }, 0);
  return Math.min(100, Math.max(0, rawScore));
}

// ---------------------------------------------------------------------------
// Merge results from all passes
// ---------------------------------------------------------------------------

function mergePassResults(
  results: PromiseSettledResult<{
    passName: string;
    result: PassResult | RiskOverviewResult;
  }>[],
  passes: AnalysisPass[],
): MergedAnalysisResult {
  const allFindings: Array<PassResult['findings'][number]> = [];
  const allDates: Array<PassResult['dates'][number]> = [];
  const passResults: MergedAnalysisResult['passResults'] = [];

  let client = 'Unknown Client';
  let contractType: MergedAnalysisResult['contractType'] = 'Subcontract';

  for (let i = 0; i < results.length; i++) {
    const settled = results[i];
    const passName = passes[i].name;

    if (settled.status === 'fulfilled') {
      const { result } = settled.value;
      allFindings.push(...result.findings);
      allDates.push(...result.dates);
      passResults.push({ passName, status: 'success' });

      // Extract client/contractType from risk-overview pass
      if (passes[i].isOverview && 'client' in result) {
        const overview = result as RiskOverviewResult;
        client = overview.client || client;
        contractType = overview.contractType || contractType;
      }
    } else {
      const errorMessage =
        settled.reason instanceof Error
          ? settled.reason.message
          : String(settled.reason);

      passResults.push({
        passName,
        status: 'failed',
        error: errorMessage,
      });

      // Create an error finding so the user sees the failure
      allFindings.push({
        severity: 'Critical',
        category: 'Risk Assessment',
        title: `Analysis Pass Failed: ${passName}`,
        description: `The ${passName} analysis pass failed: ${errorMessage}`,
        recommendation:
          'Try uploading the contract again. If the problem persists, the contract may have formatting issues that prevent analysis.',
        clauseReference: 'N/A',
      });
    }
  }

  // Deduplicate findings by title — keep the one with higher severity
  const severityRank: Record<string, number> = {
    Critical: 5,
    High: 4,
    Medium: 3,
    Low: 2,
    Info: 1,
  };
  const findingMap = new Map<
    string,
    (typeof allFindings)[number]
  >();
  for (const finding of allFindings) {
    const existing = findingMap.get(finding.title);
    if (
      !existing ||
      (severityRank[finding.severity] || 0) >
        (severityRank[existing.severity] || 0)
    ) {
      findingMap.set(finding.title, finding);
    }
  }
  const deduplicatedFindings = Array.from(findingMap.values());

  // Compute risk score deterministically
  const riskScore = computeRiskScore(deduplicatedFindings);

  return {
    client,
    contractType,
    riskScore,
    findings: deduplicatedFindings,
    dates: allDates,
    passResults,
  };
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
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

  try {
    const { pdfBase64, fileName } = req.body;

    if (!pdfBase64 || typeof pdfBase64 !== 'string') {
      return res
        .status(400)
        .json({ error: 'Missing or invalid pdfBase64 field' });
    }

    // Decode and validate size
    const pdfBuffer = Buffer.from(pdfBase64, 'base64');
    if (pdfBuffer.length > MAX_FILE_SIZE_BYTES) {
      return res.status(400).json({
        error: `File too large. Maximum size is 10MB, received ${(pdfBuffer.length / (1024 * 1024)).toFixed(1)}MB.`,
      });
    }

    client = new Anthropic({ apiKey });

    // Upload PDF to Files API (or fallback to text extraction)
    const prepared = await preparePdfForAnalysis(
      pdfBuffer,
      fileName || 'contract.pdf',
      client,
    );
    fileId = prepared.fileId;

    // Execute all analysis passes in parallel
    const passPromises = ANALYSIS_PASSES.map((pass) =>
      runAnalysisPass(client!, fileId!, pass),
    );
    const settledResults = await Promise.allSettled(passPromises);

    // Merge results from all passes
    const merged = mergePassResults(settledResults, ANALYSIS_PASSES);

    // Assign unique IDs to all findings
    const findingsWithIds = merged.findings.map((f, index) => ({
      id: `f-${Date.now()}-${index}`,
      ...f,
    }));

    return res.status(200).json({
      client: merged.client,
      contractType: merged.contractType,
      riskScore: merged.riskScore,
      findings: findingsWithIds,
      dates: merged.dates,
      passResults: merged.passResults,
    });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };

    if (err.status === 429) {
      return res
        .status(429)
        .json({ error: 'Rate limit exceeded. Please wait a moment and try again.' });
    }
    if (err.status === 401) {
      return res
        .status(500)
        .json({ error: 'Server configuration error: invalid API key' });
    }

    console.error('Analysis error:', err.message || error);
    return res
      .status(500)
      .json({ error: 'An error occurred during analysis. Please try again.' });
  } finally {
    // Clean up: delete the uploaded file from Files API (best-effort)
    if (client && fileId) {
      try {
        await client.beta.files.delete(fileId, { betas: BETAS });
      } catch (cleanupError) {
        console.error(
          'File cleanup failed (non-critical):',
          cleanupError instanceof Error
            ? cleanupError.message
            : cleanupError,
        );
      }
    }
  }
}
