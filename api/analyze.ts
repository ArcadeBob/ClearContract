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
import type { LegalMeta, ScopeMeta } from '../src/types/contract';
import { extractText } from 'unpdf';
import { fetch as undiciFetch, Agent } from 'undici';

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

IMPORTANT: negotiationPosition is distinct from recommendation. Recommendation = what to do about it (general guidance). negotiationPosition = what to say to the GC (specific language or position to negotiate).`,
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
- For findings rated Medium, Low, or Info, set negotiationPosition to an empty string ""`,
    userPrompt: 'Extract all dates, deadlines, notice periods, cure periods, payment terms, milestones, submittal deadlines, warranty periods, and time-sensitive obligations from this glazing subcontract.',
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
- For findings rated Medium, Low, or Info, set negotiationPosition to an empty string ""`,
    userPrompt: 'Extract the full scope of work from this glazing subcontract including inclusions, exclusions, specification references, scope rules, ambiguities, and scope gaps.',
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
- For findings rated Medium, Low, or Info, set negotiationPosition to an empty string ""`,
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
- For findings rated Medium, Low, or Info, set negotiationPosition to an empty string ""`,
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
- For findings rated Medium, Low, or Info, set negotiationPosition to an empty string ""`,
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
- For findings rated Medium, Low, or Info, set negotiationPosition to an empty string ""`,
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
- For findings rated Medium, Low, or Info, set negotiationPosition to an empty string ""`,
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
- For findings rated Medium, Low, or Info, set negotiationPosition to an empty string ""`,
    userPrompt:
      'Analyze all termination clauses in this glazing subcontract.',
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
- For findings rated Medium, Low, or Info, set negotiationPosition to an empty string ""`,
    userPrompt:
      'Analyze all flow-down provisions in this glazing subcontract.',
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
- For findings rated Medium, Low, or Info, set negotiationPosition to an empty string ""`,
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
- For findings rated Medium, Low, or Info, set negotiationPosition to an empty string ""`,
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
- For findings rated Medium, Low, or Info, set negotiationPosition to an empty string ""`,
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
- For findings rated Medium, Low, or Info, set negotiationPosition to an empty string ""`,
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

Your task is to flag QUESTIONABLE VERBIAGE -- language that is ambiguous, one-sided, missing standard protections, or uses undefined terms with legal significance.

## What to Flag
- Ambiguous language: "as directed", "to the satisfaction of", "best efforts", "reasonable" without definition, "substantially complete" without criteria
- One-sided terms favoring GC: unilateral rights without reciprocal Sub rights, sole discretion clauses, waiver of rights clauses
- Missing standard protections: no force majeure clause, no limitation of liability, no warranty disclaimer, no safety responsibility limits, no dispute resolution process
- Undefined terms with legal significance: technical terms used without definition that could be interpreted broadly against the Sub
- Overreach clauses: terms that attempt to impose obligations far beyond what is standard for a glazing subcontract

## For Each Verbiage Issue Found
1. Quote the EXACT clause text containing the problematic language
2. Classify the issue type
3. Identify which party is affected (subcontractor, GC, both)
4. Provide a suggested clarification or replacement language concept (not full legal drafting, just the direction)
5. Explain why this specific language is problematic for a glazing sub

## Severity Rules (STRICT -- follow exactly to avoid noise)
- One-sided terms that shift significant risk to Sub = Critical or High
- Undefined terms with legal significance that could expand Sub liability = High
- Missing standard protections (no force majeure, no limitation of liability) = Medium
- Ambiguous language that could be interpreted against Sub in a dispute = Medium
- Standard boilerplate ambiguity that is normal in construction contracts = DO NOT FLAG

## CRITICAL: Noise Prevention
- Do NOT flag every instance of "reasonable" or "as directed" -- only flag when the ambiguity creates material risk
- Do NOT flag standard boilerplate (merger clauses, severability, counterparts)
- Do NOT flag language already analyzed by legal passes (indemnification, payment contingency, LD, etc.)
- Aim for 3-8 findings maximum. If you have more than 10, you are flagging too much.
- Do NOT assess or provide a risk score

