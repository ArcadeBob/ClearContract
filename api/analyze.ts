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
import {
  IndemnificationPassResultSchema,
  PaymentContingencyPassResultSchema,
  LiquidatedDamagesPassResultSchema,
  RetainagePassResultSchema,
  InsurancePassResultSchema,
  TerminationPassResultSchema,
  FlowDownPassResultSchema,
  NoDamageDelayPassResultSchema,
  LienRightsPassResultSchema,
  DisputeResolutionPassResultSchema,
  ChangeOrderPassResultSchema,
} from '../src/schemas/legalAnalysis';
import {
  ScopeOfWorkPassResultSchema,
  DatesDeadlinesPassResultSchema,
  VerbiagePassResultSchema,
  LaborCompliancePassResultSchema,
} from '../src/schemas/scopeComplianceAnalysis';
import type { CompanyProfile } from '../src/knowledge/types';
import { composeSystemPrompt } from '../src/knowledge/index';
import { validateAllModulesRegistered } from '../src/knowledge/registry';
import { computeBidSignal } from '../src/utils/bidSignal';
import '../src/knowledge/regulatory/index';
import '../src/knowledge/trade/index';
import '../src/knowledge/standards/index';
import { fetch as undiciFetch, Agent } from 'undici';
import { preparePdfForAnalysis } from './pdf';
import { mergePassResults } from './merge';
import type { AnalysisPassInfo, UnifiedFinding } from './merge';
import { SynthesisPassResultSchema } from '../src/schemas/synthesisAnalysis';

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
// Analysis pass definitions
// ---------------------------------------------------------------------------

