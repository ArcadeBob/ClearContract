# Architecture Patterns

**Domain:** Knowledge architecture for domain intelligence in existing contract analysis pipeline
**Researched:** 2026-03-08
**Confidence:** HIGH (existing codebase fully analyzed, API constraints verified via official docs)

## Current Architecture Summary

The existing system is a React 18 SPA + Vercel serverless function (`api/analyze.ts`, 1537 LOC). The serverless function:

1. Receives a PDF via base64-encoded POST body
2. Uploads PDF once to Anthropic Files API (upload-once/analyze-many pattern)
3. Runs 16 analysis passes in parallel via `Promise.allSettled`
4. Each pass has its own Zod schema, system prompt (~80-150 lines), and user prompt (~1 line)
5. All passes share the same `fileId` with `cache_control: { type: 'ephemeral' }` on the document block
6. Results are merged, deduplicated by composite key (clauseReference + category), risk-scored deterministically, and returned as JSON

Key constraints: no database, no persistence, single-user, Vercel serverless with 300s timeout, Claude Sonnet 4.5 with 200K context window and 8192 max output tokens per pass.

The `AnalysisPass` interface is:
```typescript
interface AnalysisPass {
  name: string;
  systemPrompt: string;
  userPrompt: string;
  isOverview: boolean;
  isLegal?: boolean;
  isScope?: boolean;
  schema?: ZodSchema;
}
```

System prompts currently live inline in the `ANALYSIS_PASSES` array in `api/analyze.ts`. Each is a multi-line string literal with embedded domain knowledge (e.g., the insurance pass hardcodes "$1M/$2M" CGL limits, the lien rights pass hardcodes "13 states prohibit pay-if-paid").

---

## Recommended Architecture: Knowledge as System Prompt Injection

### Design Principle

Knowledge files are **static TypeScript string exports** that get concatenated into system prompts at analysis time. No vector database, no RAG, no retrieval pipeline. The system prompt for each pass already runs ~100 lines; knowledge injection adds domain-specific reference content that makes Claude's analysis more precise.

This is the right approach because:
- The knowledge is stable (regulatory codes, company insurance limits, industry standards) -- not dynamic content requiring real-time retrieval
- System prompts benefit from prompt caching (10% of input cost on cache hit, 90% savings)
- The 200K context window provides ample room for knowledge injection per pass
- Complexity stays low -- no new infrastructure, no database, no retrieval system
- Single-user, developer-is-the-user: editing a `.ts` file and redeploying is the right UX for updating regulatory knowledge

Company profile is the one exception: it is user-editable at runtime via the Settings UI and stored in `localStorage`, flowing to the API in the request body.

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **Knowledge Files** (`src/knowledge/`) | Static domain knowledge as TypeScript string exports | `buildSystemPrompt()` |
| **Pass-Knowledge Map** (`src/knowledge/passMap.ts`) | Declares which knowledge files each pass needs | `buildSystemPrompt()` |
| **Prompt Builder** (`src/knowledge/buildSystemPrompt.ts`) | Assembles final system prompt: base prompt + knowledge + company profile | `runAnalysisPass()` in `api/analyze.ts` |
| **Company Profile Store** (Settings UI + localStorage) | User-editable company data (insurance, bonding, licenses, thresholds) | Sent to `/api/analyze` in request body |
| **Company Profile Type** (`src/types/companyProfile.ts`) | TypeScript interface for company data | Settings UI, API handler, prompt builder |

### Data Flow

```
[Settings UI] --> localStorage.setItem('companyProfile', ...)
                       |
                       v
[analyzeContract.ts] reads localStorage, includes in POST body
                       |
                       v
[api/analyze.ts handler]
  |
  +--> const { pdfBase64, fileName, companyProfile } = req.body
  +--> uploads PDF to Files API (unchanged)
  +--> for each of 16 passes (in parallel, unchanged):
  |      |
  |      +--> passMap.ts: which knowledge keys does this pass need?
  |      +--> buildSystemPrompt(pass.systemPrompt, pass.name, companyProfile):
  |      |      = base system prompt (existing, per-pass)
  |      |      + selected knowledge file content
  |      |      + formatted company profile section
  |      |
  |      +--> runAnalysisPass(client, fileId, { ...pass, systemPrompt: assembledPrompt })
  |
  +--> merge, dedup, score, return (unchanged)
```

