# Phase 23: Analysis Quality - Research

**Researched:** 2026-03-14
**Domain:** AI analysis pipeline enhancement (prompt engineering, scoring algorithms, knowledge modules, structured output schemas)
**Confidence:** HIGH

## Summary

Phase 23 enhances the existing 16-pass contract analysis pipeline across six requirements: adding a 17th synthesis pass for compound risk detection, creating 5 new knowledge modules, implementing category-weighted scoring with a tooltip, refocusing the verbiage pass on missing protections, adding module staleness warnings, and fixing bonding bid signal matching to use structured metadata.

All changes are backend/API-layer modifications to `api/analyze.ts`, `api/scoring.ts`, `api/merge.ts`, knowledge modules in `src/knowledge/`, and `src/utils/bidSignal.ts`, with one small UI addition (risk score tooltip). The existing architecture -- parallel Claude API calls, Zod structured output schemas, knowledge module registry, merge/dedup pipeline -- is well-established and all changes extend existing patterns rather than introducing new ones.

**Primary recommendation:** Implement in waves -- (1) knowledge modules + staleness system, (2) scoring + bid signal fixes, (3) verbiage pass refocus, (4) synthesis pass -- because the synthesis pass depends on findings quality improvements from earlier waves.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- 17th synthesis pass runs as Claude API call AFTER all 16 passes complete and findings are deduplicated
- Receives all deduplicated findings as input, identifies compound risks spanning multiple clause types
- Creates DISTINCT NEW findings (not annotations on existing findings)
- Synthesis findings use High severity, "Compound Risk" category, EXCLUDED from risk score and tooltip
- Category-weighted scoring: legal/financial at 1.0x, scope/compliance at 0.75x
- Severity base weights retained: Critical=25, High=15, Medium=8, Low=3, Info=0
- Synthetic error findings (pass failures) excluded from score computation
- Risk score tooltip on hover shows category breakdown
- 4 new CA knowledge modules: insurance law, public works payment, dispute resolution statutes, liquidated damages law
- 1 new trade knowledge module: glazing sub protections (for verbiage pass)
- Universal staleness warning system with effectiveDate and expirationDate metadata
- Stale modules generate Info-severity findings
- ca-title24 updated to 2025 code cycle
- matchesBonding() fixed to use structured metadata fields instead of text search
- Verbiage pass refocused on missing standard protections via prompt update and knowledge module injection
- Keep existing issueType enum, shift emphasis from ambiguous-language toward missing-protection

### Claude's Discretion
- Exact compound risk patterns for synthesis pass to detect
- Synthesis pass schema design and finding format
- Knowledge module token budget and content depth (within 10000 cap)
- How to surface bonding structured metadata (clauseType vs legalMeta extension)
- Staleness expiration intervals per module
- Score tooltip layout and formatting
- Title 24 content update details for 2025 code cycle

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PIPE-01 | Cross-pass synthesis pass detects compound risks after all 16 passes complete | Synthesis pass architecture: new Zod schema, 17th API call after mergePassResults dedup, new "Compound Risk" category, exclusion flag on findings |
| PIPE-02 | 3-4 new CA knowledge modules added to currently-empty passes | Knowledge module pattern established; 4 CA regulatory modules + 1 trade module; registry assignments to empty passes documented |
| PIPE-03 | Risk score uses category-weighted formula; synthetic error findings excluded | computeRiskScore() modification with category mapping, error finding detection via sourcePass title pattern |
| PIPE-04 | Verbiage analysis pass refocused on missing standard protections | Prompt rewrite + glazing-sub-protections knowledge module injection; existing issueType enum already has 'missing-protection' |
| PIPE-05 | ca-title24 updated to 2025 code cycle; module staleness warning system | KnowledgeModule type extension with expirationDate; staleness check in merge or post-merge; Title 24 content update |
| PIPE-06 | Bid signal match functions use structured metadata fields instead of text search | matchesBonding() uses legalMeta.clauseType or scopeMeta field; consistent with matchesInsurance/Payment/Retainage patterns |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zod | existing | Structured output schemas for synthesis pass | Already used for all 16 pass schemas |
| @anthropic-ai/sdk | existing | Claude API call for synthesis pass | Already used for all passes |
| zod-to-json-schema | existing | Convert Zod to JSON Schema for Anthropic structured output | Already used in zodToOutputFormat() |

