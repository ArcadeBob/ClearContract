# Phase 7: Knowledge Architecture and Company Profile - Research

**Researched:** 2026-03-08
**Domain:** TypeScript module system, localStorage persistence, prompt composition
**Confidence:** HIGH

## Summary

Phase 7 builds two independent subsystems that share zero runtime dependencies on each other: (1) a knowledge module infrastructure with registry, per-pass selective loading, token budget enforcement, and prompt builder, and (2) a company profile Settings UI backed by localStorage. No domain knowledge content is authored -- only the infrastructure. No pipeline integration -- Phase 8 wires knowledge into the analysis passes.

The codebase already has a well-structured multi-pass analysis pipeline (`api/analyze.ts`) with 16 named passes, each with its own `systemPrompt` and `userPrompt`. The prompt builder must compose on top of this existing structure. The Settings page (`src/pages/Settings.tsx`) is a complete rewrite -- all existing decorative sections (playbook toggles, integrations, notifications, AI engine stats) are removed and replaced with company profile data entry cards.

**Primary recommendation:** Keep the knowledge module system as pure TypeScript -- no new dependencies. Use a central registry object that maps pass names to knowledge module IDs. The prompt builder is a pure function that takes a base system prompt, pass name, and company profile, then returns the composed prompt. Token counting uses a simple heuristic (chars / 4) since exact tokenization would require a new dependency.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Remove ALL existing decorative sections from Settings: Integrations (Procore/BuildOps), Notifications, AI Engine stats, and Review Playbooks toggles
- Settings page becomes purely company profile -- clean slate
- Layout: grouped cards (white rounded-xl with header + content) -- one card per data group: Insurance, Bonding, Licenses, Capabilities
- Auto-save on change -- each field saves to localStorage immediately when changed, no Save button
- Company profile defaults pre-populated with Clean Glass Installation data (exact values specified in CONTEXT.md)
- Modules live in `src/knowledge/`
- Subdirectories by domain: `regulatory/`, `trade/`, `standards/` (for Phase 9-10 content)
- Phase 7 creates infrastructure only -- no domain knowledge content, no stubs
- Knowledge modules are TypeScript files with effective date and review-by date metadata
- 1,500 token cap per knowledge file, max 4 files per pass
- Hard reject before API call when token budget exceeded -- developer must fix the knowledge file

### Claude's Discretion
- Pass-to-knowledge mapping approach (central registry vs in pass definitions vs in knowledge modules) -- pick cleanest for prompt builder consumption
- Whether to compose knowledge on top of existing inline systemPrompt strings or extract base prompts into separate files -- balance clean architecture with minimal risk to working pipeline
- Company capabilities defaults (employee count, service area, typical project size)
- Exact field layout within each Settings card
- localStorage key naming convention
- Knowledge module TypeScript interface design

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ARCH-01 | System loads domain knowledge as TypeScript modules with per-pass selective mapping | Knowledge module interface + registry pattern documented below |
| ARCH-02 | Each analysis pass receives only its relevant knowledge files (not everything) | Central registry maps pass names to module IDs; prompt builder filters |
| ARCH-03 | Token budget enforcement validates knowledge injection fits within 1500-token cap per pass before API call | Token estimation heuristic + hard reject pattern |
| ARCH-04 | Knowledge modules display effective date and review-by date metadata | KnowledgeModule interface with effectiveDate and reviewByDate fields |
| ARCH-05 | Prompt builder composes base prompt + domain knowledge + company profile into system prompt | composeSystemPrompt pure function pattern |
| PROF-01 | User can enter insurance coverage limits (GL, auto, WC, umbrella) in Settings | Insurance card with labeled fields, auto-save hook |
| PROF-02 | User can enter bonding capacity (single and aggregate limits) in Settings | Bonding card with two numeric fields |
| PROF-03 | User can enter license info (C-17 number, DIR registration) in Settings | Licenses card with structured fields |
| PROF-04 | User can enter company capabilities (employee count, service area, typical project size range) in Settings | Capabilities card with mixed field types |
| PROF-05 | Company profile persists in localStorage across sessions | useCompanyProfile hook with localStorage read/write |
| PROF-06 | Settings pre-populated with Clean Glass Installation defaults | DEFAULT_COMPANY_PROFILE constant with exact values from CONTEXT.md |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18.x | UI framework | Already in project |
| TypeScript | strict mode | Type safety for knowledge modules | Already in project |
| Tailwind CSS | existing | Settings page styling | Already in project |
| Framer Motion | existing | Card entry animations | Already in project |
| Lucide React | existing | Section icons (Shield, Scale, HardHat, etc.) | Already in project |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| localStorage API | Browser native | Company profile persistence | PROF-05 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| localStorage | IndexedDB | Overkill for ~2KB of profile data |
| chars/4 token heuristic | tiktoken/gpt-tokenizer | Adds dependency for marginal accuracy gain on a hard cap -- not worth it |
| Central registry object | Decorators / module-level registration | Registry is simpler, more explicit, easier to test |