---

## Knowledge File Structure

### Where Knowledge Files Live: In the Repo

Knowledge lives as TypeScript files in `src/knowledge/`. Not uploaded files, not fetched from an API.

Rationale:
- **Version controlled** -- changes tracked, reversible, reviewable in PRs
- **Deployed with the app** -- no external dependency, no runtime fetch, no latency
- **Type-safe** -- TypeScript exports, IDE autocomplete on knowledge keys
- **Cacheable by prompt caching** -- stable system prompts get cached by Anthropic
- **Right UX for sole developer/user** -- edit file, redeploy, done

### File Layout

```
src/
  knowledge/
    index.ts                      # Registry: KnowledgeKey -> string content
    passMap.ts                    # Pass name -> KnowledgeKey[] mapping
    buildSystemPrompt.ts          # Assembles final system prompt

    company/
      profile.ts                  # Formatter: CompanyProfile -> prompt section string
      defaults.ts                 # Default values for Clean Glass Installation Inc.

    regulatory/
      ca-lien-law.ts              # CA mechanics lien deadlines, notice requirements
      ca-prevailing-wage.ts       # DIR registration, certified payroll, apprenticeship
      ca-title24.ts               # Title 24 energy compliance for glazing
      ca-osha.ts                  # Cal/OSHA glazing-specific safety requirements

    standards/
      aia-clauses.ts              # AIA A201/A401 standard clause patterns + red flags
      consensusdocs-clauses.ts    # ConsensusDocs 750 patterns
      ejcdc-clauses.ts            # EJCDC patterns

    trade/
      aama-standards.ts           # AAMA/WDMA/CSA 101 performance specs
      division08-specs.ts         # CSI Division 08 scope boundaries
      glazing-products.ts         # Product types, lead times, installation methods

    rules/
      severity-overrides.ts       # Domain-specific severity calibration rules
      false-positive-filters.ts   # Patterns that look risky but are standard for glazing
      bid-nobid-signals.ts        # Contract terms that signal bid/no-bid decisions

  types/
    companyProfile.ts             # Interface for company profile data
```

### Knowledge File Format

Each knowledge file exports a single named `string` constant. Content is written addressing Claude as the analyst, formatted with markdown headers. Each file stays under **1,500 tokens** (~1,100 words).

```typescript
// src/knowledge/regulatory/ca-lien-law.ts
export const CA_LIEN_LAW = `
## California Mechanics Lien Law Reference

### Preliminary Notice (CA Civil Code 8200-8216)
- Subcontractors MUST serve preliminary 20-day notice to preserve lien rights
- Notice must be served within 20 days of first furnishing labor/materials
- Failure to serve = lien rights limited to work performed in 20 days before notice

### Mechanics Lien Filing Deadlines (CA Civil Code 8412-8414)
- Direct contractors: 90 days after completion
- Subcontractors: 90 days after completion OR 30 days after notice of completion
- If no notice of completion recorded: 90 days from actual completion

### Severity Calibration
When analyzing lien rights provisions in contracts governed by California law:
- No-lien clauses are UNENFORCEABLE in CA (Civil Code 8122) = flag as Critical but note unenforceability
- Unconditional waivers before payment violate CA Civil Code 8132 = flag as Critical
- Conditional waivers tied to payment are STANDARD and compliant = Low severity
`;
```

---

## How Passes Select Knowledge: The Pass Map

`passMap.ts` is a static mapping from pass name to arrays of knowledge keys. This is the single source of truth for what knowledge each pass receives.