### Supporting
No new libraries needed. All changes use existing dependencies.

## Architecture Patterns

### Knowledge Module Pattern (Established)
```
src/knowledge/
├── types.ts              # KnowledgeModule interface (add expirationDate)
├── registry.ts           # PASS_KNOWLEDGE_MAP + registerModule()
├── tokenBudget.ts        # TOKEN_CAP_PER_MODULE = 10000, MAX_MODULES_PER_PASS = 4
├── index.ts              # composeSystemPrompt() with domain knowledge injection
├── regulatory/
│   ├── index.ts          # registerModule() calls
│   ├── ca-lien-law.ts    # Example: ~400 tokens
│   ├── ca-title24.ts     # Update content for 2025 cycle
│   └── ...new modules...
└── trade/
    └── ...new module...
```

**Pattern for new modules:**
```typescript
// Source: src/knowledge/regulatory/ca-lien-law.ts (existing pattern)
import type { KnowledgeModule } from '../types';

const content = `MODULE CONTENT HERE...`;

export const moduleName: KnowledgeModule = {
  id: 'module-id',
  domain: 'regulatory',  // or 'trade'
  title: 'Human Readable Title',
  effectiveDate: '2025-01-01',
  reviewByDate: '2028-01-01',
  // NEW: expirationDate for staleness system
  content,
  tokenEstimate: Math.ceil(content.length / 4),
};
```

### Registry Assignment Pattern
```typescript
// Source: src/knowledge/registry.ts (existing)
export const PASS_KNOWLEDGE_MAP: Record<string, string[]> = {
  'legal-insurance': [],           // ADD: 'ca-insurance-law'
  'legal-payment-contingency': ['ca-lien-law'],  // ADD: 'ca-public-works-payment'
  'legal-retainage': [],           // ADD: 'ca-public-works-payment'
  'legal-dispute-resolution': [],  // ADD: 'ca-dispute-resolution'
  'legal-liquidated-damages': [],  // ADD: 'ca-liquidated-damages'
  'verbiage-analysis': [],         // ADD: 'glazing-sub-protections'
};
```

**Capacity check:** No pass currently at MAX_MODULES_PER_PASS (4) except scope-of-work. All target passes have 0 or 1 modules, so adding 1 module each is safe.

### Synthesis Pass Architecture

The synthesis pass runs AFTER all 16 passes and deduplication:

```
16 parallel passes -> Promise.allSettled -> mergePassResults (dedup) -> synthesis pass -> append findings
```

**Integration point in api/analyze.ts (lines 1200-1232):**
```typescript
// Current flow:
const settledResults = await Promise.allSettled(...);
const merged = mergePassResults(settledResults, ANALYSIS_PASSES);
const findingsWithIds = merged.findings.map(...);
const bidSignal = computeBidSignal(...);

// New flow (insert synthesis between merge and ID assignment):
const settledResults = await Promise.allSettled(...);
const merged = mergePassResults(settledResults, ANALYSIS_PASSES);
// NEW: Run synthesis pass with deduplicated findings
const synthFindings = await runSynthesisPass(client!, merged.findings);
// Append synthesis findings (they carry isSynthesis: true)
merged.findings.push(...synthFindings);
const findingsWithIds = merged.findings.map(...);
const bidSignal = computeBidSignal(...);  // synthesis excluded internally
```