## Negotiation Positions (MANDATORY for Critical and High severity findings)
For every finding you rate as Critical or High severity, you MUST populate the negotiationPosition field with a specific, actionable negotiation position:
- State what the Sub should request from the GC
- Include the specific language change or position (e.g., "Request replacing '[problematic phrase]' with '[suggested alternative]'")
- Frame from the glazing subcontractor's perspective
- Be specific enough that the user can bring this directly to a negotiation discussion
- This is NOT legal advice -- it is a starting position for discussion
- For findings rated Medium, Low, or Info, set negotiationPosition to an empty string ""`,
    userPrompt: 'Identify questionable verbiage in this glazing subcontract: ambiguous language, one-sided terms, missing standard protections, undefined terms, and overreach clauses.',
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
- For findings rated Medium, Low, or Info, set negotiationPosition to an empty string ""`,
    userPrompt: 'Extract all labor compliance requirements from this glazing subcontract into a checklist, and flag any gaps or problematic requirements.',
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

  // Use streaming to avoid HeadersTimeoutError — headers are sent immediately
  // via SSE, keeping the connection alive while Claude processes the document.
  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS_PER_PASS,
    betas: BETAS,
    stream: true,
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
  scopeMeta?: ScopeMeta;
  sourcePass?: string;
  negotiationPosition?: string;
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
    negotiationPosition: finding.negotiationPosition as string,
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
    case 'legal-insurance':
      base.legalMeta = {
        clauseType: 'insurance',
        coverageItems: finding.coverageItems as Array<{ coverageType: string; requiredLimit: string; isAboveStandard: boolean }>,
        endorsements: finding.endorsements as Array<{ endorsementType: string; isNonStandard: boolean }>,
        certificateHolder: finding.certificateHolder as string,
      };
      break;
    case 'legal-termination':
      base.legalMeta = {
        clauseType: 'termination',
        terminationType: finding.terminationType as string,
        noticePeriod: finding.noticePeriod as string,
        compensation: finding.compensation as string,
        curePeriod: finding.curePeriod as string,
      };
      break;
    case 'legal-flow-down':
      base.legalMeta = {
        clauseType: 'flow-down',
        flowDownScope: finding.flowDownScope as string,
        problematicObligations: finding.problematicObligations as string[],
        primeContractAvailable: finding.primeContractAvailable as boolean,
      };
      break;
    case 'legal-no-damage-delay':
      base.legalMeta = {
        clauseType: 'no-damage-delay',
        waiverScope: finding.waiverScope as string,
        exceptions: finding.exceptions as string[],
        enforceabilityContext: finding.enforceabilityContext as string,
      };
      break;
    case 'legal-lien-rights':
      base.legalMeta = {
        clauseType: 'lien-rights',
        waiverType: finding.waiverType as string,
        lienFilingDeadline: finding.lienFilingDeadline as string,
        enforceabilityContext: finding.enforceabilityContext as string,
      };
      break;
    case 'legal-dispute-resolution':
      base.legalMeta = {
        clauseType: 'dispute-resolution',
        mechanism: finding.mechanism as string,
        venue: finding.venue as string,
        feeShifting: finding.feeShifting as string,
        mediationRequired: finding.mediationRequired as boolean,
      };
      break;
    case 'legal-change-order':
      base.legalMeta = {
        clauseType: 'change-order',
        changeType: finding.changeType as string,
        noticeRequired: finding.noticeRequired as string,
        pricingMechanism: finding.pricingMechanism as string,
        proceedPending: finding.proceedPending as boolean,
      };
      break;
  }

  return base;
}

// ---------------------------------------------------------------------------
// Convert scope pass findings to unified Finding shape with scopeMeta
// ---------------------------------------------------------------------------

