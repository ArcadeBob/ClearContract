# Stack Research

**Domain:** Domain intelligence knowledge architecture for contract analysis AI
**Researched:** 2026-03-08
**Confidence:** HIGH

## Context

ClearContract v1.0 ships with 16 analysis passes running on Claude via Vercel serverless. v1.1 adds structured domain knowledge (company profiles, CA regulations, contract standards, industry specs) that loads selectively per analysis pass. This research covers ONLY the stack additions needed for the knowledge architecture -- the existing React/TypeScript/Vite/Tailwind/Anthropic SDK stack is validated and unchanged.

**Key constraint from v1.0:** The project already uses TypeScript modules for schemas, Zod v3 for structured outputs, the Anthropic SDK for API calls, and `localStorage`-equivalent in-memory state. There is no persistence layer and PROJECT.md says none is needed.

## Recommended Stack Additions

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| TypeScript modules (`.ts` files) | existing | Knowledge file format | Type-safe, zero-dependency, tree-shakeable at build time, importable on both client (Settings UI) and server (analysis passes). No parser needed -- Vite and Node handle it natively. Matches existing patterns for schemas and mock data. |
| Anthropic Token Counting API | existing SDK | Token budget management per pass | Free endpoint (`client.messages.countTokens()`) already available in `@anthropic-ai/sdk@^0.78.0`. Returns exact token counts for system prompt + knowledge text before sending to Claude. No new dependency needed. |
| Zod v3 (existing) | ^3.25.76 | Knowledge data validation | Already in project for pass schemas. Reuse for validating company profile data from Settings UI before it reaches the server. |

### Knowledge File Format Decision: TypeScript Objects

**Use TypeScript `.ts` files exporting typed const objects.** Not JSON, not YAML, not Markdown.

Rationale:
- **Type safety at author time**: Knowledge files get TypeScript checking. A YAML typo in a regulation citation is silent; a TS type error is caught at build.
- **Zero parsing overhead**: `import { caLienLaw } from '../knowledge/regulatory/ca-lien-law'` -- no `fs.readFileSync`, no `JSON.parse`, no gray-matter.
- **Selective imports**: Each analysis pass imports only the knowledge modules it needs. Vite tree-shakes unused knowledge from the client bundle. On the server, Node loads only what is imported.
- **No new dependencies**: JSON needs `fs` on server (already available) but loses types. YAML needs `js-yaml` or `gray-matter`. Markdown+frontmatter needs `gray-matter`. TypeScript needs nothing new.
- **Existing pattern**: The project already uses TypeScript for schemas (`src/schemas/analysis.ts`), mock data (`src/data/mockContracts.ts`), and pass definitions (inline in `api/analyze.ts`). Knowledge files are the same pattern.

Example knowledge file:
```typescript
// src/knowledge/company/profile.ts
import type { CompanyProfile } from '../../types/knowledge';

export const defaultCompanyProfile: CompanyProfile = {
  name: 'Clean Glass Installation Inc.',
  insuranceLimits: {
    generalLiability: { perOccurrence: 1_000_000, aggregate: 2_000_000 },
    umbrella: 5_000_000,
    autoLiability: 1_000_000,
    workersComp: 'statutory',
  },
  bondingCapacity: 2_500_000,
  licenses: ['CSLB C-17 Glazing'],
  capabilities: ['curtain wall', 'storefronts', 'skylights', 'shower enclosures'],
  maxProjectSize: 3_000_000,
  maxRetainageAcceptable: 5,
};
```

Example knowledge-to-prompt rendering:
```typescript
// src/knowledge/company/profile.ts (continued)
export function companyProfileToPrompt(profile: CompanyProfile): string {
  return `## Company Context
Company: ${profile.name}
Insurance: GL $${profile.insuranceLimits.generalLiability.perOccurrence.toLocaleString()}/$${profile.insuranceLimits.generalLiability.aggregate.toLocaleString()}, Umbrella $${profile.insuranceLimits.umbrella.toLocaleString()}
Bonding capacity: $${profile.bondingCapacity.toLocaleString()}
Licenses: ${profile.licenses.join(', ')}
Capabilities: ${profile.capabilities.join(', ')}
Max project size: $${profile.maxProjectSize.toLocaleString()}
Max acceptable retainage: ${profile.maxRetainageAcceptable}%

