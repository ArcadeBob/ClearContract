# Phase 8: Pipeline Integration and Company-Specific Intelligence - Research

**Researched:** 2026-03-08
**Domain:** AI analysis pipeline integration, company profile data flow, deterministic scoring
**Confidence:** HIGH

## Summary

Phase 8 wires the Phase 7 knowledge architecture (company profile, `composeSystemPrompt()`, knowledge registry) into the live analysis pipeline. The existing infrastructure is well-prepared: `composeSystemPrompt()` already composes base + knowledge + profile, `formatCompanyProfile()` already formats profile as human-readable string, and `useCompanyProfile` already reads/writes localStorage. The work is connecting these pieces through the client-server boundary and extending the AI prompts and UI to produce and display company-specific comparison findings.

The four requirements break into three distinct implementation layers: (1) data flow -- getting company profile from client localStorage to server and into the right prompts, (2) AI prompt engineering -- instructing Claude to generate comparison findings with specific gap amounts and severity downgrades, and (3) UI -- Coverage Comparison tab, severity downgrade annotations, and bid/no-bid widget. The deterministic bid/no-bid widget is computed post-analysis from findings metadata, following the same pattern as the existing `computeRiskScore()`.

**Primary recommendation:** Implement in three waves: data flow plumbing first, then prompt engineering + schema extensions, then UI components. This keeps each wave testable against the previous layer.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Company profile sent in POST body to `/api/analyze` (cleanest for existing structure)
- Only relevant passes receive company profile: insurance, bonding, risk-overview, retainage, scope -- not dates-deadlines, verbiage, etc.
- Comparison logic happens inside the AI prompt -- Claude sees the profile and generates comparison findings directly
- When company profile fields are empty/incomplete: show warning banner then proceed, skipping comparison for missing fields
- Insurance gaps and bonding failures appear as regular findings AND in a dedicated Coverage Comparison tab
- Coverage Comparison tab lives alongside findings view (tab navigation, not inline)
- Table shows only what the contract requires -- if contract doesn't mention umbrella, no umbrella row
- Severity downgrade: show NEW (lower) badge with annotation tag: "was High"
- Downgrade reason inline in finding explanation, always visible
- Downgraded findings use NEW severity for risk score calculation
- AI decides downgrades in the prompt
- Bid/no-bid: traffic light style (Green/Yellow/Red) with label
- Placed next to risk score in review page header
- Computed by deterministic post-processing TypeScript code (not AI)
- 5 weighted factors: Bonding, Insurance, Scope, Payment, Retainage -- all weighted, no single dealbreaker
- No new npm dependencies

### Claude's Discretion
- Client-to-server transport mechanism for company profile
- Which specific passes beyond insurance/bonding/risk-overview should receive the profile
- Coverage comparison table column design
- Bid/no-bid factor weights and green/yellow/red threshold values
- Schema changes needed for passes to return downgrade metadata
- How the comparison tab integrates with existing category filter / view mode toggle

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INTEL-01 | Analysis compares contract insurance requirements against company profile and shows specific gaps | Data flow plumbing + insurance pass prompt enhancement + Coverage Comparison tab |
| INTEL-02 | Analysis compares bonding requirements against company capacity with pass/fail flag | Data flow plumbing + bonding-relevant pass prompt enhancement + Coverage Comparison tab |
| INTEL-03 | Findings are severity-downgraded when company already meets/exceeds the requirement | AI prompt instructions for downgrade + Finding type extension (`downgradedFrom`) + SeverityBadge annotation |
| INTEL-04 | Review page displays bid/no-bid signal widget with weighted scoring | Deterministic `computeBidSignal()` function + BidSignalWidget component |
</phase_requirements>

## Standard Stack

### Core (existing -- no new dependencies)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React 18 | 18.x | UI framework | Already in project |
| TypeScript | strict | Type safety | Already in project |
| Tailwind CSS | 3.x | Styling | Already in project |
| Zod | 3.x | Schema validation for structured outputs | Already in project |
| Framer Motion | 10.x | Animations | Already in project |
| Lucide React | 0.x | Icons | Already in project |

### Supporting (existing)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @anthropic-ai/sdk | latest | Claude API calls | Server-side analysis |
| zod-to-json-schema | latest | Convert Zod to JSON Schema for structured outputs | Schema compilation |

### No New Dependencies
User decision: zero new npm dependencies. All implementation uses existing stack.

## Architecture Patterns

### Data Flow: Client to Server to AI