```typescript
// src/knowledge/passMap.ts
export type KnowledgeKey =
  | 'CA_LIEN_LAW' | 'CA_PREVAILING_WAGE' | 'CA_TITLE24' | 'CA_OSHA'
  | 'AIA_CLAUSES' | 'CONSENSUSDOCS_CLAUSES' | 'EJCDC_CLAUSES'
  | 'AAMA_STANDARDS' | 'DIVISION08_SPECS' | 'GLAZING_PRODUCTS'
  | 'SEVERITY_OVERRIDES' | 'FALSE_POSITIVE_FILTERS' | 'BID_NOBID_SIGNALS';

export const PASS_KNOWLEDGE_MAP: Record<string, KnowledgeKey[]> = {
  'risk-overview':              ['SEVERITY_OVERRIDES', 'BID_NOBID_SIGNALS', 'FALSE_POSITIVE_FILTERS'],
  'legal-indemnification':      ['AIA_CLAUSES', 'SEVERITY_OVERRIDES'],
  'legal-payment-contingency':  ['CA_LIEN_LAW', 'AIA_CLAUSES', 'SEVERITY_OVERRIDES'],
  'legal-lien-rights':          ['CA_LIEN_LAW', 'SEVERITY_OVERRIDES'],
  'legal-insurance':            ['SEVERITY_OVERRIDES', 'FALSE_POSITIVE_FILTERS'],
  'legal-liquidated-damages':   ['SEVERITY_OVERRIDES'],
  'legal-retainage':            ['SEVERITY_OVERRIDES'],
  'legal-termination':          ['AIA_CLAUSES', 'SEVERITY_OVERRIDES'],
  'legal-flow-down':            ['AIA_CLAUSES', 'CONSENSUSDOCS_CLAUSES', 'SEVERITY_OVERRIDES'],
  'legal-no-damage-delay':      ['SEVERITY_OVERRIDES'],
  'legal-dispute-resolution':   ['SEVERITY_OVERRIDES'],
  'legal-change-order':         ['AIA_CLAUSES', 'SEVERITY_OVERRIDES'],
  'scope-of-work':              ['AAMA_STANDARDS', 'DIVISION08_SPECS', 'GLAZING_PRODUCTS', 'FALSE_POSITIVE_FILTERS'],
  'dates-deadlines':            ['CA_PREVAILING_WAGE', 'SEVERITY_OVERRIDES'],
  'verbiage-analysis':          ['FALSE_POSITIVE_FILTERS', 'SEVERITY_OVERRIDES'],
  'labor-compliance':           ['CA_PREVAILING_WAGE', 'CA_OSHA', 'CA_TITLE24', 'SEVERITY_OVERRIDES'],
};
```

**Design rationale for selective loading:** Each pass has a focused purpose. Loading all knowledge into every pass wastes tokens (and money at $3/MTok input) and dilutes Claude's attention. The pass map ensures each pass gets only relevant reference data. Most passes get 1-2 knowledge files; the heaviest (`scope-of-work`, `labor-compliance`) get 4.

---

## Token Budget Management

### The Math

| Component | Tokens (approx) | Notes |
|-----------|-----------------|-------|
| Base system prompt per pass | 400-800 | Current prompts, varies by pass |
| Knowledge injection per pass | 500-2,000 | Depends on pass map; most get 1-2 files |
| Company profile section | 200-400 | Formatted from profile data |
| **Total system prompt per pass** | **1,100-3,200** | Well under limits |
| PDF document (via Files API) | 5,000-50,000 | Contract size varies; cached via Files API |
| Output budget per pass | 8,192 | `MAX_TOKENS_PER_PASS` constant |
| **Total per pass** | **~15,000-60,000** | Safely under 200K context window |

### Token Budget Rules

1. **Each knowledge file MUST stay under 1,500 tokens** (~1,100 words). If a domain needs more content, split into multiple files and assign only the relevant one to each pass.

2. **No pass should receive more than 4 knowledge files.** 4 files x 1,500 tokens = 6,000 tokens max knowledge injection. Combined with base prompt (~800) and company profile (~400), total system prompt stays under ~7,200 tokens. This is conservative -- the 200K context can handle much more, but focused prompts produce better results.

