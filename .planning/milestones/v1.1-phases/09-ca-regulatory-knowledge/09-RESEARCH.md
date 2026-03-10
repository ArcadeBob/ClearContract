# Phase 9: CA Regulatory Knowledge - Research

**Researched:** 2026-03-09
**Domain:** California construction regulatory law, knowledge module content authoring, post-processing severity enforcement
**Confidence:** HIGH

## Summary

Phase 9 creates four California-specific regulatory knowledge modules and a post-processing severity guard. The existing knowledge architecture (Phase 7) provides all infrastructure: `KnowledgeModule` type, `registerModule()`, `PASS_KNOWLEDGE_MAP`, `composeSystemPrompt()`, and `validateTokenBudget()`. The `src/knowledge/regulatory/` directory exists but is empty -- ready for content.

The work is purely content creation (TypeScript module files with legal/regulatory text) plus one server-side post-processing function. No new dependencies, no UI changes, no schema changes. The main risk is regulatory accuracy -- statute references, deadlines, and penalty amounts must be correct since this tool is used for actual contract review.

**Primary recommendation:** Write each knowledge module as a standalone TypeScript file exporting a `KnowledgeModule` object, register modules in a barrel `index.ts`, populate `PASS_KNOWLEDGE_MAP` entries, and add the severity guard function in `api/analyze.ts` between deduplication and risk score computation.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- 4 separate knowledge modules in `src/knowledge/regulatory/`: `ca-lien-law.ts`, `ca-prevailing-wage.ts`, `ca-title24.ts`, `ca-calosha.ts`
- Each module under 1,500 token cap
- Void-by-law statutes (CC 8814, CC 2782, CC 8122) embedded in topic modules, not a separate contract-law module
- Pass mapping: ca-lien-law -> legal-lien-rights, legal-indemnification, legal-payment-contingency; ca-prevailing-wage -> labor-compliance; ca-title24 -> scope-of-work; ca-calosha -> labor-compliance
- Severity override: prompt instruction + post-processing guard (belt and suspenders)
- Post-processing guard scans findings for statute reference string matching (CC 8814, CC 2782, CC 8122) in clauseText or explanation
- Silent upgrade to Critical -- no `upgradedFrom` field
- Display only -- upgraded severity shows as Critical badge, but original severity weight used for risk score calculation
- Public works detection: AI detection within labor compliance pass -- no separate detection step
- Title 24: glazing-specific requirements (U-factor, SHGC by climate zone, fenestration limits, current code cycle references)
- Cal/OSHA: glazing-specific hazards (fall protection, glass handling, overhead work, scaffold requirements) with Title 8 section references
- Lien law: specific CA deadlines, stop notice procedures, anti-waiver provisions (CC 8122), penalty amounts with reviewByDate
- Prevailing wage: current penalty amounts with effective date, DIR registration, apprenticeship thresholds, reviewByDate

### Claude's Discretion
- Exact content wording within each knowledge module (within the constraints above)
- Token optimization -- how to pack maximum useful info under 1,500 tokens per module
- Which specific Title 8 sections to reference for Cal/OSHA
- Climate zone groupings for Title 24 (individual zones vs zone ranges)
- Post-processing guard implementation details (where in api/analyze.ts, exact regex patterns)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CAREG-01 | Lien Rights pass receives CA mechanics lien law knowledge (prelim notice, recording deadlines, foreclosure, anti-waiver) | Verified CA lien deadlines, anti-waiver CC 8122, and stop notice provisions; module maps to `legal-lien-rights` pass |
| CAREG-02 | Labor Compliance pass receives prevailing wage/DIR knowledge (public works detection, CPR, apprenticeship threshold, penalties) | Verified DIR registration requirements, CPR penalties (LC 1776), and apprenticeship thresholds; module maps to `labor-compliance` pass |
| CAREG-03 | Severity overrides enforce CA void-by-law clauses as Critical (CC 8814, CC 2782, CC 8122) | Verified void-by-law status of all three statutes; post-processing guard pattern documented with risk-score-neutral upgrade approach |
| CAREG-04 | Relevant passes receive Title 24 climate-zone glazing requirements for energy code awareness | Verified 2022 Title 24 U-factor (0.30 all zones) and SHGC requirements by climate zone; 2025 cycle effective Jan 1 2026 |
| CAREG-05 | Labor Compliance pass receives Cal/OSHA safety requirements for glazing (fall protection, glass handling) | Verified top Cal/OSHA citations for glass/glazing contractors and applicable Title 8 sections |