```
[localStorage] -> [useCompanyProfile] -> [analyzeContract.ts]
    -> POST body { pdfBase64, fileName, companyProfile }
    -> [api/analyze.ts handler] -> destructure companyProfile
    -> [runAnalysisPass] receives companyProfile
    -> [composeSystemPrompt(basePrompt, passName, companyProfile)]
    -> Claude generates comparison findings with downgrade metadata
    -> [mergePassResults] preserves downgrade fields
    -> [computeBidSignal(findings)] -> deterministic bid/no-bid
    -> Response includes bidSignal alongside riskScore
```

### Pattern 1: Company Profile Transport via POST Body

**What:** Add `companyProfile` field to the existing POST body alongside `pdfBase64` and `fileName`.

**When to use:** Every analysis request.

**Implementation approach:**
```typescript
// src/api/analyzeContract.ts
import { loadProfileFromStorage } from '../knowledge/types'; // or inline

const response = await fetch('/api/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    pdfBase64,
    fileName: file.name,
    companyProfile: loadProfileFromStorage(), // read from localStorage
  }),
});
```

**Server side:**
```typescript
// api/analyze.ts handler
const { pdfBase64, fileName, companyProfile } = req.body;
```

**Key detail:** The `analyzeContract()` function currently takes only `file: File`. It needs to also accept `CompanyProfile` or read it directly. Since `analyzeContract` is called from `App.tsx`'s `handleUploadComplete`, the profile must be passed through or read from localStorage in the API wrapper.

**Recommended approach:** Have `analyzeContract.ts` read localStorage directly using the same `STORAGE_KEY` and `loadProfile()` logic from `useCompanyProfile.ts`. Extract `loadProfile()` into a standalone function (not hook-dependent) that both the hook and the API wrapper can use.

### Pattern 2: Selective Profile Injection via composeSystemPrompt

**What:** Replace `system: pass.systemPrompt` (line 985 of analyze.ts) with `composeSystemPrompt()` call, but only pass the company profile to relevant passes.

**Relevant passes (user decision + research):**
- `risk-overview` -- needs profile for overall context
- `legal-insurance` -- primary insurance comparison
- `legal-retainage` -- retainage terms vs company expectations
- `scope-of-work` -- scope alignment with company capabilities
- `legal-payment-contingency` -- payment terms assessment
- `legal-liquidated-damages` -- financial exposure vs company size

**Not relevant (skip profile):**
- `dates-deadlines` -- pure date extraction
- `verbiage-analysis` -- language analysis
- `legal-termination` -- clause analysis, not capacity-dependent
- `legal-flow-down` -- structural analysis
- `legal-no-damage-delay` -- clause analysis
- `legal-lien-rights` -- rights analysis
- `legal-dispute-resolution` -- mechanism analysis
- `legal-change-order` -- process analysis
- `labor-compliance` -- regulatory compliance

**Implementation:**
```typescript
// In runAnalysisPass or the pass execution loop
const PASSES_RECEIVING_PROFILE = new Set([
  'risk-overview',
  'legal-insurance',
  'legal-retainage',
  'scope-of-work',
  'legal-payment-contingency',
  'legal-liquidated-damages',
]);

const systemPrompt = composeSystemPrompt(
  pass.systemPrompt,
  pass.name,
  PASSES_RECEIVING_PROFILE.has(pass.name) ? companyProfile : undefined,
);
```

### Pattern 3: AI-Driven Comparison and Downgrade

**What:** Enhance system prompts for profile-receiving passes to instruct Claude to generate comparison findings and apply severity downgrades.

**Insurance pass prompt addition:**
```
## Company Profile Comparison (MANDATORY when profile provided)
When a Company Profile section is included above, you MUST:
1. For EACH coverage requirement found in the contract, compare against the company's actual coverage
2. Generate a comparison finding with SPECIFIC amounts: "Contract requires $2M GL, your policy covers $1M -- $1M gap"
3. If the company MEETS or EXCEEDS a requirement, downgrade the severity and explain:
   - Set severity to the LOWER value
   - Include in explanation: "Downgraded from [Original] to [New]: company meets this insurance requirement"
4. Populate the coverageItems array with isAboveStandard reflecting the company's coverage, not industry standard
```

**Finding schema extension for downgrade metadata:**
```typescript
// Add to Finding interface in src/types/contract.ts
export interface Finding {
  // ... existing fields
  downgradedFrom?: Severity;  // original severity before downgrade
}
```

**Schema extension for structured output:**
```typescript
// Add to each relevant finding schema
downgradedFrom: SeverityEnum.optional(), // or z.string().optional()
```

### Pattern 4: Deterministic Bid/No-Bid Computation

**What:** Post-analysis deterministic scoring, same pattern as `computeRiskScore()`.