**Synthesis pass schema needs:**
- New Zod schema (SynthesisPassResultSchema)
- Category: "Compound Risk" (needs adding to CATEGORIES in types/contract.ts)
- Fields: severity (always High), title, description, recommendation, constituentFindings (titles of related findings), clauseReference (N/A or compound)
- No clauseText (synthesis findings don't reference specific clauses)
- isSynthesis flag on UnifiedFinding for exclusion from scoring/tooltip

### Category-Weighted Scoring

**Current scoring in api/scoring.ts:**
```typescript
// Flat: just severity weights
const rawScore = findings.reduce((sum, f) => sum + SEVERITY_WEIGHTS[f.severity], 0);
return Math.min(100, Math.max(0, Math.round(50 * Math.log2(1 + rawScore / 25))));
```

**New scoring needs:**
```typescript
// Category weight tiers
const CATEGORY_WEIGHTS: Record<string, number> = {
  'Legal Issues': 1.0,
  'Financial Terms': 1.0,
  'Insurance Requirements': 1.0,
  'Risk Assessment': 1.0,
  'Scope of Work': 0.75,
  'Contract Compliance': 0.75,
  'Labor Compliance': 0.75,
  'Important Dates': 0.75,
  'Technical Standards': 0.75,
  'Compound Risk': 0,  // Excluded
};

// Exclude synthetic error findings and synthesis findings
// Error findings: title starts with "Analysis Pass Failed:"
// Synthesis findings: category === 'Compound Risk' OR isSynthesis flag
```

**Tooltip data:** computeRiskScore should return a breakdown object alongside the score:
```typescript
interface ScoreBreakdown {
  score: number;
  categories: Array<{ name: string; points: number }>;
}
```

### Bonding Metadata Fix (PIPE-06)

**Current matchesBonding() (broken -- text search):**
```typescript
function matchesBonding(f: Finding): boolean {
  return f.title.toLowerCase().includes('bond') || f.description.toLowerCase().includes('bond');
}
```

**Other factors use structured fields (correct pattern):**
- matchesInsurance: `f.category === 'Insurance Requirements'`
- matchesPayment: `f.sourcePass === 'legal-payment-contingency'`
- matchesRetainage: `f.sourcePass === 'legal-retainage'`

**Fix options (Claude's discretion per CONTEXT.md):**
1. **Use legalMeta.clauseType** -- bonding findings don't currently have their own pass, so no legalMeta is set. Would require the labor-compliance pass (which handles bonding via requirementType: 'bonding') to set metadata.
2. **Use sourcePass + scopeMeta.requirementType** -- `f.sourcePass === 'labor-compliance' && f.scopeMeta?.requirementType === 'bonding'` -- consistent with how labor compliance already tags bonding.
3. **Use sourcePass + category combo** -- less precise but simpler.

**Recommendation:** Option 2 is most consistent. The labor-compliance pass already populates `requirementType: 'bonding'` for bonding findings, and `scopeMeta` is already set by `convertScopeFinding()`. Also check `risk-overview` pass which may surface bonding findings via company profile comparison -- those would have `sourcePass: 'risk-overview'` and could be caught by checking if `f.title` or `f.description` contains "bond" as a fallback for the overview pass only. Alternatively, extend to also check the `downgradedFrom` field presence which indicates a company profile comparison bonding finding.

### Verbiage Pass Refocus

**Current verbiage pass prompt (api/analyze.ts lines 890-936):** Focuses on ambiguous language, one-sided terms, missing protections, undefined terms, overreach. Already has "Do NOT flag language already analyzed by legal passes" but it's a single line buried in noise prevention.

**Refocused prompt strategy:**
1. Lead with the checklist approach: "Your primary task is to audit for MISSING standard protections"
2. Inject `glazing-sub-protections` knowledge module with the checklist (force majeure, limitation of liability, warranty disclaimer, right to cure, notice provisions, weather delay, material escalation)
3. Strengthen dedup instructions: explicitly list the clause types covered by legal passes
4. Existing issueType enum already includes 'missing-protection' -- shift the emphasis in the prompt

### Staleness Warning System

**KnowledgeModule type extension:**
```typescript
export interface KnowledgeModule {
  id: string;
  domain: 'regulatory' | 'trade' | 'standards';
  title: string;
  effectiveDate: string;
  expirationDate: string;  // NEW: when module content should be reviewed
  reviewByDate: string;    // EXISTING: can repurpose or keep both
  content: string;
  tokenEstimate: number;
}
```

**Decision:** The existing `reviewByDate` field already exists on all modules. The CONTEXT.md specifies `expirationDate` as new. Options:
- Add `expirationDate` alongside `reviewByDate` (redundant but matches CONTEXT.md exactly)
- Rename `reviewByDate` to `expirationDate` (breaking change on all existing modules)
- Use `reviewByDate` AS the expiration date (semantically close enough)

**Recommendation:** Add `expirationDate` as a new required field. Update all existing modules to include it. Use `expirationDate` for staleness checks; keep `reviewByDate` for backward compatibility and human reference.

**Staleness check location:** Run in `composeSystemPrompt()` or as a post-merge step. Post-merge is better because it can inject Info-level findings into the merged results rather than cluttering the prompt.

**Staleness check logic:**
```typescript
function checkModuleStaleness(modules: KnowledgeModule[]): UnifiedFinding[] {
  const now = new Date();
  return modules
    .filter(m => new Date(m.expirationDate) < now)
    .map(m => ({
      severity: 'Info',
      category: 'Risk Assessment',
      title: `Knowledge Module Outdated: ${m.title}`,
      description: `The ${m.title} module (effective ${m.effectiveDate}) expired on ${m.expirationDate}. Findings derived from this module should be verified against current statutes.`,
      recommendation: 'Verify findings from this module against current law before relying on them.',
      clauseReference: 'N/A',
      sourcePass: 'staleness-check',
    }));
}
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Schema validation | Manual JSON parsing | Zod + zodToJsonSchema + Anthropic structured output | Already established; structured output guarantees valid JSON |
| Token counting | Custom tokenizer | `Math.ceil(content.length / 4)` estimate | Already used; accurate enough for budget enforcement |
| Finding deduplication | New dedup logic for synthesis | Existing mergePassResults dedup | Synthesis findings are NEW and distinct; no dedup needed for them |

## Common Pitfalls

### Pitfall 1: Token Budget Overflow on Knowledge Modules
**What goes wrong:** New knowledge modules exceed TOKEN_CAP_PER_MODULE (10000) or a pass exceeds MAX_MODULES_PER_PASS (4).
**Why it happens:** Writing comprehensive legal content without checking character count. 10000 tokens ~ 40000 characters.
**How to avoid:** Keep each module under ~35000 characters. Check capacity: no target pass currently has more than 1 module, so adding 1 each is safe.
**Warning signs:** `validateTokenBudget()` throws at startup.

### Pitfall 2: Synthesis Pass Timeout
**What goes wrong:** The synthesis pass adds latency to the already-heavy 16-pass pipeline (which runs under a 300s Vercel timeout).
**Why it happens:** 16 passes run in parallel (~20-30s), but synthesis is sequential.
**How to avoid:** Keep synthesis prompt concise. Use max_tokens=4096 (not 8192). The input is finding summaries, not the full contract.
**Warning signs:** 504 timeout errors on large contracts.

### Pitfall 3: Synthesis Findings Leaking into Score
**What goes wrong:** Synthesis findings inflate the risk score or bid signal.
**Why it happens:** Forgetting to exclude them in computeRiskScore() and computeBidSignal().
**How to avoid:** Use a clear exclusion mechanism: `isSynthesis` flag on UnifiedFinding, or category === 'Compound Risk'. Check both scoring paths.
**Warning signs:** Risk scores jump significantly after synthesis pass is added.

### Pitfall 4: Error Findings Still Affecting Score
**What goes wrong:** Pass failure findings (severity: Critical, title: "Analysis Pass Failed: ...") inflate the score.
**Why it happens:** They're regular findings in the array with Critical severity (25 points each).
**How to avoid:** Detect by title prefix `Analysis Pass Failed:` or add an `isSyntheticError` flag when creating them in mergePassResults().
**Warning signs:** Contracts with failed passes score higher than contracts where all passes succeed.

### Pitfall 5: Category Not in CATEGORIES Tuple
**What goes wrong:** Adding "Compound Risk" category but forgetting to update the CATEGORIES const in types/contract.ts.
**Why it happens:** The Category type is derived from the CATEGORIES tuple.
**How to avoid:** Add 'Compound Risk' to CATEGORIES array. Also update CategoryEnum in Zod schemas.
**Warning signs:** TypeScript compilation errors, Zod validation rejecting synthesis findings.

### Pitfall 6: Verbiage Pass Still Producing Legal Duplicates
**What goes wrong:** Even after prompt update, Claude still flags legal issues the legal passes cover.
**Why it happens:** LLMs don't perfectly follow exclusion instructions.
**How to avoid:** The existing dedup in mergePassResults already handles this -- specialized passes win over verbiage-analysis. But also strengthen the prompt exclusion list.
**Warning signs:** Duplicate findings with same clauseReference from verbiage and legal passes.

## Code Examples

### New Knowledge Module (Pattern)
```typescript
// Source: established pattern from src/knowledge/regulatory/ca-lien-law.ts
import type { KnowledgeModule } from '../types';

const content = `CA INSURANCE LAW FOR GLAZING SUBCONTRACTORS
...content within 35000 char limit...`;

export const caInsuranceLaw: KnowledgeModule = {
  id: 'ca-insurance-law',
  domain: 'regulatory',
  title: 'California Insurance Law for Construction Subcontractors',
  effectiveDate: '2025-01-01',
  expirationDate: '2027-01-01',
  reviewByDate: '2026-12-01',
  content,
  tokenEstimate: Math.ceil(content.length / 4),
};
```

### Synthesis Pass Schema
```typescript
// New file: src/schemas/synthesisAnalysis.ts
import { z } from 'zod';
import { SEVERITIES } from '../types/contract';

export const SynthesisFindingSchema = z.object({
  severity: z.literal('High'),
  title: z.string(),
  description: z.string(),
  recommendation: z.string(),
  constituentFindings: z.array(z.string()), // titles of related findings
});

export const SynthesisPassResultSchema = z.object({
  findings: z.array(SynthesisFindingSchema),
});
```

### Category-Weighted computeRiskScore
```typescript
// Updated api/scoring.ts
const CATEGORY_WEIGHTS: Record<string, number> = {
  'Legal Issues': 1.0,
  'Financial Terms': 1.0,
  'Insurance Requirements': 1.0,
  'Risk Assessment': 1.0,
  'Scope of Work': 0.75,
  'Contract Compliance': 0.75,
  'Labor Compliance': 0.75,
  'Important Dates': 0.75,
  'Technical Standards': 0.75,
  'Compound Risk': 0,
};

interface ScoreBreakdown {
  score: number;
  categories: Array<{ name: string; points: number }>;
}

export function computeRiskScore(
  findings: Array<{ severity: string; category: string; title: string }>
): ScoreBreakdown {
  const categoryPoints = new Map<string, number>();

  for (const f of findings) {
    // Exclude synthetic error findings
    if (f.title.startsWith('Analysis Pass Failed:')) continue;
    const catWeight = CATEGORY_WEIGHTS[f.category] ?? 0.75;
    if (catWeight === 0) continue; // Compound Risk excluded
    const sevWeight = SEVERITY_WEIGHTS[f.severity] || 0;
    const points = sevWeight * catWeight;
    categoryPoints.set(f.category, (categoryPoints.get(f.category) || 0) + points);
  }

  const rawScore = Array.from(categoryPoints.values()).reduce((a, b) => a + b, 0);
  const score = Math.min(100, Math.max(0, Math.round(50 * Math.log2(1 + rawScore / 25))));

  const categories = Array.from(categoryPoints.entries())
    .map(([name, points]) => ({ name, points: Math.round(points * 10) / 10 }))
    .filter(c => c.points > 0)
    .sort((a, b) => b.points - a.points);

  return { score, categories };
}
```

### matchesBonding Fix
```typescript
// Updated src/utils/bidSignal.ts
function matchesBonding(f: Finding): boolean {
  // Labor compliance pass tags bonding findings via scopeMeta.requirementType
  if (f.sourcePass === 'labor-compliance' && f.scopeMeta?.passType === 'labor-compliance') {
    const meta = f.scopeMeta as { requirementType?: string };
    if (meta.requirementType === 'bonding') return true;
  }
  // Risk overview may surface bonding via company profile comparison
  if (f.sourcePass === 'risk-overview' && f.downgradedFrom != null) {
    // Company profile bonding findings are downgraded; check category
    if (f.category === 'Financial Terms' || f.category === 'Contract Compliance') {
      // Fallback: check structured fields when available
      return f.title.toLowerCase().includes('bond');
    }
  }
  return false;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Flat severity scoring | Category-weighted scoring (this phase) | Phase 23 | More nuanced risk differentiation |
| Text-based bonding detection | Structured metadata matching (this phase) | Phase 23 | Eliminates false positives from "bond" in unrelated text |
| Single-pass analysis | 16 parallel passes (existing) + synthesis | Phase 23 adds synthesis | Compound risk detection across clause types |

## Open Questions

1. **Compound Risk Patterns to Detect**
   - What we know: User examples include "Cash Flow Squeeze: Payment contingency + retainage + LD combined"
   - What's unclear: Full list of patterns. Recommended patterns: (1) Cash flow squeeze (payment + retainage + LD), (2) Risk transfer stack (broad indemnity + insurance gaps + flow-down), (3) Schedule trap (aggressive LD + no-damage-delay + short cure), (4) Scope creep risk (scope gaps + change order limitations + flow-down)
   - Recommendation: Hardcode 4-5 pattern descriptions in the synthesis prompt; let Claude identify if the findings match

2. **Title 24 2025 Code Cycle Content**
   - What we know: 2025 cycle takes effect Jan 1, 2026, ~30% more restrictive (per existing module)
   - What's unclear: Exact prescriptive values for 2025 cycle (U-factor, SHGC changes per climate zone)
   - Recommendation: Update with known directional changes; flag as MEDIUM confidence content that should be verified against published CEC standards

3. **Synthesis Pass Input Format**
   - What we know: Receives deduplicated findings after mergePassResults
   - What's unclear: How much of each finding to send (full clauseText would be very long)
   - Recommendation: Send title + severity + category + description only (skip clauseText, explanation, metadata) to keep within token limits

4. **Tooltip Component Location**
   - What we know: Risk score displayed inline in ContractReview.tsx (line 388-390), Dashboard.tsx, ContractCard.tsx
   - What's unclear: Whether tooltip appears everywhere or only on ContractReview
   - Recommendation: Create a reusable `<RiskScoreDisplay>` component with tooltip, use it in ContractReview only initially

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None configured (per CLAUDE.md) |
| Config file | none |
| Quick run command | `npm run build` (type checking via tsc) |
| Full suite command | `npm run build && npm run lint` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PIPE-01 | Synthesis pass produces compound risk findings | manual-only | Manual: upload contract, verify synthesis findings appear | N/A -- no test framework |
| PIPE-02 | New knowledge modules registered and injected | build | `npm run build` (type errors if module shape wrong) | N/A |
| PIPE-03 | Category-weighted scoring excludes errors | manual-only | Manual: upload contract with pass failures, verify score | N/A |
| PIPE-04 | Verbiage pass focused on missing protections | manual-only | Manual: upload contract, check verbiage findings | N/A |
| PIPE-05 | Staleness warnings appear for expired modules | manual-only | Manual: set expirationDate to past date, verify Info finding | N/A |
| PIPE-06 | matchesBonding uses structured metadata | manual-only | Manual: upload contract with bonding requirements, verify bid signal | N/A |

### Sampling Rate
- **Per task commit:** `npm run build`
- **Per wave merge:** `npm run build && npm run lint`
- **Phase gate:** Build + lint green, manual UAT with real contract

### Wave 0 Gaps
None -- no test framework is configured for this project, and adding one is out of scope for this phase. TypeScript compilation (`npm run build`) serves as the primary automated validation.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `api/scoring.ts`, `api/merge.ts`, `api/analyze.ts`, `src/utils/bidSignal.ts`, `src/knowledge/registry.ts`, `src/knowledge/types.ts`, `src/types/contract.ts`, `src/schemas/analysis.ts`, `src/schemas/scopeComplianceAnalysis.ts`
- Existing knowledge module pattern: `src/knowledge/regulatory/ca-lien-law.ts`, `src/knowledge/regulatory/ca-title24.ts`

### Secondary (MEDIUM confidence)
- CA Title 24 2025 code cycle details (directional from existing module content, not verified against CEC published standards)

### Tertiary (LOW confidence)
- Specific CA statute content for new knowledge modules (CIC 11580+, CCP 1281+, CC 1671) -- content accuracy depends on implementation research at writing time

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all changes use existing libraries and patterns
- Architecture: HIGH - well-understood codebase with clear integration points
- Pitfalls: HIGH - identified from direct code analysis
- Knowledge module content accuracy: MEDIUM - legal content will need careful drafting

**Research date:** 2026-03-14
**Valid until:** 2026-04-14 (stable -- no external dependency changes expected)