3. **Company profile is always injected** into every pass (it is short and universally relevant). Knowledge files are selectively injected per pass map.

4. **Monitor via logging.** Add a token count estimate to the existing `console.log` in `runAnalysisPass` so you can spot budget creep during development:
   ```typescript
   const estimatedTokens = Math.ceil(finalSystemPrompt.length / 4);
   console.log(`[analyze] Pass ${pass.name}: ~${estimatedTokens} system prompt tokens, ${knowledgeKeys.length} knowledge files`);
   ```

### Prompt Caching Impact

Anthropic's prompt caching charges 10% of input cost on cache hits. The cache follows the hierarchy: tools -> system -> messages.

**Current caching:** The PDF document is cached via `cache_control: { type: 'ephemeral' }` on the document content block. All 16 parallel passes share this cache within the 5-minute TTL.

**With knowledge injection:** System prompts will now vary more across passes (different knowledge content). This means system prompt caching is per-pass (same prompt benefits on retry or re-analysis). The document itself remains cached across all passes regardless. Since the document (5K-50K tokens) is the expensive part and the system prompt (1K-3K tokens) is small, the caching story remains favorable.

**Cost estimate per analysis:**
- 16 passes x ~25K avg input tokens = ~400K input tokens = ~$1.20 at $3/MTok
- With document caching (15 cache hits of ~25K): ~$1.20 drops to ~$0.45
- Knowledge injection adds ~2K tokens/pass = ~32K total = ~$0.10 extra
- **Net cost per analysis: ~$0.55** (knowledge adds roughly $0.10, or ~22%)

---

## Company Profile: Settings UI to Analysis

### Data Model

```typescript
// src/types/companyProfile.ts
export interface CompanyProfile {
  // Identity
  companyName: string;              // "Clean Glass Installation Inc."
  contractorLicense: string;        // "CA CSLB #123456"
  dirRegistration: string;          // "DIR #1000012345"

  // Insurance
  cglLimit: string;                 // "$1M/$2M"
  umbrellaLimit: string;            // "$5M"
  autoLimit: string;                // "$1M CSL"
  workersComp: string;              // "Statutory"
  installationFloater: string;      // "$500K"

  // Bonding
  bondingCapacity: string;          // "$2M single / $5M aggregate"
  bondingSurety: string;            // "Travelers"

  // Capabilities
  maxProjectValue: string;          // "$3M"
  maxCrewSize: string;              // "12"
  serviceArea: string;              // "Southern California"
  specialties: string[];            // ["Curtain wall", "Storefronts", "Skylights"]

  // Bid/No-Bid Thresholds
  maxRetainagePercent: number;      // 10
  maxLdPerDay: string;              // "$1,000"
  requiresMutualIndemnification: boolean;
  rejectsBroadFormIndemnity: boolean;
  maxPaymentTermDays: number;       // 45
}
```

### Data Flow Detail

```
Settings.tsx
  |
  +--> useState<CompanyProfile>(loadFromLocalStorage() || DEFAULT_PROFILE)
  +--> onSave: localStorage.setItem('companyProfile', JSON.stringify(profile))
  |
  v
src/api/analyzeContract.ts
  |
  +--> const profileJson = localStorage.getItem('companyProfile')
  +--> const companyProfile = profileJson ? JSON.parse(profileJson) : undefined
  +--> POST /api/analyze { pdfBase64, fileName, companyProfile }
  |
  v
api/analyze.ts handler
  |
  +--> const { pdfBase64, fileName, companyProfile } = req.body
  +--> // companyProfile is optional; falls back to defaults if missing
  +--> passes companyProfile to buildSystemPrompt() for each pass
```

### Why localStorage (Not a Database)

- Single user, single device -- localStorage is sufficient persistence
- No authentication needed -- no user identity to associate with
- Data is small (<2KB)
- Acceptable UX: profile persists across page refreshes but not across devices
- Matches the existing architecture's "no persistence" philosophy for contracts
- If browser data is cleared, defaults (Clean Glass Installation Inc. values) kick in