**Installation:**
```bash
# No new packages needed -- zero new npm dependencies (locked decision)
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── knowledge/
│   ├── index.ts              # Exports: KnowledgeModule interface, registry, composeSystemPrompt
│   ├── registry.ts           # Central pass-to-module mapping + token validation
│   ├── types.ts              # KnowledgeModule interface, CompanyProfile type
│   ├── tokenBudget.ts        # Token estimation + budget enforcement
│   ├── regulatory/           # Empty dir -- Phase 9 content
│   ├── trade/                # Empty dir -- Phase 10 content
│   └── standards/            # Empty dir -- future content
├── hooks/
│   ├── useContractStore.ts   # Existing -- unchanged
│   └── useCompanyProfile.ts  # NEW: localStorage-backed company profile hook
├── types/
│   └── contract.ts           # Existing -- add CompanyProfile type (or keep in knowledge/types.ts)
└── pages/
    └── Settings.tsx           # Complete rewrite -- company profile cards
```

### Pattern 1: Knowledge Module Interface
**What:** TypeScript interface defining the shape of all knowledge modules
**When to use:** Every knowledge file must conform to this interface
**Example:**
```typescript
// src/knowledge/types.ts
export interface KnowledgeModule {
  id: string;                    // Unique identifier, e.g., 'ca-mechanics-lien'
  domain: 'regulatory' | 'trade' | 'standards';
  title: string;                 // Human-readable name
  effectiveDate: string;         // ISO date: when this knowledge became current
  reviewByDate: string;          // ISO date: when content should be reviewed for accuracy
  content: string;               // The actual knowledge text injected into prompts
  tokenEstimate: number;         // Pre-computed chars/4 estimate
}
```

### Pattern 2: Central Registry
**What:** A single object mapping pass names to arrays of knowledge module IDs
**When to use:** The prompt builder looks up which modules apply to a given pass
**Example:**
```typescript
// src/knowledge/registry.ts
import type { KnowledgeModule } from './types';

// Maps pass name -> array of knowledge module IDs (max 4 per pass)
export const PASS_KNOWLEDGE_MAP: Record<string, string[]> = {
  'risk-overview': [],
  'dates-deadlines': [],
  'scope-of-work': [],
  'legal-indemnification': [],
  'legal-payment-contingency': [],
  'legal-liquidated-damages': [],
  'legal-retainage': [],
  'legal-insurance': [],
  'legal-termination': [],
  'legal-flow-down': [],
  'legal-no-damage-delay': [],
  'legal-lien-rights': [],
  'legal-dispute-resolution': [],
  'legal-change-order': [],
  'verbiage-analysis': [],
  'labor-compliance': [],
};

// Module store -- populated by Phase 9-10 when modules are authored
const moduleStore = new Map<string, KnowledgeModule>();

export function registerModule(mod: KnowledgeModule): void {
  moduleStore.set(mod.id, mod);
}

export function getModulesForPass(passName: string): KnowledgeModule[] {
  const ids = PASS_KNOWLEDGE_MAP[passName] ?? [];
  return ids.map(id => {
    const mod = moduleStore.get(id);
    if (!mod) throw new Error(`Knowledge module '${id}' not found in registry`);
    return mod;
  });
}
```