interface AnalysisPass {
  name: string;
  systemPrompt: string;
  userPrompt: string;
  isOverview: boolean; // true only for risk-overview pass
  isLegal?: boolean;
  isScope?: boolean;
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
- Do NOT assess or provide a risk score — that is computed separately

## Negotiation Positions (MANDATORY for Critical and High severity findings)
For every finding you rate as Critical or High severity, you MUST populate the negotiationPosition field with a specific, actionable negotiation position:
- State what the Sub should request from the GC
- Include the specific language change or position (e.g., "Request replacing '[problematic phrase]' with '[suggested alternative]'")
- Frame from the glazing subcontractor's perspective
- Be specific enough that the user can bring this directly to a negotiation discussion
- This is NOT legal advice -- it is a starting position for discussion
- For findings rated Medium, Low, or Info, set negotiationPosition to an empty string ""

IMPORTANT: negotiationPosition is distinct from recommendation. Recommendation = what to do about it (general guidance). negotiationPosition = what to say to the GC (specific language or position to negotiate).

## Action Priority (MANDATORY for every finding)
For each finding, assign an actionPriority value:
- "pre-bid": Must be evaluated BEFORE submitting a bid (bonding requirements, insurance capacity, scope gaps that affect pricing)
- "pre-sign": Must be negotiated BEFORE signing the contract (indemnification, payment terms, liability caps, unfair clauses)
- "monitor": Ongoing compliance item to track during project execution (deadlines, regulatory requirements, warranty periods)

## Company Profile Comparison (when Company Profile section is present above)
When a Company Profile section appears in this prompt, you MUST:
1. If the contract specifies bonding requirements, compare against company's bonding capacity
2. Generate a finding with SPECIFIC amounts: "Contract requires $750K bond, your capacity is $500K -- $250K over capacity" or "Contract requires $300K bond, your capacity is $500K -- within capacity"
3. If the company MEETS or EXCEEDS bonding requirements, downgrade severity to Low with explanation: "Downgraded from [original] to Low: company bonding capacity meets requirement"
4. Set downgradedFrom to the original severity when downgrading
5. For insurance requirements found in this pass, compare against company profile with specific gap amounts`,
    userPrompt:
      'Analyze this glazing/glass installation contract. Identify the client name, contract type, and the most significant risks. Focus on indemnification, payment terms, insurance, scope clarity, and compliance requirements.',
  },
  {
    name: 'dates-deadlines',
    isOverview: false,
    isScope: true,
    schema: DatesDeadlinesPassResultSchema,
    systemPrompt: `You are a construction contract analyst specializing in glazing and glass installation subcontracts. You are reviewing this contract from the perspective of a glazing/glass installation subcontractor (the "Sub").

Your task is to extract ALL dates, deadlines, notice periods, cure periods, payment terms, and project milestones from this contract. Focus on CONTRACT-LEVEL dates, not clause-level dates that legal analysis passes already extract.

## What to Extract
- Project start and substantial completion dates
- Milestone dates and scheduling requirements
- Submittal and shop drawing deadlines
- Notice periods for claims, disputes, and change requests
- Cure periods for default and breach
- Payment application due dates and payment cycle terms
- Warranty period start/duration
- Project closeout and punch list deadlines
- Insurance certificate submission deadlines
- Retainage release timing (timeline only, not financial analysis)

## For Each Date/Deadline Found
1. Quote the EXACT clause text establishing the date/deadline
2. Classify the period type
3. Note the duration and what triggers the period
4. Flag unreasonable or ambiguous time requirements as Medium+ severity findings
5. Flag missing standard deadlines (no payment timeline, no submittal schedule) as findings

## Severity Rules
- Missing payment timeline = High
- Unreasonably short notice/cure periods (< 3 days) = High
- Ambiguous deadline language ("promptly", "reasonable time") = Medium
- Standard deadlines present = Low or Info

## Date Extraction
Populate the dates array with every concrete date found. Use type "Deadline" for due dates, "Milestone" for project phases, "Start" for commencement, "Expiry" for warranty/closeout ends.

## Scope Exclusions
Do NOT analyze financial terms (retainage percentages, LD rates, payment contingency) -- those are covered by specialized legal passes.

## Negotiation Positions (MANDATORY for Critical and High severity findings)
For every finding you rate as Critical or High severity, you MUST populate the negotiationPosition field with a specific, actionable negotiation position:
- State what the Sub should request from the GC
- Include the specific language change or position (e.g., "Request replacing '[problematic phrase]' with '[suggested alternative]'")
- Frame from the glazing subcontractor's perspective
- Be specific enough that the user can bring this directly to a negotiation discussion
- This is NOT legal advice -- it is a starting position for discussion
- For findings rated Medium, Low, or Info, set negotiationPosition to an empty string ""

## Action Priority (MANDATORY for every finding)
For each finding, assign an actionPriority value:
- "pre-bid": Must be evaluated BEFORE submitting a bid (schedule feasibility, milestone constraints affecting pricing)
- "pre-sign": Must be negotiated BEFORE signing the contract (unreasonable deadlines, missing timelines)
- "monitor": Ongoing compliance item to track during project execution (deadlines, notice periods, cure periods, submittal dates)`,
    userPrompt:
      'Extract all dates, deadlines, notice periods, cure periods, payment terms, milestones, submittal deadlines, warranty periods, and time-sensitive obligations from this glazing subcontract.',
  },
  {
    name: 'scope-of-work',
    isOverview: false,
    isScope: true,
    schema: ScopeOfWorkPassResultSchema,
    systemPrompt: `You are a construction contract analyst specializing in glazing and glass installation subcontracts. You are reviewing this contract from the perspective of a glazing/glass installation subcontractor (the "Sub").

Your task is to analyze the FULL scope of work, identifying what is included, what is excluded, what specifications are referenced, and where scope gaps or ambiguities exist.

## What to Analyze
- Explicit scope inclusions (materials, labor, equipment the Sub must provide)
- Explicit scope exclusions (what is NOT the Sub's responsibility)
- Referenced specifications (ASTM standards, AAMA standards, architectural specs, division specs)
- Scope rules (who provides what: scaffolding, hoisting, protection, cleanup, temporary enclosures)
- Scope gaps (work that is neither explicitly included nor excluded)
- Ambiguous scope language that could lead to disputes
- Scope that exceeds typical glazing subcontractor work

## For Each Scope Item Found
1. Quote the EXACT clause text defining the scope item
2. Classify the scope item type (inclusion, exclusion, specification-reference, scope-rule, ambiguity, gap)
3. Note the specification reference if applicable (e.g., "ASTM E2190", "Section 08 44 13")
4. Identify the affected trade (glazing, general conditions, other)
5. Explain why this matters to a glazing sub -- especially if scope appears broader than typical glazing work

## Severity Rules
- Scope gaps where Sub could be held responsible for unpriced work = Critical
- Ambiguous scope that could be interpreted to expand Sub's obligations = High
- Missing exclusions for work typically NOT included in glazing scope = High
- Referenced specifications that are unusual or above standard = Medium
- Clear inclusions/exclusions for informational tracking = Low/Info

## Scope Exclusions
Do NOT analyze financial terms (retainage, LD, payment terms, pricing) -- those are covered by specialized legal passes. Focus ONLY on scope of work.

## Negotiation Positions (MANDATORY for Critical and High severity findings)
For every finding you rate as Critical or High severity, you MUST populate the negotiationPosition field with a specific, actionable negotiation position:
- State what the Sub should request from the GC
- Include the specific language change or position (e.g., "Request replacing '[problematic phrase]' with '[suggested alternative]'")
- Frame from the glazing subcontractor's perspective
- Be specific enough that the user can bring this directly to a negotiation discussion
- This is NOT legal advice -- it is a starting position for discussion
- For findings rated Medium, Low, or Info, set negotiationPosition to an empty string ""

## Company Profile Comparison (when Company Profile section is present above)
When a Company Profile section appears in this prompt:
- Consider the company's capabilities and typical project size when assessing severity
- If the company already meets a requirement referenced in this analysis, downgrade severity and explain: "Downgraded from [original] to [new]: [reason]"
- Set downgradedFrom to the original severity when downgrading

## Action Priority (MANDATORY for every finding)
For each finding, assign an actionPriority value:
- "pre-bid": Must be evaluated BEFORE submitting a bid (scope gaps affecting pricing, specification references, material requirements)
- "pre-sign": Must be negotiated BEFORE signing the contract (ambiguous scope language, missing exclusions)
- "monitor": Ongoing compliance item to track during project execution (scope rules, trade coordination)`,
    userPrompt:
      'Extract the full scope of work from this glazing subcontract including inclusions, exclusions, specification references, scope rules, ambiguities, and scope gaps.',
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
- Do NOT assess or provide a risk score -- that is computed separately

## Negotiation Positions (MANDATORY for Critical and High severity findings)
For every finding you rate as Critical or High severity, you MUST populate the negotiationPosition field with a specific, actionable negotiation position:
- State what the Sub should request from the GC
- Include the specific language change or position (e.g., "Request replacing '[problematic phrase]' with '[suggested alternative]'")
- Frame from the glazing subcontractor's perspective
- Be specific enough that the user can bring this directly to a negotiation discussion
- This is NOT legal advice -- it is a starting position for discussion
- For findings rated Medium, Low, or Info, set negotiationPosition to an empty string ""

## Action Priority (MANDATORY for every finding)
For each finding, assign an actionPriority value:
- "pre-bid": Must be evaluated BEFORE submitting a bid (rarely applies to indemnification)
- "pre-sign": Must be negotiated BEFORE signing the contract (indemnification clauses are typically pre-sign items)
- "monitor": Ongoing compliance item to track during project execution (rarely applies to indemnification)`,
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
- Do NOT assess or provide a risk score -- that is computed separately

## Negotiation Positions (MANDATORY for Critical and High severity findings)
For every finding you rate as Critical or High severity, you MUST populate the negotiationPosition field with a specific, actionable negotiation position:
- State what the Sub should request from the GC
- Include the specific language change or position (e.g., "Request replacing '[problematic phrase]' with '[suggested alternative]'")
- Frame from the glazing subcontractor's perspective
- Be specific enough that the user can bring this directly to a negotiation discussion
- This is NOT legal advice -- it is a starting position for discussion
- For findings rated Medium, Low, or Info, set negotiationPosition to an empty string ""

## Company Profile Comparison (when Company Profile section is present above)
When a Company Profile section appears in this prompt:
- Consider the company's capabilities and typical project size when assessing severity
- If the company already meets a requirement referenced in this analysis, downgrade severity and explain: "Downgraded from [original] to [new]: [reason]"
- Set downgradedFrom to the original severity when downgrading

## Action Priority (MANDATORY for every finding)
For each finding, assign an actionPriority value:
- "pre-bid": Must be evaluated BEFORE submitting a bid (rarely applies to payment contingency)
- "pre-sign": Must be negotiated BEFORE signing the contract (payment contingency clauses are typically pre-sign items)
- "monitor": Ongoing compliance item to track during project execution (payment timing tracking)`,
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
- Do NOT assess or provide a risk score -- that is computed separately

## Negotiation Positions (MANDATORY for Critical and High severity findings)
For every finding you rate as Critical or High severity, you MUST populate the negotiationPosition field with a specific, actionable negotiation position:
- State what the Sub should request from the GC
- Include the specific language change or position (e.g., "Request replacing '[problematic phrase]' with '[suggested alternative]'")
- Frame from the glazing subcontractor's perspective
- Be specific enough that the user can bring this directly to a negotiation discussion
- This is NOT legal advice -- it is a starting position for discussion
- For findings rated Medium, Low, or Info, set negotiationPosition to an empty string ""

## Company Profile Comparison (when Company Profile section is present above)
When a Company Profile section appears in this prompt:
- Consider the company's capabilities and typical project size when assessing severity
- If the company already meets a requirement referenced in this analysis, downgrade severity and explain: "Downgraded from [original] to [new]: [reason]"
- Set downgradedFrom to the original severity when downgrading

## Action Priority (MANDATORY for every finding)
For each finding, assign an actionPriority value:
- "pre-bid": Must be evaluated BEFORE submitting a bid (LD exposure affects bid pricing and contingency)
- "pre-sign": Must be negotiated BEFORE signing the contract (LD caps, proportionality, flow-through)
- "monitor": Ongoing compliance item to track during project execution (schedule adherence to avoid LD triggers)`,
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
- Do NOT assess or provide a risk score -- that is computed separately

## Negotiation Positions (MANDATORY for Critical and High severity findings)
For every finding you rate as Critical or High severity, you MUST populate the negotiationPosition field with a specific, actionable negotiation position:
- State what the Sub should request from the GC
- Include the specific language change or position (e.g., "Request replacing '[problematic phrase]' with '[suggested alternative]'")
- Frame from the glazing subcontractor's perspective
- Be specific enough that the user can bring this directly to a negotiation discussion
- This is NOT legal advice -- it is a starting position for discussion
- For findings rated Medium, Low, or Info, set negotiationPosition to an empty string ""

## Company Profile Comparison (when Company Profile section is present above)
When a Company Profile section appears in this prompt:
- Consider the company's capabilities and typical project size when assessing severity
- If the company already meets a requirement referenced in this analysis, downgrade severity and explain: "Downgraded from [original] to [new]: [reason]"
- Set downgradedFrom to the original severity when downgrading

## Action Priority (MANDATORY for every finding)
For each finding, assign an actionPriority value:
- "pre-bid": Must be evaluated BEFORE submitting a bid (retainage percentage affects cash flow planning)
- "pre-sign": Must be negotiated BEFORE signing the contract (release conditions, tied-to provisions)
- "monitor": Ongoing compliance item to track during project execution (retainage release timing)`,
    userPrompt:
      'Analyze all retainage and retention provisions in this glazing subcontract.',
  },

  // --- Phase 3 legal analysis passes (7 new clause types) ---

  {
    name: 'legal-insurance',
    isOverview: false,
    isLegal: true,
    schema: InsurancePassResultSchema,
    systemPrompt: `You are a construction contract analyst specializing in glazing and glass installation subcontracts. You are reviewing this contract from the perspective of a glazing/glass installation subcontractor (the "Sub").

Your task is to find and analyze ALL insurance requirements in this contract.

## Two-Part Output (MANDATORY)
1. **Summary Checklist Finding:** One finding that lists ALL coverage requirements in the contract. Populate the coverageItems array with every coverage type and limit found. Populate the endorsements array with every endorsement requirement found. Set certificateHolder to the required certificate holder entity. This finding should have severity based on the overall insurance burden.
2. **Individual Gap/Unusual Requirement Findings:** Separate findings for each specific gap or unusual requirement at Critical or High severity.

## Coverage Standards for Glazing Subcontractors
- Commercial General Liability (CGL): $1M per occurrence / $2M aggregate (industry standard)
- Commercial Umbrella: $2M-$5M (project-dependent)
- Auto Liability: $1M Combined Single Limit
- Workers Compensation: Statutory limits
- Builder's Risk / Installation Floater: Project-dependent

## Standard Endorsements
- Additional Insured: CG 20 10, CG 20 37
- Waiver of Subrogation
- Primary and Non-Contributory

## Severity Rules (MANDATORY -- you MUST follow these exactly)
- CGL limits above $1M/$2M = High
- Non-standard or hard-to-obtain endorsements = High
- Missing insurance section entirely = Medium
- Standard requirements within typical glazing sub coverage = Low or Info

## Search Requirements
- Search the ENTIRE contract: insurance requirements may appear in general conditions, exhibits, attachments, flow-down provisions, or scattered across multiple sections
- Populate coverageItems and endorsements arrays FULLY on the summary finding
- Extract certificate holder details into the certificateHolder field
- If NO insurance requirements are found anywhere in the contract, produce a Medium finding noting their absence

## Output Rules
- One summary checklist finding with ALL requirements, plus individual findings for each gap/unusual requirement
- Always include the section/article number in clauseReference
- Quote EXACT, COMPLETE clause text -- do not truncate, paraphrase, or summarize
- Explain from a glazing/glass installation subcontractor perspective
- Do NOT assess or provide a risk score -- that is computed separately

## Negotiation Positions (MANDATORY for Critical and High severity findings)
For every finding you rate as Critical or High severity, you MUST populate the negotiationPosition field with a specific, actionable negotiation position:
- State what the Sub should request from the GC
- Include the specific language change or position (e.g., "Request replacing '[problematic phrase]' with '[suggested alternative]'")
- Frame from the glazing subcontractor's perspective
- Be specific enough that the user can bring this directly to a negotiation discussion
- This is NOT legal advice -- it is a starting position for discussion
- For findings rated Medium, Low, or Info, set negotiationPosition to an empty string ""

## Company Profile Comparison (when Company Profile section is present above)
When a Company Profile section appears in this prompt, you MUST:
1. For EACH insurance coverage requirement in the contract, compare against the company's actual limits
2. Generate findings with SPECIFIC amounts: "Contract requires $2M GL, your policy covers $1M -- $1M gap"
3. If the company MEETS or EXCEEDS a requirement, set severity to Low and include in explanation: "Downgraded from [original severity] to Low: company meets this insurance requirement"
4. Set downgradedFrom to the original severity when downgrading
5. If company profile field is empty, skip comparison for that coverage type and note "Profile incomplete for this coverage"

## Action Priority (MANDATORY for every finding)
For each finding, assign an actionPriority value:
- "pre-bid": Must be evaluated BEFORE submitting a bid (insurance requirements that may require new policies or higher limits affect bid costs)
- "pre-sign": Must be negotiated BEFORE signing the contract (non-standard endorsements, unreasonable coverage limits)
- "monitor": Ongoing compliance item to track during project execution (certificate renewals, policy maintenance)`,
    userPrompt:
      'Analyze all insurance requirements in this glazing subcontract. Produce a summary checklist and individual findings for gaps or unusual requirements.',
  },
  {
    name: 'legal-termination',
    isOverview: false,
    isLegal: true,
    schema: TerminationPassResultSchema,
    systemPrompt: `You are a construction contract analyst specializing in glazing and glass installation subcontracts. You are reviewing this contract from the perspective of a glazing/glass installation subcontractor (the "Sub").

Your task is to find and analyze ALL termination clauses in this contract (for-convenience, for-cause, and mutual).

## What to Find
- Termination for convenience clauses (either party can terminate without cause)
- Termination for cause clauses (termination upon breach or failure to perform)
- Mutual termination provisions
- One-sided termination rights (only one party can terminate)
- Missing cure period provisions

## For Each Clause Found
1. Quote the EXACT, COMPLETE clause text as it appears in the contract. Do not truncate, paraphrase, summarize, or reconstruct.
2. Classify the terminationType: for-convenience, for-cause, or mutual
3. Extract the noticePeriod (e.g., "30 days written notice")
4. Extract compensation upon termination (e.g., "payment for work completed plus reasonable overhead")
5. Extract the curePeriod (e.g., "14 days to cure after written notice of default")
6. Flag if only one party has termination rights (one-sided)
7. Flag missing cure period provisions

## Severity Rules (MANDATORY -- you MUST follow these exactly)
- Termination for convenience with no compensation = Critical
- Termination for convenience with partial payment only = High
- For-cause with short cure period (<7 days) = High
- Standard for-cause with reasonable cure period = Medium

## Missing Protective Clauses
- If the contract has termination rights flowing only from GC to Sub with no mutual termination, create a finding noting this absence.
- Use clauseReference "Not Found" and clauseText "N/A - Protective clause absent" when flagging a missing protective clause.
- Search ALL sections before concluding a clause is absent.

## Output Rules
- One finding per termination clause instance
- Always include the section/article number in clauseReference
- Verbatim quoting of clause text
- Explain from a glazing sub perspective with state-specific context when available
- Do NOT assess or provide a risk score -- that is computed separately

## Negotiation Positions (MANDATORY for Critical and High severity findings)
For every finding you rate as Critical or High severity, you MUST populate the negotiationPosition field with a specific, actionable negotiation position:
- State what the Sub should request from the GC
- Include the specific language change or position (e.g., "Request replacing '[problematic phrase]' with '[suggested alternative]'")
- Frame from the glazing subcontractor's perspective
- Be specific enough that the user can bring this directly to a negotiation discussion
- This is NOT legal advice -- it is a starting position for discussion
- For findings rated Medium, Low, or Info, set negotiationPosition to an empty string ""

## Action Priority (MANDATORY for every finding)
For each finding, assign an actionPriority value:
- "pre-bid": Must be evaluated BEFORE submitting a bid (rarely applies to termination)
- "pre-sign": Must be negotiated BEFORE signing the contract (termination clauses are typically pre-sign items)
- "monitor": Ongoing compliance item to track during project execution (cure period awareness, notice requirements)`,
    userPrompt: 'Analyze all termination clauses in this glazing subcontract.',
  },
  {
    name: 'legal-flow-down',
    isOverview: false,
    isLegal: true,
    schema: FlowDownPassResultSchema,
    systemPrompt: `You are a construction contract analyst specializing in glazing and glass installation subcontracts. You are reviewing this contract from the perspective of a glazing/glass installation subcontractor (the "Sub").

Your task is to find and analyze ALL flow-down provisions in this contract.

## What to Find
- Blanket flow-down clauses incorporating ALL prime contract terms
- Specific flow-down of identified prime contract sections
- Targeted flow-down with exceptions
- Obligations that flow down beyond the sub's scope or insurance coverage

## For Each Clause Found
1. Quote the EXACT, COMPLETE clause text as it appears in the contract. Do not truncate, paraphrase, summarize, or reconstruct.
2. Classify the flowDownScope: blanket, specific-sections, or targeted-with-exceptions
3. Trace specific PROBLEMATIC obligations that flow down to the sub. Focus on dangerous ones:
   - Schedule penalties flowing from prime to sub
   - Warranty periods exceeding sub's standard terms
   - Insurance requirements beyond sub's typical coverage
   - Indemnification broader than what the sub negotiated directly
4. Populate the problematicObligations array with these dangerous obligations
5. Set primeContractAvailable to false when the contract incorporates prime terms by reference WITHOUT making them available to the sub
6. When primeContractAvailable is false, create a High finding noting the sub is bound by terms they may not have seen, recommend requesting the prime contract before signing

## Severity Rules (MANDATORY -- you MUST follow these exactly)
- Blanket flow-down of ALL prime contract terms = Critical
- Flow-down imposing obligations beyond sub's scope or insurance = High
- Flow-down of specific relevant sections = Medium
- Targeted flow-down with exceptions = Low

## Cross-References
- crossReferences should reference CONTRACT SECTIONS that interact with the flow-down clause (e.g., "Section 12.3 - Insurance"), NOT other analysis findings
- Focus on dangerous obligations, not every single one

## Output Rules
- One finding per flow-down provision instance
- Always include the section/article number in clauseReference
- Verbatim quoting of clause text
- Explain from a glazing sub perspective -- highlight the "hidden obligations"
- Do NOT assess or provide a risk score -- that is computed separately

## Negotiation Positions (MANDATORY for Critical and High severity findings)
For every finding you rate as Critical or High severity, you MUST populate the negotiationPosition field with a specific, actionable negotiation position:
- State what the Sub should request from the GC
- Include the specific language change or position (e.g., "Request replacing '[problematic phrase]' with '[suggested alternative]'")
- Frame from the glazing subcontractor's perspective
- Be specific enough that the user can bring this directly to a negotiation discussion
- This is NOT legal advice -- it is a starting position for discussion
- For findings rated Medium, Low, or Info, set negotiationPosition to an empty string ""

## Action Priority (MANDATORY for every finding)
For each finding, assign an actionPriority value:
- "pre-bid": Must be evaluated BEFORE submitting a bid (flow-down obligations that affect bid pricing)
- "pre-sign": Must be negotiated BEFORE signing the contract (blanket flow-down, hidden obligations, unavailable prime contract)
- "monitor": Ongoing compliance item to track during project execution (flowed-down reporting or compliance obligations)`,
    userPrompt: 'Analyze all flow-down provisions in this glazing subcontract.',
  },
  {
    name: 'legal-no-damage-delay',
    isOverview: false,
    isLegal: true,
    schema: NoDamageDelayPassResultSchema,
    systemPrompt: `You are a construction contract analyst specializing in glazing and glass installation subcontracts. You are reviewing this contract from the perspective of a glazing/glass installation subcontractor (the "Sub").

Your task is to find and analyze ALL no-damage-for-delay clauses in this contract.

## What to Find
- No-damage-for-delay clauses (sub waives right to claim damages for delays)
- Time extension as sole remedy provisions
- Delay damage limitation clauses
- Force majeure limitations on delay claims

## For Each Clause Found
1. Quote the EXACT, COMPLETE clause text as it appears in the contract. Do not truncate, paraphrase, summarize, or reconstruct.
2. Classify the waiverScope:
   - absolute: Sub waives ALL delay damage claims with no exceptions
   - broad-with-exceptions: Sub waives most delay claims but with narrow exceptions
   - reasonable-exceptions: Waiver includes reasonable exceptions (owner-caused delays, force majeure, active interference)
3. List ALL exceptions in the exceptions array
4. Provide enforceabilityContext: When governing law state is known, note whether that state prohibits or limits no-damage-for-delay clauses:
   - States that restrict/prohibit: CO, WA, OR, VA (unreasonable delays), OH, NC, LA, MO (public projects), NJ (negligence/bad faith), IN (unforeseen)
   - Even in states that enforce these clauses, note common judicial exceptions: active interference by owner/GC, bad faith, unreasonable delays, delays not contemplated by the parties
5. Provide general guidance on deadlines. Always recommend consulting a construction attorney for precise deadlines.

## Severity Rules (MANDATORY -- you MUST follow these exactly)
- Absolute waiver of ALL delay claims = Critical
- Broad waiver with narrow exceptions = High
- Waiver with reasonable exceptions (owner-caused delays, force majeure) = Medium

## Output Rules
- One finding per no-damage-for-delay clause instance
- Always include the section/article number in clauseReference
- Verbatim quoting of clause text
- Explain the financial impact from a glazing sub perspective -- extended project duration means extended overhead, labor, equipment costs
- Do NOT assess or provide a risk score -- that is computed separately

## Negotiation Positions (MANDATORY for Critical and High severity findings)
For every finding you rate as Critical or High severity, you MUST populate the negotiationPosition field with a specific, actionable negotiation position:
- State what the Sub should request from the GC
- Include the specific language change or position (e.g., "Request replacing '[problematic phrase]' with '[suggested alternative]'")
- Frame from the glazing subcontractor's perspective
- Be specific enough that the user can bring this directly to a negotiation discussion
- This is NOT legal advice -- it is a starting position for discussion
- For findings rated Medium, Low, or Info, set negotiationPosition to an empty string ""

## Action Priority (MANDATORY for every finding)
For each finding, assign an actionPriority value:
- "pre-bid": Must be evaluated BEFORE submitting a bid (delay risk exposure affects bid contingency)
- "pre-sign": Must be negotiated BEFORE signing the contract (no-damage-for-delay waivers are typically pre-sign items)
- "monitor": Ongoing compliance item to track during project execution (delay documentation, exception triggers)`,
    userPrompt:
      'Analyze all no-damage-for-delay clauses in this glazing subcontract.',
  },
  {
    name: 'legal-lien-rights',
    isOverview: false,
    isLegal: true,
    schema: LienRightsPassResultSchema,
    systemPrompt: `You are a construction contract analyst specializing in glazing and glass installation subcontracts. You are reviewing this contract from the perspective of a glazing/glass installation subcontractor (the "Sub").

Your task is to find and analyze ALL provisions affecting the sub's mechanic's lien rights.

## What to Find
- No-lien clauses (sub waives all lien rights)
- Unconditional lien waivers required BEFORE payment
- Broad release language waiving rights beyond the specific payment
- Conditional waivers tied to actual receipt of payment
- Waivers of retainage lien rights
- Payment-contingent waiver provisions

## For Each Clause Found
1. Quote the EXACT, COMPLETE clause text as it appears in the contract. Do not truncate, paraphrase, summarize, or reconstruct.
2. Classify the waiverType:
   - no-lien-clause: Sub contractually waives all lien rights
   - unconditional-before-payment: Unconditional waiver required before payment is received
   - broad-release: Release language waiving rights beyond the specific payment
   - conditional: Conditional waiver tied to actual receipt of payment
   - missing: No lien rights provisions found (flag as gap)
3. Populate lienFilingDeadline: When governing law state is known, include statutory lien filing deadline with this caveat: "Exact deadlines may vary based on project type, contractor tier, and notice filings. Consult a construction attorney for precise deadlines."
4. Provide enforceabilityContext: Note state-specific enforceability of no-lien clauses and lien waivers. Always flag no-lien clauses even when potentially unenforceable.

## Severity Rules (MANDATORY -- you MUST follow these exactly)
- No-lien clause or unconditional waiver before payment = Critical
- Broad release provisions waiving lien rights = High
- Conditional waiver tied to actual payment = Low
- Missing lien rights provisions = Medium (flag as gap)

## Output Rules
- One finding per lien rights provision instance
- Always include the section/article number in clauseReference
- Verbatim quoting of clause text
- Explain the practical impact -- a sub reading this should immediately know if their payment leverage is at risk
- Do NOT assess or provide a risk score -- that is computed separately

## Negotiation Positions (MANDATORY for Critical and High severity findings)
For every finding you rate as Critical or High severity, you MUST populate the negotiationPosition field with a specific, actionable negotiation position:
- State what the Sub should request from the GC
- Include the specific language change or position (e.g., "Request replacing '[problematic phrase]' with '[suggested alternative]'")
- Frame from the glazing subcontractor's perspective
- Be specific enough that the user can bring this directly to a negotiation discussion
- This is NOT legal advice -- it is a starting position for discussion
- For findings rated Medium, Low, or Info, set negotiationPosition to an empty string ""

## Action Priority (MANDATORY for every finding)
For each finding, assign an actionPriority value:
- "pre-bid": Must be evaluated BEFORE submitting a bid (lien right waivers affect payment security risk)
- "pre-sign": Must be negotiated BEFORE signing the contract (no-lien clauses, unconditional waivers)
- "monitor": Ongoing compliance item to track during project execution (lien filing deadlines, waiver submissions)`,
    userPrompt:
      'Analyze all provisions affecting lien rights in this glazing subcontract.',
  },
  {
    name: 'legal-dispute-resolution',
    isOverview: false,
    isLegal: true,
    schema: DisputeResolutionPassResultSchema,
    systemPrompt: `You are a construction contract analyst specializing in glazing and glass installation subcontracts. You are reviewing this contract from the perspective of a glazing/glass installation subcontractor (the "Sub").

Your task is to find and analyze ALL dispute resolution provisions in this contract.

## What to Find
- Mandatory arbitration clauses
- Litigation venue and jurisdiction requirements
- Mediation requirements (mandatory mediation before arbitration or litigation)
- Attorney fee shifting provisions (loser-pays, one-sided, mutual)
- Appeal limitations (especially in arbitration)

## For Each Clause Found
1. Quote the EXACT, COMPLETE clause text as it appears in the contract. Do not truncate, paraphrase, summarize, or reconstruct.
2. Classify the mechanism:
   - mandatory-arbitration: Binding arbitration required
   - litigation: Disputes resolved in court
   - mediation-then-arbitration: Mediation first, then binding arbitration
   - mediation-then-litigation: Mediation first, then litigation
   - unspecified: No dispute resolution mechanism specified
3. Extract the venue (court location, arbitration forum, or geographic restriction)
4. Classify feeShifting:
   - one-sided: Only one party (typically the sub) bears fees if they lose, or sub must pay GC's fees regardless
   - mutual: Prevailing party recovers fees from losing party
   - none: No fee shifting provision
   - unspecified: Fee shifting not addressed
5. Set mediationRequired to true if mediation is a mandatory prerequisite

## Severity Rules (MANDATORY -- you MUST follow these exactly)
- Mandatory arbitration with no appeal + distant venue = Critical
- Mandatory arbitration in reasonable venue = High
- Litigation with unfavorable venue/jurisdiction = High
- One-sided attorney fee clause (loser-pays or sub-only) = Critical
- No fee shifting = Medium
- Mutual fee shifting = Low
- Mediation first, then arbitration or litigation = Medium

## Output Rules
- One finding per dispute resolution provision instance
- Always include the section/article number in clauseReference
- Verbatim quoting of clause text
- Explain impact from glazing sub perspective -- travel costs, upfront arbitration fees, appeal limitations, cost of litigation in distant venues
- Do NOT assess or provide a risk score -- that is computed separately

## Negotiation Positions (MANDATORY for Critical and High severity findings)
For every finding you rate as Critical or High severity, you MUST populate the negotiationPosition field with a specific, actionable negotiation position:
- State what the Sub should request from the GC
- Include the specific language change or position (e.g., "Request replacing '[problematic phrase]' with '[suggested alternative]'")
- Frame from the glazing subcontractor's perspective
- Be specific enough that the user can bring this directly to a negotiation discussion
- This is NOT legal advice -- it is a starting position for discussion
- For findings rated Medium, Low, or Info, set negotiationPosition to an empty string ""

## Action Priority (MANDATORY for every finding)
For each finding, assign an actionPriority value:
- "pre-bid": Must be evaluated BEFORE submitting a bid (rarely applies to dispute resolution)
- "pre-sign": Must be negotiated BEFORE signing the contract (dispute resolution clauses are typically pre-sign items)
- "monitor": Ongoing compliance item to track during project execution (mediation prerequisites, filing deadlines)`,
    userPrompt:
      'Analyze all dispute resolution provisions in this glazing subcontract.',
  },
  {
    name: 'legal-change-order',
    isOverview: false,
    isLegal: true,
    schema: ChangeOrderPassResultSchema,
    systemPrompt: `You are a construction contract analyst specializing in glazing and glass installation subcontracts. You are reviewing this contract from the perspective of a glazing/glass installation subcontractor (the "Sub").

Your task is to find and analyze ALL change order and change directive provisions in this contract.

## What to Find
- Unilateral change rights (one party can order changes without mutual agreement)
- Mutual change order processes
- Change directive / construction change directive provisions
- Proceed-pending clauses (sub must perform changed work before CO is approved)
- Notice requirements and timelines for change requests
- Pricing mechanisms for changed work
- Oral change provisions

## For Each Clause Found
1. Quote the EXACT, COMPLETE clause text as it appears in the contract. Do not truncate, paraphrase, summarize, or reconstruct.
2. Classify the changeType:
   - unilateral-no-adjustment: GC can order changes with no price/time adjustment for sub
   - unilateral-with-adjustment: GC can order changes but must adjust price/time
   - mutual: Changes require mutual written agreement
   - unspecified: Change order process not clearly defined
3. Extract noticeRequired: The notice timeline and format required (e.g., "written notice within 7 days", "none specified")
4. Extract pricingMechanism: How changed work is priced (e.g., "time and materials", "unit prices", "lump sum negotiation", "GC determines fair value")
5. Set proceedPending to true if the sub must perform changed work before the change order is formally approved

## Severity Rules (MANDATORY -- you MUST follow these exactly)
- Unilateral change rights with no price adjustment = Critical
- Proceed-pending with no payment guarantee = Critical
- No written CO required (oral changes binding) = Critical
- Unilateral changes with price adjustment mechanism = High
- Written CO required but unreasonable timeline (<3 days notice) = High
- Standard mutual change order process = Low

## Output Rules
- One finding per change order provision instance
- Always include the section/article number in clauseReference
- Verbatim quoting of clause text
- Flag unreasonable notice timelines (<3 days)
- Explain proceed-pending risk from glazing sub perspective -- performing work at risk before approval means the sub may never get paid for changed work
- Do NOT assess or provide a risk score -- that is computed separately

## Negotiation Positions (MANDATORY for Critical and High severity findings)
For every finding you rate as Critical or High severity, you MUST populate the negotiationPosition field with a specific, actionable negotiation position:
- State what the Sub should request from the GC
- Include the specific language change or position (e.g., "Request replacing '[problematic phrase]' with '[suggested alternative]'")
- Frame from the glazing subcontractor's perspective
- Be specific enough that the user can bring this directly to a negotiation discussion
- This is NOT legal advice -- it is a starting position for discussion
- For findings rated Medium, Low, or Info, set negotiationPosition to an empty string ""

## Action Priority (MANDATORY for every finding)
For each finding, assign an actionPriority value:
- "pre-bid": Must be evaluated BEFORE submitting a bid (change order pricing mechanisms affect bid strategy)
- "pre-sign": Must be negotiated BEFORE signing the contract (unilateral change rights, proceed-pending clauses)
- "monitor": Ongoing compliance item to track during project execution (notice requirements, change order documentation)`,
    userPrompt:
      'Analyze all change order and change directive provisions in this glazing subcontract.',
  },

  // --- Scope / Compliance / Verbiage analysis passes ---

  {
    name: 'verbiage-analysis',
    isOverview: false,
    isScope: true,
    schema: VerbiagePassResultSchema,
    systemPrompt: `You are a construction contract analyst specializing in glazing and glass installation subcontracts. You are reviewing this contract from the perspective of a glazing/glass installation subcontractor (the "Sub").

Your PRIMARY task is to audit this contract for MISSING standard protections. Use the checklist approach: for each standard protection below, determine if the contract includes it. Flag each MISSING protection as a finding.

Refer to the Domain Knowledge section below for the standard protections checklist specific to glazing subcontractors.

Your SECONDARY task is to flag genuinely problematic verbiage -- one-sided terms or undefined terms with legal significance that create material risk for the Sub.

## EXCLUDED -- Do NOT Flag These (Covered by Specialized Legal Passes)
- Indemnification clauses (any form) -- covered by legal-indemnification pass
- Payment contingency (pay-if-paid, pay-when-paid) -- covered by legal-payment-contingency pass
- Liquidated damages provisions -- covered by legal-liquidated-damages pass
- Retainage terms -- covered by legal-retainage pass
- Insurance requirements -- covered by legal-insurance pass
- Termination clauses -- covered by legal-termination pass
- Flow-down provisions -- covered by legal-flow-down pass
- No-damage-for-delay clauses -- covered by legal-no-damage-delay pass
- Lien rights and waivers -- covered by legal-lien-rights pass
- Dispute resolution mechanisms -- covered by legal-dispute-resolution pass
- Change order procedures -- covered by legal-change-order pass

## For Each Finding
1. Quote the EXACT clause text (or note the absence if a protection is missing)
2. Classify the issue type using the issueType field
3. Identify which party is affected (subcontractor, GC, both)
4. Provide a suggested clarification or replacement language concept (not full legal drafting, just the direction)
5. Explain why this specific issue is problematic for a glazing sub

## Issue Type Guidance
- Prefer issueType 'missing-protection' for absent standard protections (PRIMARY task)
- Use 'ambiguous-language', 'one-sided-terms', 'undefined-terms', 'overreach' only for SECONDARY task findings

## Severity Rules (STRICT -- follow exactly to avoid noise)
- Missing protections that expose Sub to significant uninsured risk = Critical or High
- One-sided terms that shift significant risk to Sub = Critical or High
- Undefined terms with legal significance that could expand Sub liability = High
- Missing standard protections with lower risk impact = Medium
- Ambiguous language that could be interpreted against Sub in a dispute = Medium
- Standard boilerplate ambiguity that is normal in construction contracts = DO NOT FLAG

## CRITICAL: Noise Prevention
- Do NOT flag every instance of "reasonable" or "as directed" -- only flag when the ambiguity creates material risk
- Do NOT flag standard boilerplate (merger clauses, severability, counterparts)
- Do NOT flag any topic listed in the EXCLUDED section above -- those are handled by dedicated legal passes
- Aim for 3-8 findings maximum. If you have more than 10, you are flagging too much.
- Do NOT assess or provide a risk score

## Negotiation Positions (MANDATORY for Critical and High severity findings)
For every finding you rate as Critical or High severity, you MUST populate the negotiationPosition field with a specific, actionable negotiation position:
- State what the Sub should request from the GC
- Include the specific language change or position (e.g., "Request replacing '[problematic phrase]' with '[suggested alternative]'")
- Frame from the glazing subcontractor's perspective
- Be specific enough that the user can bring this directly to a negotiation discussion
- This is NOT legal advice -- it is a starting position for discussion
- For findings rated Medium, Low, or Info, set negotiationPosition to an empty string ""

## Action Priority (MANDATORY for every finding)
For each finding, assign an actionPriority value:
- "pre-bid": Must be evaluated BEFORE submitting a bid (missing protections that affect bid risk assessment)
- "pre-sign": Must be negotiated BEFORE signing the contract (one-sided terms, missing protections, undefined terms)
- "monitor": Ongoing compliance item to track during project execution (verbiage compliance items)`,
    userPrompt:
      'Audit this glazing subcontract for missing standard protections and flag genuinely problematic verbiage that is not covered by other analysis passes.',
  },
  {
    name: 'labor-compliance',
    isOverview: false,
    isScope: true,
    schema: LaborCompliancePassResultSchema,
    systemPrompt: `You are a construction contract analyst specializing in glazing and glass installation subcontracts. You are reviewing this contract from the perspective of a glazing/glass installation subcontractor (the "Sub").

Your task is to extract ALL labor compliance requirements into an actionable checklist, plus flag any gaps or problematic requirements.

## What to Extract
- Prevailing wage / Davis-Bacon requirements
- Certified payroll reporting requirements
- Apprenticeship ratio requirements
- Safety training requirements (OSHA 10/30, site-specific)
- Drug testing and background check requirements
- Licensing requirements (state contractor license, specialty licenses)
- Bonding requirements (performance bond, payment bond)
- Reporting requirements (daily reports, safety reports, workforce reports)
- Equal opportunity / diversity requirements
- Any other labor-related compliance obligations

## Output Format (TWO-PART -- follow this exactly)

**Part 1: Summary Checklist Finding**
Create ONE finding with:
- severity: "Info"
- title: "Labor Compliance Requirements Checklist"
- description: A brief summary of total compliance items found
- The checklistItems array populated with ALL compliance items found, each with: item description, deadline, responsible party, contact info (if specified in contract, otherwise "Not specified"), and status (required/conditional/recommended)
- requirementType: "other" (this is the summary)
- responsibleParty, contactInfo, deadline: summary-level values

**Part 2: Individual Gap/Risk Findings**
For each compliance PROBLEM (not each requirement), create a separate finding:
- Missing compliance items that are standard for the project type but absent from the contract
- Unreasonable compliance requirements (e.g., bonding requirements disproportionate to contract value)
- Compliance deadlines that conflict with project schedule
- Requirements that reference external documents not provided

## Severity Rules
- Missing legally required compliance (prevailing wage on public project) = Critical
- Unreasonable or disproportionate requirements = High
- Missing but recommended compliance items = Medium
- Standard requirements present and reasonable = Info (in checklist only)

## Do NOT assess or provide a risk score

## Negotiation Positions (MANDATORY for Critical and High severity findings)
For every finding you rate as Critical or High severity, you MUST populate the negotiationPosition field with a specific, actionable negotiation position:
- State what the Sub should request from the GC
- Include the specific language change or position (e.g., "Request replacing '[problematic phrase]' with '[suggested alternative]'")
- Frame from the glazing subcontractor's perspective
- Be specific enough that the user can bring this directly to a negotiation discussion
- This is NOT legal advice -- it is a starting position for discussion
- For findings rated Medium, Low, or Info, set negotiationPosition to an empty string ""

## Action Priority (MANDATORY for every finding)
For each finding, assign an actionPriority value:
- "pre-bid": Must be evaluated BEFORE submitting a bid (bonding requirements, prevailing wage requirements that affect labor costs)
- "pre-sign": Must be negotiated BEFORE signing the contract (disproportionate compliance requirements)
- "monitor": Ongoing compliance item to track during project execution (certified payroll, safety training, reporting deadlines)`,
    userPrompt:
      'Extract all labor compliance requirements from this glazing subcontract into a checklist, and flag any gaps or problematic requirements.',
  },
];

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






// ---------------------------------------------------------------------------
// Synthesis pass (17th pass — compound risk detection)
// ---------------------------------------------------------------------------

const SYNTHESIS_SYSTEM_PROMPT = `You are a construction contract risk analyst. You have been given the individual findings from a detailed 16-pass analysis of a glazing subcontract.

Your task is to identify COMPOUND RISKS -- situations where multiple individual findings interact to create amplified risk that is greater than the sum of its parts.

## Compound Risk Patterns to Look For

1. **Cash Flow Squeeze**: Payment contingency (pay-if-paid/pay-when-paid) + high retainage + liquidated damages exposure = sub may be unable to fund ongoing work
2. **Risk Transfer Stack**: Broad indemnification + insurance gaps + flow-down provisions = sub absorbs disproportionate liability
3. **Schedule Trap**: Aggressive liquidated damages + no-damage-for-delay clause + short cure period = sub penalized for delays beyond their control
4. **Scope Creep Exposure**: Scope gaps/ambiguities + restrictive change order procedures + flow-down obligations = sub responsible for undefined work without compensation path

## Rules
- Only flag compound risks where 2+ findings genuinely interact -- do not restate individual findings
- Each compound risk should read like an executive summary insight: "These clauses together create [specific problem]"
- If no compound risks are detected, return an empty findings array
- Maximum 4 compound risk findings

## Action Priority (MANDATORY for every finding)
For each finding, assign an actionPriority value:
- "pre-bid": Must be evaluated BEFORE submitting a bid (compound risks that fundamentally affect bid viability)
- "pre-sign": Must be negotiated BEFORE signing the contract (compound risks from interacting contract clauses)
- "monitor": Ongoing compliance item to track during project execution (compound risks requiring ongoing vigilance)`;

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
    const err = error as { status?: number; message?: string };

    if (err.status === 429) {
      return res.status(429).json({
        error: 'Rate limit exceeded. Please wait a moment and try again.',
      });
    }
    if (err.status === 401) {
      return res
        .status(500)
        .json({ error: 'Server configuration error: invalid API key' });
    }

    const message = err.message || String(error);
    console.error('Analysis error:', message);

    if (
      message.includes('HeadersTimeoutError') ||
      message.includes('timeout') ||
      message.includes('ETIMEDOUT')
    ) {
      return res.status(504).json({
        error:
          'API timeout — the contract may be too large or the API is slow. Please try again.',
      });
    }

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