</phase_requirements>

## Standard Stack

### Core
No new libraries needed. This phase creates content modules using existing architecture.

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | (existing) | Knowledge module files | Type-safe KnowledgeModule exports |

### Supporting
None -- all infrastructure exists from Phase 7.

### Alternatives Considered
None -- architecture is locked from Phase 7.

**Installation:**
```bash
# No installation needed -- zero new dependencies
```

## Architecture Patterns

### Recommended Project Structure
```
src/knowledge/
├── types.ts              # KnowledgeModule type (exists)
├── registry.ts           # registerModule(), PASS_KNOWLEDGE_MAP (exists, needs population)
├── tokenBudget.ts        # validateTokenBudget() (exists)
├── index.ts              # composeSystemPrompt() barrel (exists, needs regulatory import)
└── regulatory/
    ├── index.ts           # NEW: barrel that imports and registers all 4 modules
    ├── ca-lien-law.ts     # NEW: CAREG-01, CAREG-03 (CC 8814, CC 2782, CC 8122)
    ├── ca-prevailing-wage.ts  # NEW: CAREG-02
    ├── ca-title24.ts      # NEW: CAREG-04
    └── ca-calosha.ts      # NEW: CAREG-05

api/
└── analyze.ts             # EXISTS: add severity guard function + call site
```

### Pattern 1: Knowledge Module File
**What:** Each regulatory module is a standalone TypeScript file exporting a `KnowledgeModule` object.
**When to use:** Every module follows this pattern.
**Example:**
```typescript
// Source: existing KnowledgeModule type in src/knowledge/types.ts
import type { KnowledgeModule } from '../types';

export const caLienLaw: KnowledgeModule = {
  id: 'ca-lien-law',
  domain: 'regulatory',
  title: 'California Mechanics Lien Law',
  effectiveDate: '2024-01-01',
  reviewByDate: '2027-01-01',
  content: `
[Structured regulatory content here -- must be under 6000 chars for ~1500 token cap]
`,
  tokenEstimate: 1400, // Must be <= 1500
};
```

### Pattern 2: Module Registration Barrel
**What:** A barrel `index.ts` in `regulatory/` imports all modules and calls `registerModule()`.
**When to use:** Once -- this file ensures modules are loaded into the registry.
**Example:**
```typescript
// src/knowledge/regulatory/index.ts
import { registerModule } from '../registry';
import { caLienLaw } from './ca-lien-law';
import { caPrevailingWage } from './ca-prevailing-wage';
import { caTitle24 } from './ca-title24';
import { caCalosha } from './ca-calosha';

registerModule(caLienLaw);
registerModule(caPrevailingWage);
registerModule(caTitle24);
registerModule(caCalosha);
```

### Pattern 3: PASS_KNOWLEDGE_MAP Population
**What:** Update the empty arrays in `PASS_KNOWLEDGE_MAP` to wire modules to passes.
**When to use:** In `src/knowledge/registry.ts`.
**Example:**
```typescript
export const PASS_KNOWLEDGE_MAP: Record<string, string[]> = {
  // ... existing empty entries ...
  'legal-lien-rights': ['ca-lien-law'],
  'legal-indemnification': ['ca-lien-law'],        // CC 2782
  'legal-payment-contingency': ['ca-lien-law'],    // CC 8814
  'scope-of-work': ['ca-title24'],
  'labor-compliance': ['ca-prevailing-wage', 'ca-calosha'],
  // ... rest remain empty ...
};
```