### Pattern 3: Token Budget Enforcement
**What:** Pure function that validates total knowledge injection size before API call
**When to use:** Called by prompt builder; throws if budget exceeded
**Example:**
```typescript
// src/knowledge/tokenBudget.ts
const TOKEN_CAP_PER_MODULE = 1500;
const MAX_MODULES_PER_PASS = 4;

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function validateTokenBudget(modules: KnowledgeModule[]): void {
  if (modules.length > MAX_MODULES_PER_PASS) {
    throw new Error(
      `Pass has ${modules.length} knowledge modules; max is ${MAX_MODULES_PER_PASS}`
    );
  }
  for (const mod of modules) {
    const tokens = estimateTokens(mod.content);
    if (tokens > TOKEN_CAP_PER_MODULE) {
      throw new Error(
        `Knowledge module '${mod.id}' exceeds token cap: ${tokens} estimated tokens (cap: ${TOKEN_CAP_PER_MODULE}). Developer must reduce content.`
      );
    }
  }
}
```

### Pattern 4: Prompt Builder (composeSystemPrompt)
**What:** Pure function that assembles final system prompt from base + knowledge + profile
**When to use:** Called in analyze.ts before each API call, replacing direct use of `pass.systemPrompt`
**Example:**
```typescript
// src/knowledge/index.ts
import type { KnowledgeModule } from './types';
import type { CompanyProfile } from './types';
import { getModulesForPass } from './registry';
import { validateTokenBudget } from './tokenBudget';

export function composeSystemPrompt(
  basePrompt: string,
  passName: string,
  companyProfile?: CompanyProfile
): string {
  const modules = getModulesForPass(passName);

  // Hard reject if budget exceeded -- developer error, not runtime recovery
  validateTokenBudget(modules);

  let composed = basePrompt;

  if (modules.length > 0) {
    composed += '\n\n## Domain Knowledge\n';
    for (const mod of modules) {
      composed += `\n### ${mod.title} (effective: ${mod.effectiveDate})\n${mod.content}\n`;
    }
  }

  if (companyProfile) {
    composed += '\n\n## Company Profile\n';
    composed += formatCompanyProfile(companyProfile);
  }

  return composed;
}
```

### Pattern 5: useCompanyProfile Hook with Auto-Save
**What:** React hook that loads from localStorage on mount, saves per-field on change
**When to use:** Settings page consumes this hook
**Example:**
```typescript
// src/hooks/useCompanyProfile.ts
import { useState, useCallback, useEffect } from 'react';
import type { CompanyProfile } from '../knowledge/types';
import { DEFAULT_COMPANY_PROFILE } from '../knowledge/types';

const STORAGE_KEY = 'clearcontract:company-profile';