### How Company Profile Appears in System Prompts

```typescript
// src/knowledge/company/profile.ts
import type { CompanyProfile } from '../../types/companyProfile';

export function formatCompanyProfile(profile: CompanyProfile): string {
  return `
## Company Context: ${profile.companyName}

### Current Insurance Coverage
- CGL: ${profile.cglLimit}
- Umbrella: ${profile.umbrellaLimit}
- Auto: ${profile.autoLimit}
- Workers Comp: ${profile.workersComp}
- Installation Floater: ${profile.installationFloater}

### Bonding Capacity
- ${profile.bondingCapacity} (Surety: ${profile.bondingSurety})

### Licensing
- Contractor License: ${profile.contractorLicense}
- DIR Registration: ${profile.dirRegistration}

### Capabilities
- Max Project Value: ${profile.maxProjectValue}
- Service Area: ${profile.serviceArea}
- Specialties: ${profile.specialties.join(', ')}

### Bid/No-Bid Thresholds -- USE THESE TO CALIBRATE SEVERITY
- If contract requires insurance above company coverage limits, flag as High
- If retainage exceeds ${profile.maxRetainagePercent}%, flag as High
- If LD rate exceeds ${profile.maxLdPerDay}/day relative to typical glazing subcontract values, flag as Critical
- If payment terms exceed ${profile.maxPaymentTermDays} days, flag as High
- ${profile.rejectsBroadFormIndemnity ? 'Company REJECTS broad-form indemnification -- flag as Critical with bid/no-bid warning' : ''}
- ${profile.requiresMutualIndemnification ? 'Company REQUIRES mutual indemnification -- flag one-sided indemnity as High' : ''}
- If contract scope includes work outside company specialties, flag as Medium capability gap
`;
}
```

---

## Prompt Assembly: The buildSystemPrompt Function

```typescript
// src/knowledge/buildSystemPrompt.ts
import { PASS_KNOWLEDGE_MAP, type KnowledgeKey } from './passMap';
import { KNOWLEDGE_REGISTRY } from './index';
import { formatCompanyProfile } from './company/profile';
import { DEFAULT_COMPANY_PROFILE } from './company/defaults';
import type { CompanyProfile } from '../types/companyProfile';

export function buildSystemPrompt(
  basePrompt: string,
  passName: string,
  companyProfile?: CompanyProfile,
): string {
  const profile = companyProfile || DEFAULT_COMPANY_PROFILE;
  const knowledgeKeys = PASS_KNOWLEDGE_MAP[passName] || [];

  const knowledgeSections = knowledgeKeys
    .map((key: KnowledgeKey) => KNOWLEDGE_REGISTRY[key])
    .filter(Boolean)
    .join('\n\n');

  const profileSection = formatCompanyProfile(profile);

  // Order: base prompt (task definition) -> domain knowledge -> company context
  // Task definition first so Claude knows what it is doing before reading reference material
  return [
    basePrompt,
    knowledgeSections ? `\n\n# Domain Knowledge Reference\n\n${knowledgeSections}` : '',
    `\n\n# Company Context\n\n${profileSection}`,
  ].join('');
}
```

### Knowledge Registry

```typescript
// src/knowledge/index.ts
import type { KnowledgeKey } from './passMap';
import { CA_LIEN_LAW } from './regulatory/ca-lien-law';
import { CA_PREVAILING_WAGE } from './regulatory/ca-prevailing-wage';
// ... all imports