### Pattern 4: Post-Processing Severity Guard
**What:** Function that scans findings after deduplication, upgrades severity to Critical when void-by-law statute references are found but severity is not Critical.
**When to use:** Once, in `api/analyze.ts` between dedup and `computeRiskScore()`.
**Key design decision:** The guard must use original severity for risk score calculation (display-only upgrade). This means the guard should store the original severity, set `severity` to `'Critical'` for display, but `computeRiskScore` should use the original severity weight.
**Example:**
```typescript
// In api/analyze.ts, after deduplication, before computeRiskScore

const VOID_BY_LAW_STATUTES = [
  /\bCC\s*8814\b/i,
  /\bCC\s*2782\b/i,
  /\bCC\s*8122\b/i,
  /\bCivil\s+Code\s*(?:Section\s*)?8814\b/i,
  /\bCivil\s+Code\s*(?:Section\s*)?2782\b/i,
  /\bCivil\s+Code\s*(?:Section\s*)?8122\b/i,
];

interface SeverityGuardResult {
  displaySeverity: string;  // 'Critical' if upgraded, original otherwise
  scoreSeverity: string;    // always original severity (for risk score)
}

function applySeverityGuard(finding: UnifiedFinding): SeverityGuardResult {
  if (finding.severity === 'Critical') {
    return { displaySeverity: 'Critical', scoreSeverity: 'Critical' };
  }
  const textToScan = [finding.clauseText, finding.explanation]
    .filter(Boolean)
    .join(' ');
  const hasVoidStatute = VOID_BY_LAW_STATUTES.some(re => re.test(textToScan));
  if (hasVoidStatute) {
    return { displaySeverity: 'Critical', scoreSeverity: finding.severity };
  }
  return { displaySeverity: finding.severity, scoreSeverity: finding.severity };
}
```

### Anti-Patterns to Avoid
- **Exceeding 1,500 token cap:** Each module content must stay under ~6,000 characters (chars/4 heuristic). Verify with `estimateTokens()` before committing.
- **Hardcoding penalty amounts without reviewByDate:** Penalty amounts change with legislation. Always include `reviewByDate` metadata so the module flags when content needs re-verification.
- **Matching on category/keyword instead of statute reference:** The severity guard must match on actual statute citation strings (CC 8814, etc.) -- not on finding categories or keywords like "pay-if-paid".
- **Modifying risk score with upgraded severity:** The CONTEXT.md explicitly says display-only. `computeRiskScore` must use original severity weight for guard-upgraded findings.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Module registration | Custom module loading | Existing `registerModule()` + `PASS_KNOWLEDGE_MAP` | Already built in Phase 7, tested |
| Token validation | Manual char counting | Existing `validateTokenBudget()` with chars/4 | Already enforces cap at runtime |
| System prompt composition | Custom string building | Existing `composeSystemPrompt()` | Already appends domain knowledge sections |
| Severity downgrade tracking | New field for upgrades | None -- upgrades are silent per CONTEXT.md | Decision: no `upgradedFrom` field |

**Key insight:** All infrastructure exists. Phase 9 is pure content authoring + one guard function.

## Common Pitfalls

### Pitfall 1: Incorrect Lien Deadlines
**What goes wrong:** CONTEXT.md says "90-day recording for direct contractors, 60-day for subs" but the actual law (CC 8412, 8414) is different.
**Why it happens:** Confusion between base deadlines and Notice of Completion shortened deadlines.
**How to avoid:** Use the correct deadlines in module content:
- Without Notice of Completion: 90 days from completion for ALL claimants (direct contractors AND subs)
- With Notice of Completion: 60 days for direct contractors, 30 days for subcontractors/suppliers
- With Notice of Cessation: 60 days for direct contractors, 30 days for others
**Warning signs:** Module content that says "60 days for subs" without specifying "after Notice of Completion."

### Pitfall 2: Token Budget Overflow
**What goes wrong:** Module content exceeds 1,500 tokens (~6,000 chars) and `validateTokenBudget()` throws at runtime.
**Why it happens:** Trying to pack too much regulatory detail into a single module.
**How to avoid:** Write concise, instruction-oriented content (not encyclopedic). Use bullet points. Focus on what Claude needs to analyze contracts, not comprehensive legal reference.
**Warning signs:** Content approaching 5,500+ chars. Test with `estimateTokens(content)` during development.