When evaluating findings, compare contract requirements against these actual company capabilities. Flag gaps where contract requirements exceed company limits. Suppress findings about requirements the company already meets.`;
}
```

### Token Budget Strategy

| Strategy | How It Works | Why |
|----------|-------------|-----|
| Per-pass knowledge mapping | Each pass definition gains a `knowledgeKeys: string[]` field listing which knowledge modules to inject | Only relevant knowledge enters each pass's system prompt. The insurance pass gets company insurance limits + CA insurance reqs; the scope pass gets AAMA standards + Division 08 specs. |
| Static text pre-computation | Knowledge modules export a `toPromptText()` function that renders structured data into a prompt-optimized text block | Avoids JSON serialization overhead in prompts. Plain text with headers is more token-efficient than JSON structure in the context window. |
| Token counting gate | Before sending a pass, call `client.messages.countTokens()` to verify system prompt + knowledge + document fits within the context window | Free API call (verified: separate rate limits from message creation, Tier 1 gets 100 RPM for counting). Prevents silent truncation. If over budget, log a warning and trim lowest-priority knowledge sections. |
| Budget constant | `MAX_KNOWLEDGE_TOKENS_PER_PASS = 2000` (configurable) | Knowledge supplements the contract analysis; it should not dominate. 2000 tokens is approximately 1500 words -- enough for company profile + relevant regulatory sections for any single pass. |

**Token counting API details (verified from official docs):**
```typescript
// Already available in @anthropic-ai/sdk@^0.78.0
const tokenCount = await client.messages.countTokens({
  model: 'claude-sonnet-4-5-20250929', // same model as analysis
  system: pass.systemPrompt + '\n\n' + knowledgeText,
  messages: [{ role: 'user', content: pass.userPrompt }],
});
// tokenCount.input_tokens gives the exact count
```
- Free to use, subject to RPM limits (100 RPM Tier 1, 2000 RPM Tier 2)
- Separate rate limits from message creation -- does not count against analysis quota
- Accepts same structure as messages.create (system, messages, tools)
- Returns `{ input_tokens: number }`

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@anthropic-ai/sdk` (existing) | ^0.78.0 | `messages.countTokens()` for token budget | Every pass execution -- verify knowledge injection stays within budget |
| `zod` (existing) | ^3.25.76 | Validate company profile edits from Settings UI | When user submits updated company data via Settings page |
| No new runtime dependencies | -- | -- | The knowledge architecture requires zero new npm packages |

### Settings UI for Company Data

No form library needed. The company profile form is a single-page settings section with approximately 15 fields (text inputs, number inputs, multi-select for capabilities). React controlled components with `useState` are sufficient -- this is the existing pattern in `Settings.tsx`.

Rationale for NOT adding React Hook Form or similar:
- The Settings page already uses `useState` for playbook toggles and notification preferences
- Company profile is one form with straightforward fields (no dynamic fields, no multi-step wizard, no complex conditional validation)
- Adding a form library for one form creates an inconsistency with existing patterns
- Zod validation on submit (already in project) handles the validation layer cleanly

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| TypeScript strict mode (existing) | Type-check knowledge files | Knowledge types defined in `src/types/knowledge.ts` get full compile-time checking |
| Vite (existing) | Build-time tree-shaking | Client bundle only includes knowledge types/shapes used in Settings UI, not full regulatory text (that stays server-side) |

## Knowledge Architecture: File Layout

```
src/
  types/
    knowledge.ts                # CompanyProfile, RegulatoryKnowledge, ContractStandard, TradeSpec, etc.
  knowledge/
    index.ts                    # Knowledge registry: maps pass names -> knowledge module keys
    loader.ts                   # resolveKnowledge(passName, companyProfile?) -> prompt string
    company/
      profile.ts                # Default company data + toPromptText()
      thresholds.ts             # Bid/no-bid thresholds, risk tolerance settings
    regulatory/
      ca-lien-law.ts            # CA Civil Code lien provisions (mechanics liens, stop notices)
      ca-prevailing-wage.ts     # DIR/prevailing wage requirements, certified payroll
      ca-title-24.ts            # Energy/building code for glazing
      ca-osha.ts                # Cal/OSHA safety for glazing operations
    standards/
      aia-patterns.ts           # AIA A201/A401 clause patterns + red flags
      consensusdocs-patterns.ts # ConsensusDocs 750 clause patterns
      ejcdc-patterns.ts         # EJCDC clause patterns
    trade/
      aama-standards.ts         # AAMA 501, 502, 503 glazing performance standards
      division-08.ts            # CSI Division 08 specification patterns
      glass-types.ts            # Product/material reference data
    rules/
      severity-overrides.ts     # Domain-specific severity evaluation criteria
      false-positive-filters.ts # Rules for suppressing findings against company capabilities
