import type { VercelRequest, VercelResponse } from '@vercel/node';
import Anthropic from '@anthropic-ai/sdk';
import { toFile } from '@anthropic-ai/sdk';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { PassResultSchema, RiskOverviewResultSchema } from '../src/schemas/analysis';
import type { PassResult, RiskOverviewResult, MergedAnalysisResult } from '../src/schemas/analysis';
import {
  IndemnificationPassResultSchema,
  PaymentContingencyPassResultSchema,
  LiquidatedDamagesPassResultSchema,
  RetainagePassResultSchema,
} from '../src/schemas/legalAnalysis';
import type { LegalMeta } from '../src/types/contract';
import { extractText } from 'unpdf';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BETAS = ['files-api-2025-04-14'];
const MODEL = 'claude-sonnet-4-5-20250929';
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
  isLegal?: boolean;
  schema?: Parameters<typeof zodToOutputFormat>[0]; // Zod schema for this pass
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

  // --- Legal analysis passes (specialized, one per clause type) ---

  {
    name: 'legal-indemnification',
    isOverview: false,
    isLegal: true,
    schema: IndemnificationPassResultSchema,
    systemPrompt: `You are a construction contract analyst specializing in glazing and glass installation subcontracts. You are reviewing this contract from the perspective of a glazing/glass installation subcontractor (the "Sub").

Your task is to find and analyze ALL indemnification and hold-harmless clauses in this contract.

## What to Find
- Express indemnification clauses (indemnify, hold harmless, defend)
- Additional insured requirements tied to indemnification
- Clauses where the Sub assumes liability beyond their own negligence
- Mutual vs one-sided indemnification provisions

## For Each Clause Found
1. Quote the EXACT, COMPLETE clause text as it appears in the contract. Do not truncate, paraphrase, summarize, or reconstruct. Include the full paragraph/section.
2. Classify the indemnification type:
   - Broad form: Sub must indemnify GC for ALL claims, including those caused solely by GC's negligence. Detection signals: "regardless of fault", "whether or not caused by", "sole negligence of indemnitee"
   - Intermediate form: Sub must indemnify GC for concurrent negligence but not GC's sole negligence. Detection signals: "caused in whole or in part by", "to the fullest extent permitted by law"
   - Limited form: Sub only indemnifies for Sub's own negligence. Detection signals: "to the extent caused by", "arising from the acts or omissions of"
3. Check for insurance gaps: Does this clause create liability that would NOT be covered by a standard CGL policy ($1M/$2M) or commercial umbrella policy ($5M) typical for a glazing subcontractor? Standard glazing sub coverage includes CGL, umbrella, auto, and workers comp.
4. Explain in plain English why this clause matters to a glazing sub. Contrast with what a "standard" or "fair" version of this clause would look like so the user can see what is abnormal.
5. Note cross-references to other contract sections that modify or are affected by this clause.

## Severity Rules (MANDATORY -- you MUST follow these exactly)
- Broad form indemnification = Critical
- Intermediate form indemnification = High
- Limited form indemnification = Medium

## Missing Protective Clauses
- If the contract has indemnification flowing only from Sub to GC with NO mutual indemnification, create a finding noting this absence.
- Use clauseReference "Not Found" and clauseText "N/A - Protective clause absent" when flagging a missing protective clause.
- Search ALL sections of the contract before concluding a clause is absent.
- Do NOT flag the absence of harmful indemnification clauses (that is good news, not a finding).

## Output Rules
- One finding per indemnification clause instance
- If the contract has 3 separate indemnification provisions, produce 3 findings
- Always include the section/article number in clauseReference
- If the contract specifies a governing law state, include state-specific enforceability context (some states have anti-indemnity statutes). If no state is specified, note that enforceability varies by jurisdiction.
- Explain why this matters specifically to a glazing/glass installation subcontractor, not generic legal language
- Do NOT assess or provide a risk score -- that is computed separately`,
    userPrompt:
      'Analyze all indemnification and hold-harmless clauses in this glazing subcontract.',
  },
  {
    name: 'legal-payment-contingency',
    isOverview: false,
    isLegal: true,
    schema: PaymentContingencyPassResultSchema,
    systemPrompt: `You are a construction contract analyst specializing in glazing and glass installation subcontracts. You are reviewing this contract from the perspective of a glazing/glass installation subcontractor (the "Sub").

Your task is to find and analyze ALL pay-if-paid and pay-when-paid provisions in this contract.

## What to Find
- Pay-if-paid clauses: Payment to Sub is CONDITIONED on owner paying GC. Creates a "condition precedent" to payment. Detection signals: "contingent upon", "condition precedent to payment", "only if and to the extent", "receipt of payment from owner shall be a condition"
- Pay-when-paid clauses: Establishes TIMING of payment only. Sub eventually gets paid regardless. Detection signals: "within [X] days of receipt", "upon receipt of payment from owner", "when paid by owner"
- Any clause that links Sub payment timing or obligation to owner payment to GC

## For Each Clause Found
1. Quote the EXACT, COMPLETE clause text as it appears in the contract. Do not truncate, paraphrase, summarize, or reconstruct. Include the full paragraph/section.
2. Classify as pay-if-paid or pay-when-paid based on the contract language.
3. Provide enforceability context: If the contract specifies a governing law state, note whether that state enforces pay-if-paid clauses (approximately 13 states prohibit pay-if-paid, including NC, CA, NY). If no state is specified, note that enforceability varies by jurisdiction and suggest checking.
4. Explain in plain English the risk from a glazing sub's perspective. Contrast with what a standard/fair payment term looks like (e.g., "Net 30 from invoice" or "within 30 days of approved application for payment").
5. Note cross-references to other contract sections that modify or are affected by this clause.

## Severity Rules (MANDATORY -- you MUST follow these exactly)
- Pay-if-paid = Critical
- Pay-when-paid = High

## Missing Protective Clauses
- If the contract has NO specified payment timeline at all (no "Net 30", no "within X days", no payment schedule), create a finding noting this absence.
- Use clauseReference "Not Found" and clauseText "N/A - Protective clause absent" when flagging a missing protective clause.
- Search ALL sections of the contract before concluding a clause is absent.

## Output Rules
- One finding per payment contingency clause instance
- Always include the section/article number in clauseReference
- Explain why this matters specifically to a glazing/glass installation subcontractor, not generic legal language
- Do NOT assess or provide a risk score -- that is computed separately`,
    userPrompt:
      'Analyze all payment contingency clauses (pay-if-paid, pay-when-paid) in this glazing subcontract.',
  },
  {
    name: 'legal-liquidated-damages',
    isOverview: false,
    isLegal: true,
    schema: LiquidatedDamagesPassResultSchema,
    systemPrompt: `You are a construction contract analyst specializing in glazing and glass installation subcontracts. You are reviewing this contract from the perspective of a glazing/glass installation subcontractor (the "Sub").

Your task is to find and analyze ALL liquidated damages (LD) clauses in this contract.

## What to Find
- Express liquidated damages clauses with daily/weekly/monthly rates
- LD flow-through provisions from owner/GC contract to Sub
- Consequential damages waivers or lack thereof (related to LD exposure)
- Delay damage provisions

## For Each Clause Found
1. Quote the EXACT, COMPLETE clause text as it appears in the contract. Do not truncate, paraphrase, summarize, or reconstruct. Include the full paragraph/section.
2. Extract the amount or rate (e.g., "$500/day", "0.5% of contract value per week").
3. Determine if the LD amount is capped or uncapped. If capped, note the cap (e.g., "capped at 10% of contract value"). If uncapped, flag this explicitly.
4. Assess proportionality: Is the LD amount reasonable relative to the likely contract value for a glazing subcontract? A $5,000/day LD on a $50,000 subcontract is disproportionate; on a $5M subcontract it may be reasonable.
5. Check for flow-through from owner LD provisions that may expose the Sub beyond their scope.
6. Explain in plain English the financial exposure for a glazing sub. Contrast with what standard/fair LD terms look like.
7. Note cross-references to other contract sections that modify or are affected by this clause.

## Severity Rules (MANDATORY -- you MUST follow these exactly)
- Any LD clause = High minimum
- Uncapped LD or disproportionate to contract value = Critical

## Output Rules
- One finding per liquidated damages clause instance
- Always include the section/article number in clauseReference
- If the contract specifies a governing law state, include state-specific enforceability context. If no state is specified, note that enforceability varies by jurisdiction.
- Explain why this matters specifically to a glazing/glass installation subcontractor, not generic legal language
- Do NOT assess or provide a risk score -- that is computed separately`,
    userPrompt:
      'Analyze all liquidated damages clauses in this glazing subcontract.',
  },
  {
    name: 'legal-retainage',
    isOverview: false,
    isLegal: true,
    schema: RetainagePassResultSchema,
    systemPrompt: `You are a construction contract analyst specializing in glazing and glass installation subcontracts. You are reviewing this contract from the perspective of a glazing/glass installation subcontractor (the "Sub").

Your task is to find and analyze ALL retainage and retention provisions in this contract.

## What to Find
- Retainage/retention percentage specifications
- Release conditions (when retainage is released back to Sub)
- Reduction provisions (e.g., reduction after 50% completion)
- Whether retainage release is tied to Sub's work completion or overall project completion
- Retainage on stored materials

## For Each Clause Found
1. Quote the EXACT, COMPLETE clause text as it appears in the contract. Do not truncate, paraphrase, summarize, or reconstruct. Include the full paragraph/section.
2. Extract the retainage percentage.
3. Identify the release conditions -- what triggers the release of withheld retainage back to the Sub.
4. Determine if retainage release is tied to the Sub's own substantial completion ("sub-work") or to overall project completion ("project-completion"). If unclear or not specified, mark as "unspecified".
5. Check for retainage reduction after 50% completion (some jurisdictions require this).
6. Explain in plain English the cash flow impact for a glazing sub. Contrast with standard/fair retainage terms (e.g., "5% retainage released within 30 days of Sub's substantial completion").
7. Note cross-references to other contract sections that modify or are affected by this clause.

## Severity Rules (MANDATORY -- you MUST follow these exactly)
- Retainage release tied to overall project completion (not Sub's work) = High
- Retainage above 10% = High
- Standard 5-10% retainage tied to Sub's substantial completion = Low
- Missing release conditions (no specification of when retainage is released) = Critical

## Missing Protective Clauses
- If the contract withholds retainage but has NO release provision, create a finding noting this absence (severity: Critical).
- Use clauseReference "Not Found" and clauseText "N/A - Protective clause absent" when flagging a missing protective clause.
- Search ALL sections of the contract before concluding a clause is absent.

## Output Rules
- One finding per retainage provision instance
- Always include the section/article number in clauseReference
- If the contract specifies a governing law state, include state-specific enforceability context. If no state is specified, note that enforceability varies by jurisdiction.
- Explain why this matters specifically to a glazing/glass installation subcontractor, not generic legal language
- Do NOT assess or provide a risk score -- that is computed separately`,
    userPrompt:
      'Analyze all retainage and retention provisions in this glazing subcontract.',
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
  const outputFormat = pass.schema
    ? zodToOutputFormat(pass.schema)
    : pass.isOverview
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
// Convert legal pass findings to unified Finding shape with legalMeta
// ---------------------------------------------------------------------------

interface UnifiedFinding {
  severity: string;
  category: string;
  title: string;
  description: string;
  recommendation: string;
  clauseReference: string;
  clauseText?: string;
  explanation?: string;
  crossReferences?: string[];
  legalMeta?: LegalMeta;
  sourcePass?: string;
}

function convertLegalFinding(
  finding: Record<string, unknown>,
  passName: string,
): UnifiedFinding {
  const base: UnifiedFinding = {
    severity: finding.severity as string,
    category: finding.category as string,
    title: finding.title as string,
    description: finding.description as string,
    recommendation: finding.recommendation as string,
    clauseReference: finding.clauseReference as string,
    clauseText: finding.clauseText as string,
    explanation: finding.explanation as string,
    crossReferences: finding.crossReferences as string[],
    sourcePass: passName,
  };

  // Pack type-specific metadata into legalMeta
  switch (passName) {
    case 'legal-indemnification':
      base.legalMeta = {
        clauseType: 'indemnification',
        riskType: finding.riskType as 'limited' | 'intermediate' | 'broad',
        hasInsuranceGap: finding.hasInsuranceGap as boolean,
      };
      break;
    case 'legal-payment-contingency':
      base.legalMeta = {
        clauseType: 'payment-contingency',
        paymentType: finding.paymentType as 'pay-if-paid' | 'pay-when-paid',
        enforceabilityContext: finding.enforceabilityContext as string,
      };
      break;
    case 'legal-liquidated-damages':
      base.legalMeta = {
        clauseType: 'liquidated-damages',
        amountOrRate: finding.amountOrRate as string,
        capStatus: finding.capStatus as 'capped' | 'uncapped',
        proportionalityAssessment: finding.proportionalityAssessment as string,
      };
      break;
    case 'legal-retainage':
      base.legalMeta = {
        clauseType: 'retainage',
        percentage: finding.percentage as string,
        releaseCondition: finding.releaseCondition as string,
        tiedTo: finding.tiedTo as 'sub-work' | 'project-completion' | 'unspecified',
      };
      break;
  }

  return base;
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
  const allFindings: UnifiedFinding[] = [];
  const allDates: Array<PassResult['dates'][number]> = [];
  const passResults: MergedAnalysisResult['passResults'] = [];

  let client = 'Unknown Client';
  let contractType: MergedAnalysisResult['contractType'] = 'Subcontract';

  const severityRank: Record<string, number> = {
    Critical: 5,
    High: 4,
    Medium: 3,
    Low: 2,
    Info: 1,
  };

  for (let i = 0; i < results.length; i++) {
    const settled = results[i];
    const passName = passes[i].name;

    if (settled.status === 'fulfilled') {
      const { result } = settled.value;
      allDates.push(...result.dates);
      passResults.push({ passName, status: 'success' });

      // Extract client/contractType from risk-overview pass
      if (passes[i].isOverview && 'client' in result) {
        const overview = result as RiskOverviewResult;
        client = overview.client || client;
        contractType = overview.contractType || contractType;
      }

      // Convert findings: legal passes get convertLegalFinding, others get tagged with sourcePass
      if (passes[i].isLegal) {
        for (const f of result.findings) {
          allFindings.push(convertLegalFinding(f as unknown as Record<string, unknown>, passName));
        }
      } else {
        for (const f of result.findings) {
          allFindings.push({ ...f, sourcePass: passName });
        }
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
        sourcePass: passName,
      });
    }
  }

  // --- Enhanced deduplication ---
  // Phase 1: clauseReference + category composite key dedup
  // Prefer specialized legal passes over general passes; among same type, prefer higher severity
  const byClauseAndCategory = new Map<string, UnifiedFinding>();
  const noClauseRefFindings: UnifiedFinding[] = [];

  for (const finding of allFindings) {
    const clauseRef = finding.clauseReference;
    // Only use composite key for findings with a real clauseReference
    if (clauseRef && clauseRef !== 'N/A' && clauseRef !== 'Not Found') {
      const key = `${clauseRef}::${finding.category}`;
      const existing = byClauseAndCategory.get(key);

      if (!existing) {
        byClauseAndCategory.set(key, finding);
      } else {
        const findingIsLegal = (finding.sourcePass || '').startsWith('legal-');
        const existingIsLegal = (existing.sourcePass || '').startsWith('legal-');

        if (findingIsLegal && !existingIsLegal) {
          // Specialized legal pass beats general pass
          byClauseAndCategory.set(key, finding);
        } else if (!findingIsLegal && existingIsLegal) {
          // Keep the specialized one already stored
        } else if (
          (severityRank[finding.severity] || 0) >
          (severityRank[existing.severity] || 0)
        ) {
          // Same pass type: higher severity wins
          byClauseAndCategory.set(key, finding);
        }
      }
    } else {
      // Findings without clauseReference go to title-based dedup
      noClauseRefFindings.push(finding);
    }
  }

  // Phase 2: title-based dedup as fallback for findings without clauseReference
  const byTitle = new Map<string, UnifiedFinding>();
  // Start with clause-key deduped findings
  for (const finding of byClauseAndCategory.values()) {
    const existing = byTitle.get(finding.title);
    if (
      !existing ||
      (severityRank[finding.severity] || 0) >
        (severityRank[existing.severity] || 0)
    ) {
      byTitle.set(finding.title, finding);
    }
  }
  // Add findings that had no clauseReference
  for (const finding of noClauseRefFindings) {
    const existing = byTitle.get(finding.title);
    if (!existing) {
      byTitle.set(finding.title, finding);
    } else {
      const findingIsLegal = (finding.sourcePass || '').startsWith('legal-');
      const existingIsLegal = (existing.sourcePass || '').startsWith('legal-');

      if (findingIsLegal && !existingIsLegal) {
        byTitle.set(finding.title, finding);
      } else if (!findingIsLegal && existingIsLegal) {
        // Keep the specialized one already stored
      } else if (
        (severityRank[finding.severity] || 0) >
        (severityRank[existing.severity] || 0)
      ) {
        byTitle.set(finding.title, finding);
      }
    }
  }

  const deduplicatedFindings = Array.from(byTitle.values());

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