export function useCompanyProfile() {
  const [profile, setProfile] = useState<CompanyProfile>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? { ...DEFAULT_COMPANY_PROFILE, ...JSON.parse(stored) } : DEFAULT_COMPANY_PROFILE;
    } catch {
      return DEFAULT_COMPANY_PROFILE;
    }
  });

  const updateField = useCallback(<K extends keyof CompanyProfile>(
    key: K,
    value: CompanyProfile[K]
  ) => {
    setProfile(prev => {
      const next = { ...prev, [key]: value };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { profile, updateField };
}
```

### Anti-Patterns to Avoid
- **Putting knowledge content in Phase 7:** The decision is infrastructure only. No stubs, no placeholder content. Empty arrays in `PASS_KNOWLEDGE_MAP` are correct.
- **Adding the prompt builder call to analyze.ts in Phase 7:** Phase 8 wires it in. Phase 7 only builds and exports the function.
- **Building a token counter dependency:** chars/4 is sufficient for a hard cap. The purpose is catching developer errors (oversized module files), not precise billing.
- **Using Context API or Redux for company profile:** The project uses useState hooks exclusively. A localStorage-backed hook is the correct pattern.
- **Nested localStorage keys:** Use a single JSON blob under one key, not separate keys per field. This avoids partial-state corruption and simplifies the load path.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Token counting | BPE tokenizer | `Math.ceil(text.length / 4)` heuristic | Close enough for a hard cap; exact count not needed |
| State persistence | Custom sync engine | localStorage with JSON.stringify/parse | Profile is ~2KB, single user, no conflicts |
| Form state management | Form library (react-hook-form, formik) | Direct useState + onChange handlers | Only ~15 fields, no validation rules complex enough to justify a library |

**Key insight:** This phase has zero new dependencies by design. Everything is pure TypeScript and browser APIs.

## Common Pitfalls

### Pitfall 1: localStorage Not Available
**What goes wrong:** Private browsing mode or storage quota exceeded throws on `localStorage.setItem`
**Why it happens:** Safari private mode, corporate browser policies
**How to avoid:** Wrap all localStorage access in try/catch. Fall back to in-memory defaults gracefully.
**Warning signs:** Uncaught DOMException in console on first Settings page load

### Pitfall 2: Stale Defaults Overwriting User Data
**What goes wrong:** Code always spreads defaults over stored data, overwriting user edits when new default fields are added
**Why it happens:** Using `{ ...stored, ...defaults }` instead of `{ ...defaults, ...stored }`
**How to avoid:** Always spread defaults first, then stored values on top: `{ ...DEFAULT_COMPANY_PROFILE, ...JSON.parse(stored) }`. This preserves user edits while adding new default fields.
**Warning signs:** User changes revert after a code deploy that adds new profile fields

### Pitfall 3: Auto-Save Causing Excessive Writes
**What goes wrong:** Saving to localStorage on every keystroke in text fields creates performance issues
**Why it happens:** Direct onChange -> localStorage.setItem for text inputs
**How to avoid:** Use `onBlur` for text/number inputs (save when field loses focus), not `onChange`. For toggles and selects, `onChange` is fine since they change once per interaction.
**Warning signs:** Typing lag in text fields on the Settings page

### Pitfall 4: Knowledge Module Import in Browser Context
**What goes wrong:** Knowledge modules with Node.js-specific features break the Vite build
**Why it happens:** Modules in `src/knowledge/` are imported by both `api/analyze.ts` (Node/Vercel) and potentially by the Settings UI for metadata display
**How to avoid:** Keep knowledge modules as pure data (no fs, no path, no process). The `src/knowledge/` directory is shared code that must work in both contexts.
**Warning signs:** Vite build errors referencing Node built-in modules

### Pitfall 5: Breaking the Existing Analysis Pipeline
**What goes wrong:** Modifying `AnalysisPass` interface or `ANALYSIS_PASSES` array in Phase 7 breaks the working pipeline
**Why it happens:** Eagerness to integrate prompt builder before Phase 8
**How to avoid:** Phase 7 builds and exports infrastructure only. The `composeSystemPrompt` function exists but is NOT called from `api/analyze.ts` yet. Phase 8 does the wiring.
**Warning signs:** Analysis failures after Phase 7 deployment

### Pitfall 6: Forgetting to Include All 16 Passes in Registry
**What goes wrong:** Pass names in registry don't match actual pass names in analyze.ts
**Why it happens:** Manual string matching between two files
**How to avoid:** Use the exact pass names from the existing `ANALYSIS_PASSES` array: `risk-overview`, `dates-deadlines`, `scope-of-work`, `legal-indemnification`, `legal-payment-contingency`, `legal-liquidated-damages`, `legal-retainage`, `legal-insurance`, `legal-termination`, `legal-flow-down`, `legal-no-damage-delay`, `legal-lien-rights`, `legal-dispute-resolution`, `legal-change-order`, `verbiage-analysis`, `labor-compliance`
**Warning signs:** Runtime error "pass not found in registry" during Phase 8 integration

## Code Examples

### Company Profile Type Definition
```typescript
// src/knowledge/types.ts
export interface CompanyProfile {
  // Insurance
  glPerOccurrence: string;       // e.g., "$1,000,000"
  glAggregate: string;           // e.g., "$2,000,000"
  umbrellaLimit: string;         // e.g., "$1,000,000"
  autoLimit: string;             // e.g., "$1,000,000"
  wcStatutoryState: string;      // e.g., "CA"
  wcEmployerLiability: string;   // e.g., "$1,000,000"

  // Bonding
  bondingSingleProject: string;  // e.g., "$500,000"
  bondingAggregate: string;      // e.g., "$1,000,000"

  // Licenses
  contractorLicenseType: string; // e.g., "C-17"
  contractorLicenseNumber: string; // e.g., "965590"
  contractorLicenseExpiry: string; // e.g., "2026-09-30"
  dirRegistration: string;       // e.g., "PW-LR-1001072989"
  dirExpiry: string;             // e.g., "2026-06-30"
  sbeCertId: string;             // e.g., "2034373"
  sbeCertIssuer: string;         // e.g., "DGS"
  lausdVendorNumber: string;     // e.g., "1000012976"

  // Capabilities
  employeeCount: string;         // e.g., "15-25"
  serviceArea: string;           // e.g., "Southern California"
  typicalProjectSizeMin: string; // e.g., "$50,000"
  typicalProjectSizeMax: string; // e.g., "$2,000,000"
}

export const DEFAULT_COMPANY_PROFILE: CompanyProfile = {
  glPerOccurrence: '$1,000,000',
  glAggregate: '$2,000,000',
  umbrellaLimit: '$1,000,000',
  autoLimit: '$1,000,000',
  wcStatutoryState: 'CA',
  wcEmployerLiability: '$1,000,000',
  bondingSingleProject: '$500,000',
  bondingAggregate: '$1,000,000',
  contractorLicenseType: 'C-17',
  contractorLicenseNumber: '965590',
  contractorLicenseExpiry: '2026-09-30',
  dirRegistration: 'PW-LR-1001072989',
  dirExpiry: '2026-06-30',
  sbeCertId: '2034373',
  sbeCertIssuer: 'DGS',
  lausdVendorNumber: '1000012976',
  employeeCount: '15-25',
  serviceArea: 'Southern California',
  typicalProjectSizeMin: '$50,000',
  typicalProjectSizeMax: '$2,000,000',
};
```

### Settings Card Pattern (Matches Existing Styling)
```typescript
// Pattern for each settings card -- matches existing motion.section style
<motion.section
  initial={{ opacity: 0, y: 12 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.1 * index }}
  className="bg-white rounded-xl border border-slate-200 overflow-hidden"
>
  <div className="px-6 py-5 border-b border-slate-100">
    <div className="flex items-center space-x-3">
      <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
        <Shield className="w-5 h-5" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Insurance Coverage</h2>
        <p className="text-sm text-slate-500 mt-0.5">General liability, umbrella, auto, and workers' compensation limits</p>
      </div>
    </div>
  </div>
  <div className="px-6 py-5 grid grid-cols-2 gap-4">
    {/* Field pairs */}
    <div>
      <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
        GL Per Occurrence
      </label>
      <input
        type="text"
        value={profile.glPerOccurrence}
        onBlur={(e) => updateField('glPerOccurrence', e.target.value)}
        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
  </div>
</motion.section>
```

### formatCompanyProfile for Prompt Injection
```typescript
// src/knowledge/index.ts
function formatCompanyProfile(profile: CompanyProfile): string {
  return [
    `Insurance: GL ${profile.glPerOccurrence}/${profile.glAggregate}, ` +
    `Umbrella ${profile.umbrellaLimit}, Auto ${profile.autoLimit}, ` +
    `WC ${profile.wcStatutoryState} statutory / ${profile.wcEmployerLiability} EL`,
    `Bonding: ${profile.bondingSingleProject} single / ${profile.bondingAggregate} aggregate`,
    `License: ${profile.contractorLicenseType} #${profile.contractorLicenseNumber} (exp ${profile.contractorLicenseExpiry})`,
    `DIR: ${profile.dirRegistration} (exp ${profile.dirExpiry})`,
    `SBE: ${profile.sbeCertId} (${profile.sbeCertIssuer})`,
    `Capabilities: ~${profile.employeeCount} employees, ${profile.serviceArea}, ` +
    `typical projects ${profile.typicalProjectSizeMin}-${profile.typicalProjectSizeMax}`,
  ].join('\n');
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Inline system prompts in analyze.ts | Composed prompts via builder (Phase 7 infra + Phase 8 wiring) | This phase | Enables domain knowledge injection |
| No persistence | localStorage for company profile | This phase | Data survives browser refresh |
| Decorative Settings page | Functional company profile page | This phase | Settings becomes useful |

**Deprecated/outdated:**
- All existing Settings page content (playbook toggles, integrations, notifications, AI Engine stats): decorative placeholders being removed entirely

## Open Questions

1. **Should CompanyProfile type live in `src/knowledge/types.ts` or `src/types/contract.ts`?**
   - What we know: The existing types file houses contract domain types. CompanyProfile is a new domain.
   - What's unclear: Phase 8 needs CompanyProfile accessible from both `api/analyze.ts` and React components.
   - Recommendation: Put it in `src/knowledge/types.ts` since company profile is conceptually part of the knowledge system. Both server and client can import from `src/`.

2. **Should base prompts be extracted from `api/analyze.ts` into separate files?**
   - What we know: Each pass has long inline systemPrompt strings (50-100 lines each). Extracting would clean up analyze.ts but creates risk of breaking the working pipeline.
   - What's unclear: Whether the prompt builder in Phase 8 will need to modify base prompts or just append to them.
   - Recommendation: Leave inline prompts in Phase 7. Phase 8 can extract if needed when wiring in the prompt builder. Minimizes risk to working pipeline.

3. **Capabilities defaults: employee count, service area, typical project size**
   - What we know: User said "Claude's discretion for reasonable small CA glazing sub defaults"
   - Recommendation: 15-25 employees, Southern California service area, $50K-$2M typical project range. These are reasonable for a small-to-mid C-17 glazing subcontractor.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None configured (per CLAUDE.md) |
| Config file | none -- see Wave 0 |
| Quick run command | `npm run build` (type-check + build) |
| Full suite command | `npm run build && npm run lint` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ARCH-01 | Knowledge modules load with per-pass mapping | manual | Build passes with knowledge imports | N/A |
| ARCH-02 | Pass receives only its relevant knowledge | manual | Verify getModulesForPass returns correct subset | N/A |
| ARCH-03 | Token budget rejects oversized modules | manual | Call validateTokenBudget with oversized content | N/A |
| ARCH-04 | Modules have effective/review-by dates | manual | TypeScript compiler enforces interface | N/A |
| ARCH-05 | Prompt builder composes base + knowledge + profile | manual | Call composeSystemPrompt and inspect output | N/A |
| PROF-01 | Insurance fields in Settings | manual | Visual inspection in browser | N/A |
| PROF-02 | Bonding fields in Settings | manual | Visual inspection in browser | N/A |
| PROF-03 | License fields in Settings | manual | Visual inspection in browser | N/A |
| PROF-04 | Capabilities fields in Settings | manual | Visual inspection in browser | N/A |
| PROF-05 | Profile persists in localStorage | manual | Edit field, refresh page, verify value persists | N/A |
| PROF-06 | Defaults pre-populated | manual | Open Settings on fresh browser, verify defaults | N/A |

### Sampling Rate
- **Per task commit:** `npm run build` (catches type errors)
- **Per wave merge:** `npm run build && npm run lint`
- **Phase gate:** Build passes + manual verification of persistence and defaults

### Wave 0 Gaps
- No test framework exists -- all validation is manual + TypeScript compiler
- `npm run build` is the primary automated gate (type checking via strict mode)

*(No test infrastructure to create -- project explicitly has no test framework per CLAUDE.md)*

## Sources

### Primary (HIGH confidence)
- `api/analyze.ts` -- examined full analysis pipeline, all 16 pass names, AnalysisPass interface
- `src/pages/Settings.tsx` -- examined existing Settings page structure and styling patterns
- `src/hooks/useContractStore.ts` -- examined existing state management pattern
- `src/types/contract.ts` -- examined existing type definitions
- `CLAUDE.md` -- project conventions, tech stack, no test framework confirmation

### Secondary (MEDIUM confidence)
- localStorage API behavior in private browsing -- well-documented browser behavior

### Tertiary (LOW confidence)
- Token estimation heuristic (chars/4) -- commonly cited approximation, varies by content type. Sufficient for a hard cap use case.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- zero new dependencies, all existing tech
- Architecture: HIGH -- patterns derived directly from existing codebase analysis
- Pitfalls: HIGH -- based on direct code inspection and known localStorage behaviors

**Research date:** 2026-03-08
**Valid until:** 2026-04-08 (stable -- no external dependencies to change)