**Implementation approach:**
```typescript
interface BidSignal {
  signal: 'bid' | 'caution' | 'no-bid';
  label: string;
  score: number; // 0-100
  factors: BidFactor[];
}

interface BidFactor {
  name: string;
  score: number; // 0-100 per factor
  weight: number;
  findings: number; // count of relevant findings
}

const FACTOR_WEIGHTS = {
  bonding: 0.25,
  insurance: 0.25,
  scope: 0.20,
  payment: 0.15,
  retainage: 0.15,
};

const THRESHOLDS = {
  bid: 70,       // score >= 70 = green
  caution: 40,   // score >= 40 = yellow
  // below 40 = red
};
```

**Scoring logic:** For each factor, compute a sub-score based on severity-weighted findings in that category:
- Start at 100 (perfect)
- Subtract severity-weighted penalties for findings in the relevant category/pass
- Critical finding in factor: -25, High: -15, Medium: -8, Low: -3
- Clamp to 0-100
- Weighted average across all 5 factors = final bid score

**Factor-to-finding mapping:**
- Bonding: findings from passes where legalMeta.clauseType includes bond-related or from `risk-overview` mentioning bonding
- Insurance: findings with category 'Insurance Requirements' or legalMeta.clauseType === 'insurance'
- Scope: findings with category 'Scope of Work'
- Payment: findings from 'legal-payment-contingency' pass
- Retainage: findings from 'legal-retainage' pass

### Pattern 5: Coverage Comparison Tab

**What:** New tab alongside the findings view modes that shows a table of contract requirements vs company capabilities.

**Data source:** Extract from findings with `legalMeta.clauseType === 'insurance'` (coverageItems array) and bonding-related findings. Cross-reference with company profile from localStorage.

**Recommended table columns:**
| Requirement | Contract Requires | Your Coverage | Status |
|-------------|-------------------|---------------|--------|
| General Liability | $2,000,000 | $1,000,000 | GAP: $1M |

**Status column values:** "Met", "GAP: $X", "Exceeds", "N/A" (profile field empty)

**Implementation:** Build a `CoverageComparisonTab` component that:
1. Reads company profile via `useCompanyProfile` hook
2. Extracts insurance requirements from findings' `legalMeta` (coverageItems array)
3. Extracts bonding requirements from findings
4. Builds comparison rows
5. Renders table with color-coded status cells

### Anti-Patterns to Avoid
- **Don't compute comparisons client-side then re-render findings:** The AI generates the comparison findings. The client just displays them and builds the comparison table from the structured data already in findings.
- **Don't make bid/no-bid AI-generated:** User locked decision -- it must be deterministic TypeScript code.
- **Don't add new API endpoints:** Keep everything in the existing `/api/analyze` endpoint.
- **Don't modify the analysis pass architecture:** Keep 16 parallel passes. Only modify system prompts and schemas.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Currency string parsing | Custom regex parser | Simple `parseFloat(str.replace(/[$,]/g, ''))` | Currency values are already formatted consistently in CompanyProfile |
| Coverage comparison display | Custom grid layout | Tailwind table with `<table>` | Simple structured data, no need for complex grid |
| Traffic light widget | SVG from scratch | Tailwind-styled div with rounded-full + color classes | Matches existing badge pattern |

## Common Pitfalls

### Pitfall 1: CompanyProfile Not Available Server-Side
**What goes wrong:** `composeSystemPrompt()` and `formatCompanyProfile()` are in `src/knowledge/index.ts` -- a client-side module. The server (`api/analyze.ts`) needs these functions but imports from `src/` may fail in Vercel serverless.
**Why it happens:** Vercel serverless functions in `api/` can import from `src/` but the import paths and module resolution must work in the serverless bundler.
**How to avoid:** The existing codebase already imports from `src/schemas/` and `src/types/` in `api/analyze.ts` -- same pattern works for `src/knowledge/index.ts`. Verify the import works in `vercel dev` immediately.
**Warning signs:** Build errors or runtime errors in `vercel dev` after adding the import.

### Pitfall 2: Structured Output Schema Must Be Flat for Optional Fields
**What goes wrong:** Adding `downgradedFrom` as optional to Zod schemas may cause issues with Claude's structured output if not handled correctly.
**Why it happens:** Structured outputs require explicit handling of optional fields.
**How to avoid:** Use `z.string().optional()` or `SeverityEnum.optional()` -- both are valid in structured outputs. The existing codebase already uses `.optional()` on `clauseText` and `explanation` fields in `FindingSchema`.
**Warning signs:** Claude omitting the field entirely or returning null instead of undefined.