export const KNOWLEDGE_REGISTRY: Record<KnowledgeKey, string> = {
  CA_LIEN_LAW,
  CA_PREVAILING_WAGE,
  CA_TITLE24,
  CA_OSHA,
  AIA_CLAUSES,
  CONSENSUSDOCS_CLAUSES,
  EJCDC_CLAUSES,
  AAMA_STANDARDS,
  DIVISION08_SPECS,
  GLAZING_PRODUCTS,
  SEVERITY_OVERRIDES,
  FALSE_POSITIVE_FILTERS,
  BID_NOBID_SIGNALS,
};
```

---

## Knowledge File Reuse Strategy

### Principle 1: Separate Reference Data from Severity Rules

**Reference data** (lien deadlines, AAMA spec numbers, AIA clause patterns) is reusable across passes that need the same domain knowledge. Example: `CA_LIEN_LAW` is used by both `legal-payment-contingency` and `legal-lien-rights`.

**Severity rules** are centralized in `severity-overrides.ts` and injected into 14 of 16 passes. This single file contains company-specific severity calibration that supplements the base prompt's generic severity rules.

### Principle 2: Granular Files, Not Monoliths

Wrong: One `california-law.ts` file with 5,000 tokens covering all CA regulations.
Right: Four files (`ca-lien-law.ts`, `ca-prevailing-wage.ts`, `ca-title24.ts`, `ca-osha.ts`) each under 1,500 tokens, assigned only to passes that need them.

This matters because the `labor-compliance` pass needs prevailing wage + OSHA + Title 24 but NOT lien law. The `legal-lien-rights` pass needs lien law but NOT prevailing wage. Granularity enables precise selection.

### Principle 3: Knowledge is Additive, Not Replacement

Knowledge content is injected as **additional sections** in the system prompt. It does not replace the base prompt -- it augments it. The base prompt defines the pass's task, output format, and severity rules. Knowledge provides reference data that makes analysis more precise and reduces false positives.

---

## Integration Points: New vs Modified Files

### New Files to Create

| File | Purpose | Approx Size |
|------|---------|-------------|
| `src/types/companyProfile.ts` | CompanyProfile TypeScript interface | ~50 lines |
| `src/knowledge/index.ts` | Registry mapping KnowledgeKey -> content string | ~30 lines |
| `src/knowledge/passMap.ts` | Pass name -> KnowledgeKey[] mapping | ~40 lines |
| `src/knowledge/buildSystemPrompt.ts` | Prompt assembly function | ~30 lines |
| `src/knowledge/company/profile.ts` | Profile -> prompt section formatter | ~40 lines |
| `src/knowledge/company/defaults.ts` | Default CompanyProfile for Clean Glass | ~30 lines |
| `src/knowledge/regulatory/*.ts` | 4 CA regulatory knowledge files | ~80 lines each |
| `src/knowledge/standards/*.ts` | 3 contract standard pattern files | ~80 lines each |
| `src/knowledge/trade/*.ts` | 3 trade knowledge files | ~80 lines each |
| `src/knowledge/rules/*.ts` | 3 rule files (severity, false positives, bid signals) | ~60 lines each |

**Total new files: ~19 files**

### Existing Files to Modify

| File | Change | Lines Changed | Risk |
|------|--------|--------------|------|
| `api/analyze.ts` | (1) Import `buildSystemPrompt`. (2) Accept optional `companyProfile` from `req.body`. (3) In `runAnalysisPass`, call `buildSystemPrompt(pass.systemPrompt, pass.name, companyProfile)` to get final prompt. | ~15 lines | Low -- isolated changes, no logic restructuring |
| `src/api/analyzeContract.ts` | Read `companyProfile` from localStorage and include in POST body. | ~5 lines | Low -- additive only |
| `src/pages/Settings.tsx` | Replace placeholder sections with company profile form. Save/load localStorage. | Major rewrite | Medium -- UI-only, no pipeline impact |

### Files NOT Changed

- **Schema files** (`src/schemas/*.ts`) -- knowledge injection happens in system prompts, not in output schemas. The structured output format stays identical.
- **Type file** (`src/types/contract.ts`) -- Finding type already supports all needed fields (severity, category, legalMeta, scopeMeta, etc.)
- **Store hook** (`src/hooks/useContractStore.ts`) -- company profile lives in localStorage, not in contract store
- **Other page components** -- no UI changes outside Settings
- **`vercel.json`** -- no deployment config changes
- **Merge/dedup logic** in `api/analyze.ts` -- completely unaffected

---

## Build Order

The build order respects dependency chains and minimizes risk by keeping the existing pipeline working throughout.

### Phase 1: Foundation (all new files, zero existing changes)

**Goal:** Create the knowledge infrastructure. Everything compiles, nothing in existing code changes yet.

1. `src/types/companyProfile.ts` -- define the interface
2. `src/knowledge/company/defaults.ts` -- hardcode Clean Glass Installation values
3. `src/knowledge/company/profile.ts` -- formatter function
4. `src/knowledge/rules/severity-overrides.ts` -- most universally-used knowledge file
5. `src/knowledge/rules/false-positive-filters.ts`
6. `src/knowledge/rules/bid-nobid-signals.ts`
7. `src/knowledge/index.ts` -- registry (import all, export as Record)
8. `src/knowledge/passMap.ts` -- mapping (start with rules-only entries)
9. `src/knowledge/buildSystemPrompt.ts` -- assembler function

**Verification:** `buildSystemPrompt(someBasePrompt, 'risk-overview')` returns the base prompt with severity overrides, bid/no-bid signals, false positive filters, and default company profile appended. Can be tested with a simple script.

### Phase 2: Pipeline Integration (3 files modified, minimal changes)

**Goal:** Wire knowledge into the existing pipeline. The analysis should still work identically but now with domain knowledge injected.

1. Modify `api/analyze.ts`:
   - Import `buildSystemPrompt` from `../src/knowledge/buildSystemPrompt`
   - Accept optional `companyProfile` from `req.body` (with validation)
   - In the `runAnalysisPass` call, replace `pass.systemPrompt` with `buildSystemPrompt(pass.systemPrompt, pass.name, companyProfile)`
2. Modify `src/api/analyzeContract.ts`:
   - Read `companyProfile` from localStorage
   - Include in POST body alongside `pdfBase64` and `fileName`

**Verification:** Upload a contract. Compare findings before/after. Knowledge-enhanced analysis should show: severity calibrated against company thresholds (e.g., LD flagged as Critical when exceeding company max), CA-specific enforceability notes where relevant.

### Phase 3: Domain Knowledge Content (new files only, expand pass map)

**Goal:** Write the substantive domain content files and assign them to passes.

1. `src/knowledge/regulatory/ca-lien-law.ts`
2. `src/knowledge/regulatory/ca-prevailing-wage.ts`
3. `src/knowledge/regulatory/ca-title24.ts`
4. `src/knowledge/regulatory/ca-osha.ts`
5. `src/knowledge/standards/aia-clauses.ts`
6. `src/knowledge/standards/consensusdocs-clauses.ts`
7. `src/knowledge/standards/ejcdc-clauses.ts`
8. `src/knowledge/trade/aama-standards.ts`
9. `src/knowledge/trade/division08-specs.ts`
10. `src/knowledge/trade/glazing-products.ts`
11. Update `src/knowledge/index.ts` -- register all new files
12. Update `src/knowledge/passMap.ts` -- assign files to all 16 passes per the mapping above

**Verification:** Upload contracts of different types. CA lien rights pass should cite actual Civil Code section numbers. AIA contract findings should reference specific A201 articles. Scope pass should recognize Division 08 boundaries.

### Phase 4: Settings UI (Settings.tsx rewrite)

**Goal:** Make company profile editable by the user.

1. Rewrite `src/pages/Settings.tsx`:
   - Replace "Review Playbooks" placeholder with Company Profile form sections (Identity, Insurance, Bonding, Capabilities, Thresholds)
   - Keep AI Engine info section (update to show knowledge file count)
   - Remove fake Procore/BuildOps/Document Crunch integrations section
   - Add save/load/reset buttons
   - Load from localStorage on mount, save on submit
2. Optional: Add a visual indicator on Dashboard when default profile is active ("Configure your company profile in Settings for more accurate analysis")

**Verification:** Edit company profile (change max retainage to 5%), save, upload a contract with 10% retainage. Verify retainage finding now flags as High (above threshold) instead of the default Low severity.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Dynamic Knowledge Retrieval (RAG/Vector Store)
**What:** Building a retrieval pipeline with embeddings and vector search.
**Why bad:** For ~15 static knowledge files totaling ~15K tokens, this adds massive infrastructure complexity (database, embeddings model, retrieval logic), latency (fetch before each pass), and unreliable relevance. The knowledge set is small enough to be fully enumerated.
**Instead:** Static TypeScript exports with a deterministic pass map.

### Anti-Pattern 2: One Giant Knowledge File Per Pass
**What:** Creating a single knowledge file per pass containing all relevant domain knowledge.
**Why bad:** Defeats reuse (CA lien law duplicated across lien rights and payment contingency passes), makes updates error-prone, bloats some passes while under-utilizing others.
**Instead:** Granular files (~1,000-1,500 tokens each) mapped to multiple passes via `passMap.ts`.

### Anti-Pattern 3: Knowledge in Zod Schemas
**What:** Embedding domain knowledge in schema descriptions or enum values.
**Why bad:** Schemas define output structure, not input context. Schema descriptions don't benefit from system prompt caching. Mixing concerns makes schemas unwieldy.
**Instead:** Knowledge in system prompt, schema stays focused on output structure.

### Anti-Pattern 4: Inlining Knowledge into Base Prompts
**What:** Editing the existing system prompts in `ANALYSIS_PASSES` to inline knowledge content directly.
**Why bad:** Balloons `api/analyze.ts` from 1,537 LOC to 3,000+ LOC. Makes knowledge updates require editing the monolith. Loses the separation between "what to analyze" (base prompt) and "what to know" (knowledge files). Cannot selectively disable knowledge injection for testing.
**Instead:** `buildSystemPrompt()` composes the final prompt at runtime. Base prompts stay clean. Knowledge is modular and independently editable.

### Anti-Pattern 5: Server-Side Profile Persistence
**What:** Adding a database for company profile storage.
**Why bad:** Unnecessary for single-user on a single device. Adds infrastructure, migration, backup concerns for <2KB of rarely-changing data.
**Instead:** localStorage on the client, sent in each request body. Server validates but never stores.

---

## Scalability Considerations

| Concern | Current (v1.1) | If Knowledge Grows 5x | If Multi-User (Future) |
|---------|----------------|----------------------|----------------------|
| Knowledge storage | ~15 files in repo, ~15K tokens total | Still manageable as static files; split by jurisdiction if adding non-CA states | Move to CMS or database |
| Token budget | ~3K tokens system prompt per pass avg | ~8K tokens; may need to split some passes or trim knowledge | Same approach per-user |
| Company profile | localStorage, 1 profile | Still fine | Need database + auth |
| Prompt caching | Document cached across passes, system prompts per-pass | Same -- more knowledge = more input tokens but document caching dominates | Same mechanism |
| API costs per analysis | ~$0.55 with caching | ~$0.80 with caching | Linear per user per analysis |

---

## Sources

- [Anthropic Context Windows](https://platform.claude.com/docs/en/build-with-claude/context-windows) -- 200K standard context window for Sonnet 4.5
- [Anthropic Prompt Caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) -- 90% cost reduction on cache hits, 1,024 token minimum checkpoint, cache hierarchy (tools -> system -> messages)
- [Anthropic API Pricing](https://platform.claude.com/docs/en/about-claude/pricing) -- $3/M input, $15/M output for Sonnet 4.5; cache read at 10% of input cost
- [Claude Token-Saving Updates](https://claude.com/blog/token-saving-updates) -- Cache-aware rate limits, simplified caching
- Existing codebase analysis: `api/analyze.ts` (1,537 LOC, 16 passes, Files API upload-once pattern), `src/pages/Settings.tsx` (placeholder UI), `src/types/contract.ts` (Finding interface with legalMeta/scopeMeta), `src/hooks/useContractStore.ts` (in-memory state, no persistence)