```

## Integration Points

### How Knowledge Enters Analysis Passes

Current flow (v1.0):
```
Pass definition -> static systemPrompt string -> Claude API
```

v1.1 flow:
```
Pass definition -> knowledgeKeys[] -> knowledge loader -> toPromptText() per module ->
  concatenated to system prompt -> token count check -> Claude API
```

The change is localized to `api/analyze.ts`:
1. `AnalysisPass` interface gains `knowledgeKeys?: string[]`
2. New `resolveKnowledge()` function maps keys to prompt text, accepts optional company profile override
3. `runAnalysisPass()` calls `resolveKnowledge()`, appends to system prompt, checks token budget via `countTokens()`
4. System prompt becomes: `pass.systemPrompt + '\n\n---\n\n## Domain Reference\n' + resolvedKnowledgeText`

Example pass-to-knowledge mapping:
```typescript
{
  name: 'legal-indemnification',
  knowledgeKeys: ['company-insurance', 'ca-lien-law'],
  // The insurance pass gets company insurance limits so Claude can assess
  // whether indemnification clauses create coverage gaps
}

{
  name: 'scope-of-work',
  knowledgeKeys: ['company-capabilities', 'aama-standards', 'division-08'],
  // The scope pass gets trade knowledge to identify unusual specs
  // and company capabilities to flag scope beyond what the sub does
}