### Pitfall 3: localStorage Not Available in analyzeContract.ts
**What goes wrong:** The `analyzeContract.ts` module is a plain TypeScript module, not a React component. It can still access `localStorage` because it runs in the browser.
**Why it happens:** Confusion about React hooks vs browser APIs.
**How to avoid:** Access `localStorage` directly in `analyzeContract.ts` -- it's a browser API, not React-specific. Use the same `STORAGE_KEY` constant. Extract the `loadProfile()` function from the hook into a shared utility.
**Warning signs:** None -- this works. Just verify the storage key matches.

### Pitfall 4: Bid Signal Computed Before Downgrade Application
**What goes wrong:** If bid signal is computed on raw findings before downgrades are applied, it won't reflect the company's actual position.
**Why it happens:** Downgrades happen in the AI response -- findings arrive already downgraded. But if some code path uses `downgradedFrom` to restore original severity before computing bid signal, it defeats the purpose.
**How to avoid:** Compute bid signal from the findings as-received (with downgrades already applied). The `downgradedFrom` field is only for UI display annotation, never for score recalculation.
**Warning signs:** Bid signal not reflecting company profile advantages.

### Pitfall 5: Coverage Comparison Table Shows Stale Profile
**What goes wrong:** User updates profile after analysis. The Coverage Comparison tab reads current profile from localStorage, but findings were generated against the old profile.
**Why it happens:** Profile is injected at analysis time. Changing it later doesn't retroactively update findings.
**How to avoid:** Show the profile values that were used at analysis time (store in contract metadata or just accept the potential mismatch). A simple approach: show a note "Comparison based on profile at time of analysis. Re-analyze to update."
**Warning signs:** Mismatch between displayed "Your Coverage" and what the finding explanations say.

## Code Examples

### Reading Company Profile in analyzeContract.ts
```typescript
// Extract loadProfile from useCompanyProfile.ts into a shared function
// src/knowledge/profileLoader.ts
import { CompanyProfile, DEFAULT_COMPANY_PROFILE } from './types';

const STORAGE_KEY = 'clearcontract:company-profile';

export function loadCompanyProfile(): CompanyProfile {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_COMPANY_PROFILE, ...JSON.parse(stored) };
    }
  } catch {
    // SSR or unavailable
  }
  return DEFAULT_COMPANY_PROFILE;
}
```

### Extended Finding Type
```typescript
// src/types/contract.ts -- add to Finding interface
export interface Finding {
  // ... all existing fields
  downgradedFrom?: Severity; // original severity if AI downgraded
}
```

### Bid Signal Computation
```typescript
// src/utils/bidSignal.ts
import type { Finding } from '../types/contract';

export type BidSignalLevel = 'bid' | 'caution' | 'no-bid';

export interface BidSignal {
  level: BidSignalLevel;
  label: string;
  score: number;
  factors: Array<{
    name: string;
    score: number;
    weight: number;
  }>;
}

const SEVERITY_PENALTIES: Record<string, number> = {
  Critical: 25, High: 15, Medium: 8, Low: 3, Info: 0,
};

const FACTOR_CONFIG = [
  { name: 'Bonding', weight: 0.25, matcher: (f: Finding) => f.sourcePass === 'legal-retainage' || f.title.toLowerCase().includes('bond') },
  { name: 'Insurance', weight: 0.25, matcher: (f: Finding) => f.category === 'Insurance Requirements' },
  { name: 'Scope', weight: 0.20, matcher: (f: Finding) => f.category === 'Scope of Work' },
  { name: 'Payment', weight: 0.15, matcher: (f: Finding) => f.sourcePass === 'legal-payment-contingency' },
  { name: 'Retainage', weight: 0.15, matcher: (f: Finding) => f.sourcePass === 'legal-retainage' },
];

export function computeBidSignal(findings: Finding[]): BidSignal {
  const factors = FACTOR_CONFIG.map(config => {
    const relevant = findings.filter(config.matcher);
    const penalty = relevant.reduce((sum, f) => sum + (SEVERITY_PENALTIES[f.severity] || 0), 0);
    const score = Math.max(0, Math.min(100, 100 - penalty));
    return { name: config.name, score, weight: config.weight };
  });

  const weightedScore = factors.reduce((sum, f) => sum + f.score * f.weight, 0);
  const score = Math.round(weightedScore);

  let level: BidSignalLevel;
  let label: string;
  if (score >= 70) { level = 'bid'; label = 'Bid Recommended'; }
  else if (score >= 40) { level = 'caution'; label = 'Proceed with Caution'; }
  else { level = 'no-bid'; label = 'Significant Concerns'; }

  return { level, label, score, factors };
}
```