### Pitfall 3: Guard Matches Too Broadly or Too Narrowly
**What goes wrong:** Regex patterns for statute matching either miss valid references ("Civil Code Section 2782") or false-match on unrelated text.
**Why it happens:** Statute citations can appear in various formats.
**How to avoid:** Include multiple regex patterns per statute (CC 8814, Civil Code 8814, Civil Code Section 8814). Test against expected Claude output. Use word boundaries (`\b`).
**Warning signs:** Guard never triggers (too narrow) or triggers on Info-level findings that merely mention statutes in educational context.

### Pitfall 4: Risk Score Inflation from Guard Upgrades
**What goes wrong:** If the guard upgrades severity to Critical and `computeRiskScore()` uses the upgraded severity, scores inflate artificially.
**Why it happens:** The existing `computeRiskScore()` reads `finding.severity` directly.
**How to avoid:** The guard must either: (a) mutate `severity` for display but feed original severity to `computeRiskScore`, or (b) add a separate `displaySeverity` field and modify the response serialization to use it. Approach (a) is simpler: run `computeRiskScore` on original severities, then apply guard upgrades after.
**Warning signs:** Risk scores jumping significantly after enabling regulatory modules.

### Pitfall 5: Regulatory Module Registration Not Imported
**What goes wrong:** Modules are created but never registered because the barrel `index.ts` is not imported in the server code path.
**Why it happens:** Tree-shaking or missing import in api/analyze.ts.
**How to avoid:** Ensure `api/analyze.ts` imports `src/knowledge/regulatory/index.ts` (side-effect import). Or register modules in the same file that populates PASS_KNOWLEDGE_MAP.
**Warning signs:** `getModulesForPass()` throws "module not found in registry" at runtime.

### Pitfall 6: Title 24 Code Cycle Confusion
**What goes wrong:** Module references wrong code cycle as "current."
**Why it happens:** The 2022 Title 24 (Part 6) is current through 2025. The 2025 Title 24 takes effect January 1, 2026.
**How to avoid:** As of the module's effective date, state clearly which cycle is current. Include `reviewByDate` to flag when the 2025 cycle takes effect.
**Warning signs:** Module says "2019 Title 24" is current or omits the upcoming 2025 cycle transition.

## Code Examples

### Knowledge Module Content Structure (verified pattern from existing architecture)
```typescript
// Source: src/knowledge/types.ts KnowledgeModule interface
// Content should be structured as Claude instructions, not legal reference

export const caLienLaw: KnowledgeModule = {
  id: 'ca-lien-law',
  domain: 'regulatory',
  title: 'California Mechanics Lien Law & Void-by-Law Clauses',
  effectiveDate: '2024-01-01',
  reviewByDate: '2027-01-01',
  content: `
## CA Mechanics Lien Law (Private Works)

### Preliminary Notice (CC 8200-8216)
- 20-day preliminary notice required for subs/suppliers (from first furnishing labor/materials)
- Late notice: only covers work within 20 days before notice sent
- Direct contractors exempt from preliminary notice requirement

### Recording Deadlines (CC 8412, 8414)
- Without Notice of Completion: 90 days from project completion (all claimants)
- With Notice of Completion: 60 days (direct contractor), 30 days (subs/suppliers)
- Foreclosure action: must commence within 90 days of recording lien (CC 8460)

### Stop Notices (CC 8500-8560)
- Bonded stop notice: freezes construction funds held by owner
- 30-day release period after stop notice served

### Anti-Waiver (CC 8122) -- VOID BY LAW
Any contract term that waives, affects, or impairs lien rights is VOID and unenforceable.
If you find pre-payment lien waiver clauses, flag as CRITICAL citing CC 8122.

### Pay-if-Paid (CC 8814) -- VOID BY LAW
Clauses conditioning subcontractor payment on owner payment to GC are void.
If you find pay-if-paid clauses, flag as CRITICAL citing CC 8814.

### Broad-Form Indemnity (CC 2782) -- VOID BY LAW
Clauses requiring sub to indemnify for GC's sole negligence or willful misconduct are void.
CC 2782.05 voids indemnity for GC's active negligence (contracts after Jan 1 2013).
If you find broad-form indemnity clauses, flag as CRITICAL citing CC 2782.
`,
  tokenEstimate: 1100,
};
```