{
  name: 'legal-labor-compliance',
  knowledgeKeys: ['ca-prevailing-wage', 'ca-osha'],
  // Labor compliance gets CA-specific regulatory knowledge
}
```

### How Company Data Reaches Knowledge Files

Settings UI flow:
1. User edits company profile in new Settings section (added below existing "Review Playbooks")
2. On save, data is validated with Zod `CompanyProfileSchema`
3. Data is stored in `localStorage` (key: `clearcontract-company-profile`)
4. On analysis, client reads from `localStorage` and includes in POST body to `/api/analyze`
5. Server-side `resolveKnowledge()` uses the profile data to generate prompt text, falling back to defaults if not provided

**Why localStorage:**
- PROJECT.md explicitly states "no persistence needed" and in-memory-only state is acceptable
- Company profile is small (under 2KB JSON)
- `localStorage` is slightly more persistent than `useState` (survives page refresh but not browser clear)
- Single user, single browser -- no sync concerns
- Matches the minimal persistence philosophy of the existing architecture

### Why NOT a Database for Knowledge Files

The knowledge is **reference data authored by the developer**, not user-generated content. It consists of CA regulations, AAMA standards, AIA clause patterns -- information that changes when laws or standards change, not per analysis. This data belongs in source code (TypeScript modules committed to git), not in a database.

The only user-editable knowledge is the company profile, which is small enough for localStorage.

### Why NOT a Vector Database or RAG

Total knowledge base will be under 50,000 tokens. Each pass needs only 1,000-3,000 tokens of relevant knowledge. The knowledge is curated and categorized, not searched. A vector database adds latency (embedding + similarity search), infrastructure dependency, and complexity for zero benefit over direct TypeScript imports with a per-pass mapping table.

## Installation

```bash
# No new packages needed. Zero additions to package.json.
# The knowledge architecture uses only existing dependencies:
# - TypeScript (compile-time types and imports)
# - Zod v3 (company profile validation)
# - @anthropic-ai/sdk (token counting via messages.countTokens())
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| TypeScript modules for knowledge | JSON files with `fs.readFileSync` | If knowledge files need to be edited by non-developers via a CMS (not the case -- single developer-user) |
| TypeScript modules for knowledge | YAML with gray-matter | If knowledge files contain rich prose with metadata frontmatter (not the case -- data is structured objects) |
| TypeScript modules for knowledge | Markdown with frontmatter | If knowledge needs to be rendered as human-readable documentation (not the case -- it is prompt injection text) |
| localStorage for company profile | Vercel KV / Upstash Redis | If data must persist across browsers or devices (explicitly out of scope -- single user, single machine) |
| localStorage for company profile | SQLite via Turso | If multi-user access or complex queries needed (out of scope) |
| Anthropic token counting API | js-tiktoken local estimation | If you need offline/client-side token counting without API calls (not needed -- counting happens server-side right before the API call, and the API is free) |
| No form library | React Hook Form | If Settings grows to 5+ complex forms with dynamic arrays, conditional validation, and multi-step wizards |
| Per-pass knowledge mapping | RAG with embeddings | If knowledge base grows beyond 200k tokens and becomes too large for manual categorization (unlikely for this domain) |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Vector database (Pinecone, Chroma, Weaviate) | Knowledge is curated reference data under 50k tokens total. Vector search adds latency and infrastructure for zero benefit. | Direct TypeScript imports with per-pass mapping |
| LangChain / LlamaIndex | RAG orchestration frameworks for what is simple prompt concatenation. The app already calls Claude directly with the Anthropic SDK. | Direct Anthropic SDK calls (existing) |
| gray-matter / js-yaml | Adds a parsing dependency for what TypeScript handles natively with better type safety. gray-matter is designed for content authoring (blogs, docs), not structured knowledge injection. | TypeScript `.ts` knowledge files |
| MongoDB / PostgreSQL / SQLite | No persistence requirement. Single user. Company profile is 2KB. Reference data is in source code. | localStorage for company profile, TypeScript modules for reference data |
| React Hook Form / Formik / TanStack Form | One settings form with ~15 fields does not justify a form library dependency. Existing `useState` pattern is consistent with the rest of the codebase. | React controlled components (existing pattern) |
| Separate microservice for knowledge | Knowledge is static data read at analysis time. A service adds network latency, deployment complexity, and infrastructure cost for no benefit. | Co-located TypeScript modules imported at build time |
| Environment variables for company data | Cannot be edited from the UI. Requires redeployment to update. | localStorage + API request body |
| @anthropic-ai/tokenizer | Deprecated for Claude 3+ models. Only provides rough approximations. | Official `messages.countTokens()` API endpoint (free, exact) |

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `@anthropic-ai/sdk@^0.78.0` | `messages.countTokens()` | Token counting available in current SDK. Method: `client.messages.countTokens({ model, system, messages })`. Free, separate rate limits from message creation (100 RPM Tier 1). |
| `zod@^3.25.76` | `zod-to-json-schema@^3.25.1` | Existing compatibility. Use Zod for `CompanyProfileSchema` validation. No upgrade to Zod v4 needed -- project uses v3 with `zod-to-json-schema` bridge pattern. |
| TypeScript `^5.5.4` | `as const satisfies` | Use `as const satisfies KnowledgeModule` for type-safe knowledge definitions with literal type inference |

## Sources

- [Anthropic Token Counting API docs](https://platform.claude.com/docs/en/build-with-claude/token-counting) -- Verified: `messages.countTokens()` is free, supports system prompts + messages + tools, available in current SDK, Tier 1 = 100 RPM (HIGH confidence)
- [Anthropic Pricing](https://platform.claude.com/docs/en/about-claude/pricing) -- Token counting is free, separate rate limits from message creation (HIGH confidence)
- Existing codebase analysis: `api/analyze.ts` (1571 LOC, 16 passes, `AnalysisPass` interface), `Settings.tsx` (useState pattern), `package.json` (current deps) -- Direct file inspection (HIGH confidence)
- [gray-matter npm](https://www.npmjs.com/package/gray-matter) -- Evaluated and rejected: adds parsing dependency for what TypeScript handles natively (HIGH confidence)
- [React Hook Form](https://react-hook-form.com/) -- Evaluated and rejected: overkill for single settings form in existing useState codebase (HIGH confidence)

---
*Stack research for: ClearContract v1.1 Domain Intelligence*
*Researched: 2026-03-08*