function convertScopeFinding(
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
    negotiationPosition: finding.negotiationPosition as string,
  };

  switch (passName) {
    case 'scope-of-work':
      base.scopeMeta = {
        passType: 'scope-of-work',
        scopeItemType: finding.scopeItemType as string,
        specificationReference: finding.specificationReference as string,
        affectedTrade: finding.affectedTrade as string,
      };
      break;
    case 'dates-deadlines':
      base.scopeMeta = {
        passType: 'dates-deadlines',
        periodType: finding.periodType as string,
        duration: finding.duration as string,
        triggerEvent: finding.triggerEvent as string,
      };
      break;
    case 'verbiage-analysis':
      base.scopeMeta = {
        passType: 'verbiage',
        issueType: finding.issueType as string,
        affectedParty: finding.affectedParty as string,
        suggestedClarification: finding.suggestedClarification as string,
      };
      break;
    case 'labor-compliance':
      base.scopeMeta = {
        passType: 'labor-compliance',
        requirementType: finding.requirementType as string,
        responsibleParty: finding.responsibleParty as string,
        contactInfo: finding.contactInfo as string,
        deadline: finding.deadline as string,
        checklistItems: (finding.checklistItems as Array<Record<string, unknown>> || []).map(item => ({
          item: item.item as string,
          deadline: item.deadline as string,
          responsibleParty: item.responsibleParty as string,
          contactInfo: item.contactInfo as string,
          status: item.status as 'required' | 'conditional' | 'recommended',
        })),
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

      // Convert findings: legal passes get convertLegalFinding, scope passes get convertScopeFinding, others get tagged with sourcePass
      if (passes[i].isLegal) {
        for (const f of result.findings) {
          allFindings.push(convertLegalFinding(f as unknown as Record<string, unknown>, passName));
        }
      } else if (passes[i].isScope) {
        for (const f of result.findings) {
          allFindings.push(convertScopeFinding(f as unknown as Record<string, unknown>, passName));
        }
      } else {
        for (const f of result.findings) {
          allFindings.push({ ...f, sourcePass: passName, negotiationPosition: (f as Record<string, unknown>).negotiationPosition as string | undefined });
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
  // Helper: detect specialized passes (legal or scope) vs general passes
  const isSpecializedPass = (sp: string) =>
    sp.startsWith('legal-') || ['scope-of-work', 'dates-deadlines', 'verbiage-analysis', 'labor-compliance'].includes(sp);

  // Phase 1: clauseReference + category composite key dedup
  // Prefer specialized passes over general passes; among same type, prefer higher severity
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
        const findingIsSpecialized = isSpecializedPass(finding.sourcePass || '');
        const existingIsSpecialized = isSpecializedPass(existing.sourcePass || '');

        if (findingIsSpecialized && !existingIsSpecialized) {
          // Specialized pass beats general pass
          byClauseAndCategory.set(key, finding);
        } else if (!findingIsSpecialized && existingIsSpecialized) {
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
      const findingIsSpecialized = isSpecializedPass(finding.sourcePass || '');
      const existingIsSpecialized = isSpecializedPass(existing.sourcePass || '');

      if (findingIsSpecialized && !existingIsSpecialized) {
        byTitle.set(finding.title, finding);
      } else if (!findingIsSpecialized && existingIsSpecialized) {
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
  let dispatcher: Agent | null = null;

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

    // Use npm undici's fetch for message API calls to control timeouts.
    // Node's built-in fetch uses an internal bundled undici whose headersTimeout
    // cannot be configured via the npm undici Agent (different module instances).
    // However, undici's fetch doesn't support FormData file uploads, so we use
    // a separate client with the default fetch for file uploads.
    dispatcher = new Agent({
      headersTimeout: 0,          // disabled — let SDK AbortController handle timeout
      bodyTimeout: 0,             // disabled — streaming responses can be long
      connectTimeout: 30_000,     // 30s to establish TCP connection
      connections: 20,            // pool size — peak concurrency is 16 parallel API calls
    });
    const customFetch: typeof globalThis.fetch = (input, init) =>
      undiciFetch(input as Parameters<typeof undiciFetch>[0], {
        ...init,
        dispatcher,
      } as Parameters<typeof undiciFetch>[1]) as Promise<Response>;

    // Upload client uses default fetch (supports FormData for file uploads)
    const uploadClient = new Anthropic({
      apiKey,
      timeout: 60 * 1000,
      maxRetries: 0,
    });

    // Message client uses custom undici fetch (configurable timeouts)
    client = new Anthropic({
      apiKey,
      timeout: 280 * 1000,   // 280s — under Vercel maxDuration (300s), allows room for cleanup
      maxRetries: 0,          // Don't retry inside serverless function — wastes budget
      fetch: customFetch,
    });

    // Upload PDF to Files API (or fallback to text extraction)
    console.log(`[analyze] PDF size: ${(pdfBuffer.length / 1024).toFixed(1)}KB, uploading...`);
    const uploadStart = Date.now();
    const prepared = await preparePdfForAnalysis(
      pdfBuffer,
      fileName || 'contract.pdf',
      uploadClient,
    );
    fileId = prepared.fileId;
    console.log(`[analyze] Upload complete in ${((Date.now() - uploadStart) / 1000).toFixed(1)}s, fileId: ${fileId}, fallback: ${prepared.usedFallback}`);

    // Execute all analysis passes in parallel (production allows 300s via
    // vercel.json maxDuration; vercel dev defaults to 120s).
    console.log(`[analyze] Running all ${ANALYSIS_PASSES.length} passes in parallel...`);
    const passStart = Date.now();
    const settledResults = await Promise.allSettled(
      ANALYSIS_PASSES.map((pass) => runAnalysisPass(client!, fileId!, pass)),
    );
    const failed = settledResults.filter(r => r.status === 'rejected').length;
    console.log(`[analyze] All passes done in ${((Date.now() - passStart) / 1000).toFixed(1)}s (${failed} failed)`);

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

    const message = err.message || String(error);
    console.error('Analysis error:', message);

    if (message.includes('HeadersTimeoutError') || message.includes('timeout') || message.includes('ETIMEDOUT')) {
      return res
        .status(504)
        .json({ error: 'API timeout — the contract may be too large or the API is slow. Please try again.' });
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
          cleanupError instanceof Error
            ? cleanupError.message
            : cleanupError,
        );
      }
    }
    // Close the undici Agent to drain its connection pool (prevents socket leaks on warm starts)
    if (dispatcher) {
      dispatcher.close();
    }
  }
}