### Severity Guard Integration Point
```typescript
// Source: api/analyze.ts mergePassResults function, line ~1453-1456
// Current code:
//   const deduplicatedFindings = Array.from(byTitle.values());
//   const riskScore = computeRiskScore(deduplicatedFindings);

// After guard implementation:
//   const deduplicatedFindings = Array.from(byTitle.values());
//   // Compute risk score BEFORE severity guard (uses original severities)
//   const riskScore = computeRiskScore(deduplicatedFindings);
//   // Apply severity guard AFTER risk score (display-only upgrade)
//   for (const finding of deduplicatedFindings) {
//     applySeverityGuard(finding); // mutates finding.severity if statute match
//   }
```

### Module Registration Side-Effect Import
```typescript
// In api/analyze.ts, add near top imports:
import '../src/knowledge/regulatory/index';
// This triggers registerModule() calls for all 4 modules
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 2019 Title 24 Part 6 | 2022 Title 24 Part 6 (current) | Jan 1, 2023 | U-factor 0.30 all zones, SHGC 0.23 in warm zones |
| 2022 Title 24 Part 6 | 2025 Title 24 Part 6 (upcoming) | Jan 1, 2026 | ~30% more restrictive; module reviewByDate should flag this |
| CC 2782 (pre-2013) | CC 2782 + CC 2782.05 | Jan 1, 2013 | Expanded void provisions to include GC's active negligence |
| CPR penalties $25/day | CPR penalties $100/day/worker (LC 1776) | Various updates | Current penalty for delinquent certified payroll records |

**Deprecated/outdated:**
- 2019 Title 24 Part 6: superseded by 2022 cycle, contracts referencing it should be flagged
- Pre-2013 indemnity rules: CC 2782.05 broadened protections for subs

## CA Regulatory Content Reference

### Verified Statute Details (HIGH confidence)

**CC 8814 (Pay-if-Paid Void):**
- Requires direct contractor to pay sub's retention share within 10 days of receiving retention payment
- Good faith dispute exception limited to 150% of disputed amount
- Pay-if-paid clauses that condition payment on owner payment are void as against lien rights

**CC 2782 (Broad-Form Indemnity Void):**
- CC 2782(a): Void if indemnity covers promisee's sole negligence or willful misconduct
- CC 2782.05: Void if indemnity covers GC's active negligence (contracts after Jan 1, 2013)
- Sub owes no defense obligation until written tender with full claim information

**CC 8122 (Anti-Waiver of Lien Rights):**
- No party may contractually waive another claimant's lien rights
- Only valid waivers are statutory forms (conditional/unconditional, progress/final)
- Violations: fines $100-$1,000

**CA Mechanics Lien Deadlines:**
- Preliminary notice: 20 days from first furnishing (CC 8200)
- Recording without Notice of Completion: 90 days from completion (all claimants)
- Recording with Notice of Completion: 60 days (direct contractor), 30 days (subs)
- Foreclosure: 90 days from recording (CC 8460)

**Prevailing Wage / DIR:**
- Public works threshold: $25,000+ (construction), $15,000+ (maintenance)
- DIR registration required for all public works contractors/subs (LC 1725.5)
- CPR penalty: $100/calendar day per worker for delinquent payroll records (LC 1776(h))
- Apprenticeship: required on public works $30,000+ (LC 1777.5)

**Title 24 Part 6 (2022 cycle, current through 2025):**
- Prescriptive U-factor: 0.30 max (all climate zones, all fenestration)
- SHGC: 0.23 max in climate zones 2, 4, 6-15; no SHGC requirement in zones 1, 3, 5, 16
- Door U-factor (<25% glazing): 0.20 max
- NFRC certification required for all fenestration products
- 2025 cycle effective January 1, 2026 (~30% more restrictive)

**Cal/OSHA Title 8 (Glazing-Specific):**
- T8 1525: Glass -- protection against walking through glass hazard
- T8 1637: Scaffolds -- required when work cannot be done from permanent construction 20"+ wide
- T8 1637(q): Overhead protection on scaffolds
- T8 1621(a), 1632: Guardrails at floor openings and unprotected edges
- T8 1670(a): Personal fall protection (tie-off at heights)
- T8 3276, 1675: Ladder inspection and use
- T8 1509(a)(b)(c): IIPP and Code of Safe Practice requirements
- T8 342(a): Fatality/serious injury reporting (8 hours)
- T8 5194(g): Safety Data Sheets for hazardous chemicals (sealants, adhesives)

## Open Questions

1. **Exact penalty amounts for prevailing wage violations**
   - What we know: CPR delinquency is $100/day/worker (LC 1776(h)). DIR non-registration penalties up to $10,000 for agencies.
   - What's unclear: Current penalty rates for underpayment of prevailing wages (LC 1775 -- historically $200/day/worker but may have been updated)
   - Recommendation: Use verified $100/day figure for CPR, note LC 1775 penalty separately, set reviewByDate to flag for re-verification

2. **2025 Title 24 specific fenestration values**
   - What we know: 2025 cycle effective Jan 1, 2026, ~30% more restrictive than 2022
   - What's unclear: Exact U-factor and SHGC values for 2025 cycle
   - Recommendation: Module should reference 2022 values as current, note 2025 transition, set reviewByDate to Dec 2025

3. **Side-effect import in Vercel serverless context**
   - What we know: Modules must be registered before `getModulesForPass()` is called
   - What's unclear: Whether Vercel's serverless bundling preserves side-effect imports reliably
   - Recommendation: Test the import chain locally with `vercel dev`. If side-effect import fails, move registration calls directly into `api/analyze.ts`.

## Sources

### Primary (HIGH confidence)
- California Civil Code Sections 2782, 2782.05 -- [CA Legislature](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=2782)
- California Civil Code Section 8122 -- [Justia 2024 Code](https://law.justia.com/codes/california/code-civ/division-4/part-6/title-1/chapter-3/section-8122/)
- California Civil Code Section 8814 -- [Justia 2024 Code](https://law.justia.com/codes/california/code-civ/division-4/part-6/title-2/chapter-8/article-2/section-8814/)
- California Civil Code Sections 8412, 8414 -- [Justia 2025 Code](https://law.justia.com/codes/california/code-civ/division-4/part-6/title-2/chapter-4/article-2/section-8412/)
- California Labor Code Section 1776 -- [Justia 2024 Code](https://law.justia.com/codes/california/code-lab/division-2/part-7/chapter-1/article-2/section-1776/)
- DIR Prevailing Wage Laws (revised Feb 2025) -- [DIR PDF](https://www.dir.ca.gov/public-works/californiaprevailingwagelaws.pdf)
- Cal/OSHA Title 8 Section 1525 -- [DIR](https://www.dir.ca.gov/title8/1525.html)
- Existing codebase: `src/knowledge/types.ts`, `registry.ts`, `index.ts`, `tokenBudget.ts`

### Secondary (MEDIUM confidence)
- Title 24 2022 fenestration requirements -- [Quanex](https://www.quanex.com/news/california-title-24-update-reduces-u-factor/) and [Title24Express](https://www.title24express.com/what-is-title-24/title-24-windows-skylights/)
- Top Cal/OSHA citations for glazing -- [NCGMA](https://ncgma.org/resources/top-ten-calosha-citations-glass-and-glazing-contractors)
- 2025 Title 24 effective date -- [CEC](https://www.energy.ca.gov/programs-and-topics/programs/building-energy-efficiency-standards/2025-building-energy-efficiency)
- Lien deadline breakdown -- [SoCal Construction Law](https://www.socalconstructionlaw.com/the-clock-is-ticking-key-mechanics-lien-deadlines-every-contractor-must-know)

### Tertiary (LOW confidence)
- LC 1775 prevailing wage underpayment penalty ($200/day/worker) -- historical figure, needs verification against current statute

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new libraries, existing architecture verified in codebase
- Architecture: HIGH - patterns directly follow Phase 7 conventions, all integration points verified
- Regulatory content: HIGH for statute citations and void-by-law status; MEDIUM for exact penalty amounts
- Pitfalls: HIGH - identified from codebase analysis and regulatory research cross-verification

**Research date:** 2026-03-09
**Valid until:** 2026-04-09 (stable -- CA statutes change 1-2x/year, next Title 24 transition Jan 2026)