### SeverityBadge with Downgrade Annotation
```typescript
// Extended SeverityBadge component
interface SeverityBadgeProps {
  severity: Severity;
  downgradedFrom?: Severity;
  className?: string;
}

export function SeverityBadge({ severity, downgradedFrom, className = '' }: SeverityBadgeProps) {
  const colors = { /* existing color map */ };
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors[severity]} ${className}`}>
        {severity}
      </span>
      {downgradedFrom && (
        <span className="text-xs text-slate-400 font-medium">
          was {downgradedFrom}
        </span>
      )}
    </span>
  );
}
```

### Traffic Light Widget
```typescript
// src/components/BidSignalWidget.tsx
const SIGNAL_COLORS = {
  bid: 'bg-emerald-500',
  caution: 'bg-amber-500',
  'no-bid': 'bg-red-500',
};

export function BidSignalWidget({ signal }: { signal: BidSignal }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-4 h-4 rounded-full ${SIGNAL_COLORS[signal.level]}`} />
      <span className="text-sm font-medium text-slate-700">{signal.label}</span>
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded insurance standards in prompts | Company profile injected per-pass | Phase 7 (ARCH-05) | Enables personalized comparison |
| Single risk score only | Risk score + bid/no-bid signal | Phase 8 | Dual metrics: contract risk vs company fit |
| Fixed severity from AI | AI-driven severity downgrade | Phase 8 | Findings reflect company's actual position |

## Open Questions

1. **Bonding pass identification**
   - What we know: There is no dedicated "bonding" analysis pass. Bonding requirements surface in `risk-overview`, `legal-retainage`, and potentially `legal-insurance`.
   - What's unclear: Which pass is best for generating the primary bonding comparison finding.
   - Recommendation: Add bonding comparison instructions to `risk-overview` pass (it already has broad scope) and tag bonding-related findings with a marker. The bid/no-bid matcher can use title/description text matching for bonding findings.

2. **Profile snapshot at analysis time**
   - What we know: Profile is sent in the POST body at analysis time. If user changes profile later, the comparison tab would show current (new) profile vs findings generated against old profile.
   - What's unclear: Whether to store the profile snapshot with the contract.
   - Recommendation: For v1.1, accept the potential mismatch. Contracts are in-memory only (reset on refresh), so the window for mismatch is small. Add a note to the Coverage Comparison tab.

3. **Empty profile field detection**
   - What we know: User decision says show warning banner for incomplete profile and skip comparison for missing fields.
   - What's unclear: How to detect "empty" vs "default" -- the profile is pre-populated with Clean Glass defaults (PROF-06).
   - Recommendation: Treat default values as valid (they are real company data). Only warn if a field is literally empty string. The AI prompt should handle this: "If a profile field is empty, skip comparison for that coverage type."

## Sources

### Primary (HIGH confidence)
- Direct code inspection: `src/knowledge/index.ts` -- `composeSystemPrompt()` and `formatCompanyProfile()` signatures and implementation
- Direct code inspection: `src/knowledge/types.ts` -- `CompanyProfile` interface and `DEFAULT_COMPANY_PROFILE` values
- Direct code inspection: `api/analyze.ts` -- full pipeline architecture, pass definitions, `runAnalysisPass()`, `mergePassResults()`, `computeRiskScore()`, handler POST body parsing
- Direct code inspection: `src/types/contract.ts` -- `Finding` interface, `Contract` interface, `LegalMeta` union type
- Direct code inspection: `src/schemas/legalAnalysis.ts` -- `InsuranceFindingSchema` with `coverageItems` and `endorsements` arrays
- Direct code inspection: `src/api/analyzeContract.ts` -- client-side API wrapper, POST body construction
- Direct code inspection: `src/pages/ContractReview.tsx` -- review page layout, risk score display location, view mode toggle pattern
- Direct code inspection: `src/components/SeverityBadge.tsx` -- current badge implementation
- Direct code inspection: `src/hooks/useCompanyProfile.ts` -- localStorage read/write pattern, storage key

### Secondary (MEDIUM confidence)
- Phase 8 CONTEXT.md -- user decisions and integration points documented from discuss session

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all existing code inspected
- Architecture: HIGH -- all integration points verified in source code, clear data flow path
- Pitfalls: HIGH -- identified from actual code patterns and verified constraints
- Bid/no-bid weights: MEDIUM -- weights and thresholds are Claude's discretion per user decision; recommended values are reasonable starting points but may need tuning

**Research date:** 2026-03-08
**Valid until:** 2026-04-08 (stable -- no external dependencies to change)
