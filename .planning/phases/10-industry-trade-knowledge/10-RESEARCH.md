# Phase 10: Industry and Trade Knowledge - Research

**Researched:** 2026-03-10
**Domain:** Glazing industry knowledge modules (CSI Division 08, ASTM/AAMA/FGIA standards, contract standard forms)
**Confidence:** HIGH

## Summary

Phase 10 adds three knowledge modules following the identical pattern established in Phase 9 (CA Regulatory Knowledge). The modules are pure TypeScript content files that register with the existing knowledge infrastructure -- no new dependencies, no UI changes, no architectural changes. The only infrastructure change is raising `TOKEN_CAP_PER_MODULE` from 1,500 to 10,000.

The research domain is glazing industry knowledge: CSI MasterFormat Division 08 section classification, ASTM/AAMA/FGIA standards validation, and construction contract standard form detection. All three modules are written as Claude analysis instructions (not reference text), following the Phase 9 content pattern. The established module pattern (export `KnowledgeModule` object, call `registerModule()`, wire into `PASS_KNOWLEDGE_MAP`) is well-proven across 4 existing modules.

**Primary recommendation:** Follow the Phase 9 module pattern exactly. The implementation risk is near zero -- this is content authoring within a proven framework. The main effort is domain research accuracy for the content itself.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- 3 modules: `src/knowledge/trade/div08-scope.ts`, `src/knowledge/standards/standards-validation.ts`, `src/knowledge/standards/contract-forms.ts`
- Domain fields: div08-scope uses `'trade'`, standards-validation and contract-forms use `'standards'`
- Pass mapping: div08-scope -> scope-of-work; standards-validation -> scope-of-work; contract-forms -> risk-overview, scope-of-work
- Scope-of-work will have 4 modules total (ca-title24 + 3 new) -- at the max-4-per-pass limit
- Division 08 coverage: classify ALL sections (doors, frames, hardware, glazing, louvers) as glazing-trade vs non-glazing
- Adjacent division scope-creep: Div 05 (support steel), Div 07 (sealants, waterproofing, firestopping at openings), Div 09 (painting frames)
- CSI section ranges at Level 2/3 (08 40 00, 08 80 00), not Level 4
- Severity: non-glazing Div 08 work = High; adjacent division scope-creep = High or Critical depending on cost exposure
- Broad ASTM coverage: 40+ standards across glass, glazing, sealants, metals, testing methods
- AAMA-to-FGIA rebrand: flag AAMA references as Info/Low severity noting the 2020 rebrand
- Obsolete/superseded standards: safety-related = High; performance = Medium; cosmetic = Low
- Missing version years on standard references: do NOT flag
- Contract forms: AIA A401, ConsensusDocs 750, EJCDC C-520 plus custom/proprietary detection
- Detection via clause pattern matching (signature patterns, boilerplate phrases, numbering schemes) -- no copyrighted content stored
- Custom/proprietary forms get "non-standard form" Info finding
- Only flag sub-unfavorable deviations from standard form defaults
- Token cap raised from 1,500 to 10,000
- Max 4 modules per pass limit unchanged

### Claude's Discretion
- Exact content wording within each knowledge module
- Which specific ASTM/AAMA/FGIA standards to include in the 40+ standard lookup table
- Clause pattern matching details for form family detection
- Which adjacent-division scope items are most commonly pushed onto glazing subs
- Severity calibration for specific obsolete standards
- How to structure the "custom/proprietary form" Info finding

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TRADE-01 | Scope pass receives Division 08 section knowledge and flags non-glazing scope assigned to sub | Division 08 section classification research provides full CSI section breakdown; module maps to scope-of-work pass |
| TRADE-02 | Technical passes validate AAMA/ASTM standard references are current (flag obsolete, handle AAMA-to-FGIA rebrand) | ASTM/AAMA/FGIA standards research provides current versions, supersession chains, and rebrand details; module maps to scope-of-work pass |
| TRADE-03 | Analysis detects contract standard form family (AIA A401, ConsensusDocs 750, EJCDC) and flags deviations from standard defaults | Contract form structure research provides article numbering patterns and key clause differences; module maps to risk-overview + scope-of-work passes |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | (project version) | Knowledge module files | Existing project stack |

### Supporting
No new dependencies. All three modules are pure TypeScript content files using existing `KnowledgeModule` type and `registerModule()` infrastructure.

### Alternatives Considered
None applicable -- the knowledge module pattern is locked and proven across 4 existing modules.

**Installation:**
```bash
# No new packages needed
```

## Architecture Patterns

### Recommended Project Structure
```
src/knowledge/
  trade/
    index.ts              # registerModule(div08Scope)
    div08-scope.ts        # Division 08 scope classification module
  standards/
    index.ts              # registerModule(standardsValidation); registerModule(contractForms)
    standards-validation.ts  # ASTM/AAMA/FGIA standards lookup module
    contract-forms.ts     # Contract standard form detection module
```

### Pattern 1: Knowledge Module File (established Phase 9 pattern)
**What:** Each module exports a `KnowledgeModule` object and is registered via its domain index file.
**When to use:** Every knowledge module follows this exact pattern.
**Example:**
```typescript
// Source: src/knowledge/regulatory/ca-title24.ts (existing)
import type { KnowledgeModule } from '../types';

const content = `MODULE TITLE
Analysis instructions for glazing subcontractor contract review.

SECTION 1:
- Instruction point 1
- Instruction point 2

ANALYSIS INSTRUCTIONS:
- Flag X as SEVERITY when condition Y`;

export const moduleName: KnowledgeModule = {
  id: 'module-id',
  domain: 'trade',  // or 'standards'
  title: 'Module Title',
  effectiveDate: '2026-03-01',
  reviewByDate: '2027-03-01',
  content,
  tokenEstimate: Math.ceil(content.length / 4),
};
```

### Pattern 2: Domain Index File (established Phase 9 pattern)
**What:** Each domain directory has an `index.ts` that imports modules and calls `registerModule()`.
**When to use:** Every new domain directory needs one.
**Example:**
```typescript
// Source: src/knowledge/regulatory/index.ts (existing)
import { registerModule } from '../registry';
import { moduleName } from './module-file';

registerModule(moduleName);
```

### Pattern 3: Pass Knowledge Map Wiring
**What:** `PASS_KNOWLEDGE_MAP` in registry.ts maps pass names to module ID arrays.
**When to use:** After creating modules, wire them into the correct passes.
**Example (target state):**
```typescript
export const PASS_KNOWLEDGE_MAP: Record<string, string[]> = {
  'risk-overview': ['contract-forms'],
  'scope-of-work': ['ca-title24', 'div08-scope', 'standards-validation', 'contract-forms'],
  // ... rest unchanged
};
```

### Pattern 4: Registration Import in analyze.ts
**What:** The serverless function must import domain index files to trigger module registration.
**When to use:** Each new domain directory needs an import in `api/analyze.ts`.
**Example:**
```typescript
// In api/analyze.ts, add alongside existing import:
import '../src/knowledge/regulatory/index';
import '../src/knowledge/trade/index';
import '../src/knowledge/standards/index';
```

### Anti-Patterns to Avoid
- **Storing copyrighted contract form text:** Only teach Claude recognition patterns (article numbering, characteristic phrases), never store actual form content.
- **Over-granular CSI references:** Use Level 2/3 (08 40 00) not Level 4 -- contracts rarely use Level 4 consistently.
- **Flagging missing version years:** Too common in construction contracts to be actionable -- user explicitly decided against this.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Module registration | Custom module loading | Existing `registerModule()` + `PASS_KNOWLEDGE_MAP` | Infrastructure already handles O(1) lookups |
| Token estimation | Custom tokenizer | Existing `Math.ceil(content.length / 4)` heuristic | Consistent with all existing modules |
| System prompt composition | Manual string concatenation | Existing `composeSystemPrompt()` | Handles formatting, budget validation, profile injection |

## Common Pitfalls

### Pitfall 1: Exceeding 4 modules per pass on scope-of-work
**What goes wrong:** scope-of-work will have 4 modules (ca-title24 + 3 new). Adding any more would violate `MAX_MODULES_PER_PASS`.
**Why it happens:** Future phases might try to add another module to scope-of-work.
**How to avoid:** This phase fills the scope-of-work pass to capacity. Document this constraint clearly.
**Warning signs:** `validateTokenBudget()` throws at runtime.

### Pitfall 2: Forgetting to import domain index in analyze.ts
**What goes wrong:** Modules register but never get loaded because `import '../src/knowledge/trade/index'` is missing from the serverless function entry point.
**Why it happens:** Registration is side-effect-based -- the import triggers `registerModule()` calls.
**How to avoid:** Add import lines for both `trade/index` and `standards/index` in `api/analyze.ts`.
**Warning signs:** Runtime error: "Knowledge module 'div08-scope' mapped to pass 'scope-of-work' but not found in registry."

### Pitfall 3: Token cap change not applied before module creation
**What goes wrong:** New modules with content > 1,500 tokens (which is expected) fail validation.
**Why it happens:** `TOKEN_CAP_PER_MODULE` is still 1500 when the module is loaded.
**How to avoid:** Change `TOKEN_CAP_PER_MODULE` to 10000 in `tokenBudget.ts` FIRST, before adding new modules.
**Warning signs:** `validateTokenBudget()` throws "exceeds token cap" error.

### Pitfall 4: Content too instructional vs too reference-like
**What goes wrong:** Module content reads like a reference document instead of Claude analysis instructions.
**Why it happens:** Natural tendency to write lookup tables rather than prompt instructions.
**How to avoid:** Follow Phase 9 pattern -- content tells Claude what to look for and how to flag it, not just what standards exist.
**Warning signs:** Content says "Standard X covers Y" instead of "When you encounter a reference to Standard X, check whether..."

## Code Examples

### Division 08 Scope Classification (content structure)
```typescript
// Content structure for div08-scope.ts
const content = `DIVISION 08 SCOPE CLASSIFICATION FOR GLAZING SUBCONTRACTORS
Analysis instructions for identifying scope assignments outside the glazing trade.

GLAZING TRADE SECTIONS (core glazing sub scope):
- 08 40 00 Entrances, Storefronts, and Curtain Walls (and subsections 08 41 00, 08 42 00, 08 44 00, 08 45 00)
- 08 50 00 Windows (08 51 00 Metal Windows)
- 08 60 00 Roof Windows and Skylights (08 62 00, 08 63 00)
- 08 80 00 Glazing (08 81 00 Glass Glazing, 08 83 00 Mirrors, 08 84 00 Plastic Glazing, 08 88 00 Special Function Glazing)

NON-GLAZING DIV 08 SECTIONS (flag as High when assigned to glazing sub):
- 08 10 00 Doors and Frames (08 11 00 Metal Doors, 08 14 00 Wood Doors, 08 17 00 Preassembled Door/Frame Units)
- 08 30 00 Specialty Doors (08 31 00 Access Doors, 08 33 00 Coiling Doors, 08 34 00 Special Function Doors, 08 36 00 Panel Doors, 08 38 00 Traffic Doors)
- 08 70 00 Hardware (08 71 00 Door Hardware, 08 74 00 Access Control Hardware)
- 08 90 00 Louvers and Vents

ADJACENT DIVISION SCOPE-CREEP (flag when assigned to glazing sub):
- Div 05 (Metals): Support steel for curtain walls, window framing support -- High severity
- Div 07 (Thermal/Moisture): Sealants at glazing perimeters (07 92 00), waterproofing at openings (07 27 00), firestopping at glazing penetrations (07 84 00) -- High to Critical depending on liability exposure
- Div 09 (Finishes): Painting window/door frames (09 91 00) -- High severity

ANALYSIS INSTRUCTIONS:
- When contract scope of work references sections outside the glazing trade sections listed above, generate a finding
- Quote the specific CSI section number and description in the finding
- For non-glazing Div 08 work: severity = High, category = "Scope of Work"
- For adjacent division scope-creep: severity = High (standard) or Critical (when liability/warranty exposure is significant)
- Note: 08 35 00 Folding/Opening Glass Walls and 08 32 00 Framed/Frameless Glass Doors ARE glazing scope`;
```

### ASTM/AAMA/FGIA Standards Validation (content structure)
```typescript
// Content structure for standards-validation.ts
// The module content should include lookup tables organized by category:

// GLASS STANDARDS (current versions):
// - ASTM C1036-21: Flat Glass specification
// - ASTM C1048-19e1: Heat-Strengthened and Fully Tempered Flat Glass
// - ASTM C1172-19: Laminated Architectural Flat Glass
// - ASTM E2190-19: Insulating Glass Unit Performance and Evaluation

// PERFORMANCE TESTING:
// - ASTM E330/E330M: Structural Performance of Exterior Windows/Doors/Curtain Walls (wind load)
// - ASTM E1300-16: Determining Load Resistance of Glass in Buildings
// - ASTM E283: Rate of Air Leakage
// - ASTM E331: Water Penetration (static pressure)
// - ASTM E547: Water Penetration (cyclic pressure)
// - ASTM E1105: Field Testing Water Penetration

// SEALANTS AND GLAZING MATERIALS:
// - ASTM C920-18: Elastomeric Joint Sealants
// - ASTM C1193: Use of Joint Sealants
// - ASTM C1369: Secondary Seal for IG Units

// INSTALLATION:
// - ASTM E2112: Installation of Exterior Windows, Doors, Skylights

// SAFETY:
// - ASTM C1048 (tempered glass) -- safety-related, obsolete reference = High
// - 16 CFR 1201 (CPSC safety glazing) -- federal regulation

// AAMA/FGIA STANDARDS:
// - AAMA 501.1 -> still current (water penetration field test for curtain walls)
// - AAMA 501.2 -> still current (quality assurance spray test)
// - AAMA 502 -> still current (field testing windows/doors)
// - AAMA 506 -> still current (impact/cycle testing)
// - AAMA 611 -> FGIA 611 (anodized aluminum) -- flag AAMA reference as outdated
// - AAMA/WDMA/CSA 101/I.S.2/A440 -> now NAFS (North American Fenestration Standard) -- major rebrand

// AAMA-TO-FGIA REBRAND NOTE:
// As of January 1, 2020, AAMA merged with IGMA to form FGIA.
// Flag: Any reference to "AAMA" standards = Info/Low finding noting rebrand.
// The standards content didn't change, only the organization name.
```

### Contract Form Detection (content structure)
```typescript
// Content structure for contract-forms.ts
// Detection patterns (NOT copyrighted content, just structural signatures):

// AIA A401-2017 SIGNATURES:
// - References "AIA Document A201" as General Conditions
// - Uses "Contractor" and "Subcontractor" (not "Constructor")
// - Article numbering: Articles 1-15 with section notation (e.g., Section 1.1, 1.2)
// - Characteristic phrases: "Subcontract Sum", "Architect" role prominent
// - References to other AIA documents (A201, A101, A701)

// CONSENSUSDOCS 750 SIGNATURES:
// - Section numbering: decimal notation (3.1.1, 3.2.1, 8.1, 8.3.4)
// - Uses "Constructor" not "Contractor" in some editions
// - Characteristic: "Subcontract Amount" (not "Subcontract Sum")
// - Has explicit stop-work rights provision after 7-day notice
// - Three compensation methods: fixed-price, unit prices, time-and-material
// - ConsensusDocs endorsement organizations referenced

// EJCDC C-520 SIGNATURES:
// - Uses "Owner" and "Contractor" terminology
// - References EJCDC C-700 Standard General Conditions
// - Engineer-centric (vs Architect-centric in AIA)
// - Paragraph numbering with decimals
// - Characteristic: "Stipulated Price" terminology

// SUB-UNFAVORABLE DEVIATIONS TO FLAG:
// AIA A401: pay-if-paid language (default is pay-when-paid), removed retainage reduction provisions, added broad indemnification
// ConsensusDocs 750: removed stop-work rights, removed matching retainage rate, added extensive withholding grounds beyond default
// EJCDC: modified dispute resolution to favor GC, removed notice provisions
// Custom forms: general "non-standard form" Info finding -- higher review scrutiny recommended
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| AAMA standards numbering | FGIA standards numbering | January 2020 | Standards still valid, organization renamed. Contracts referencing "AAMA" are technically outdated but functionally equivalent |
| AAMA + IGMA separate organizations | FGIA (merged) | January 2020 | AAMA 611 -> FGIA 611, etc. |
| ASTM C1036-16 | ASTM C1036-21 | April 2021 | Latest flat glass specification |
| ASTM C1048-12 | ASTM C1048-19e1 | 2019 | Latest tempered glass specification |
| AIA A401-2007 | AIA A401-2017 | 2017 | Current standard subcontract form |
| ConsensusDocs 750 (2012) | ConsensusDocs 750 (2017/updated) | 2017+ | Current standard subcontract form |

**Deprecated/outdated:**
- AAMA as organization name: replaced by FGIA in 2020; standards content unchanged
- ASTM E2190-08 (old IG unit spec): superseded by E2190-19
- Pre-2017 AIA A401: superseded by A401-2017

## Division 08 Section Research

### Complete Division 08 Breakdown (from 4specs.com and ARCAT)

**Glazing Trade Sections (core scope):**
- 08 40 00: Entrances, Storefronts, and Curtain Walls
  - 08 41 00: Entrances and Storefronts
  - 08 42 00: Entrances
  - 08 44 00: Curtain Wall and Glazed Assemblies
  - 08 45 00: Sloped Glazing Assemblies
- 08 50 00: Windows
  - 08 51 00: Metal Windows
  - 08 52 00: Wood Windows (borderline -- typically not glazing sub scope)
  - 08 53 00: Plastic/Vinyl Windows (borderline)
  - 08 56 00: Special Function Windows
- 08 60 00: Roof Windows and Skylights
  - 08 62 00: Unit Skylights
  - 08 63 00: Metal-Framed Skylights
- 08 80 00: Glazing
  - 08 81 00: Glass Glazing
  - 08 83 00: Mirrors
  - 08 84 00: Plastic Glazing
  - 08 85 00: Glazing Accessories
  - 08 87 00: Window Films
  - 08 88 00: Special Function Glazing
- 08 35 00: Folding/Opening Glass Walls (glazing scope)
- 08 32 00: Framed/Frameless Glass Doors (glazing scope)

**Non-Glazing Div 08 Sections (flag when assigned to glazing sub):**
- 08 10 00: Doors and Frames (metal doors, wood doors, plastic doors)
  - 08 11 00: Metal Doors and Frames (hollow metal)
  - 08 14 00: Wood Doors
  - 08 15 00: Plastic/Composite Doors
  - 08 17 00: Preassembled Door/Frame Units
- 08 30 00: Specialty Doors (non-glass)
  - 08 31 00: Access Doors and Panels
  - 08 33 00: Coiling Doors and Grilles
  - 08 34 00: Special Function Doors
  - 08 36 00: Panel Doors
  - 08 38 00: Traffic Doors
  - 08 39 00: Pressure-Resistant Doors
- 08 70 00: Hardware
  - 08 71 00: Door Hardware
  - 08 74 00: Access Control Hardware
  - 08 75 00: Window Hardware (borderline -- may be glazing scope if furnish-and-install)
- 08 90 00: Louvers and Vents

**Confidence:** HIGH -- sourced from 4specs.com Division 08 listing and ARCAT MasterFormat database, cross-referenced with UFGS 08 81 00 glazing specification.

## Contract Form Detection Research

### AIA A401-2017 Structure
- 15 Articles with decimal section numbering (Section 1.1, 1.2, etc.)
- References AIA A201-2017 General Conditions
- Uses "Subcontract Sum" terminology
- "Architect" is a defined role
- Article 10: Payment, Article 11: Progress Payments, Article 12: Final Payment
- Key sub-unfavorable deviations: pay-if-paid language (default is pay-when-paid), removed retainage reduction, broadened indemnification

### ConsensusDocs 750
- Uses decimal section numbering (3.1.1, 3.2.1, 8.3.4)
- "Subcontract Amount" (not "Sum")
- Article 6: Compensation, Article 8: Payment, Article 10: Subcontractor Defaults
- Has explicit 7-day stop-work rights for non-payment
- Three compensation methods (fixed-price, unit, T&M)
- Matching retainage rate provision (GC-to-Sub matches Owner-to-GC)
- Key sub-unfavorable deviations: removed stop-work rights, removed retainage matching, expanded withholding grounds

### EJCDC C-520/C-700
- Engineer-centric (vs Architect in AIA)
- References EJCDC C-700 Standard General Conditions
- "Stipulated Price" terminology
- Paragraph-based numbering with decimals

**Confidence:** MEDIUM -- sourced from Sacks Tierney comparison article, AIA instructions pages, ConsensusDocs guidebook references. Could not access actual form documents (copyrighted). Pattern details are sufficient for teaching Claude recognition without storing copyrighted text.

## Open Questions

1. **Exact ASTM standard versions for the 40+ table**
   - What we know: Core glass/glazing standards are well-documented (C1036, C1048, C1172, E2190, E330, E1300, C920)
   - What's unclear: The complete list of 40+ standards across sealants, metals, and testing methods
   - Recommendation: Implementer should compile from UFGS 08 81 00 glazing specification and standard architectural spec sections 08 80 00. The module content can be iteratively refined. Start with the 20-25 most commonly referenced standards, which are identifiable from training knowledge.

2. **EJCDC subcontract form numbering**
   - What we know: EJCDC C-520 exists, uses C-700 General Conditions
   - What's unclear: Detailed article structure (could not access document)
   - Recommendation: The detection pattern can rely on terminology ("Stipulated Price", "Engineer", EJCDC C-700 references) rather than article numbering. This is sufficient for form family detection.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None configured (per CLAUDE.md) |
| Config file | None |
| Quick run command | `npm run build` (TypeScript compilation check) |
| Full suite command | `npm run build && npm run lint` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TRADE-01 | div08-scope module loads and registers; scope-of-work pass receives it | smoke | `npm run build` (compilation) | Wave 0 |
| TRADE-02 | standards-validation module loads and registers; scope-of-work pass receives it | smoke | `npm run build` (compilation) | Wave 0 |
| TRADE-03 | contract-forms module loads and registers; risk-overview + scope-of-work passes receive it | smoke | `npm run build` (compilation) | Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run build`
- **Per wave merge:** `npm run build && npm run lint`
- **Phase gate:** Full build + lint green, manual verification via `vercel dev` with test PDF

### Wave 0 Gaps
None -- no test framework exists. Validation is via TypeScript compilation (`npm run build`) and manual testing with real contracts through `vercel dev`. This matches the established pattern from Phases 7-9.

## Sources

### Primary (HIGH confidence)
- Existing codebase: `src/knowledge/types.ts`, `src/knowledge/registry.ts`, `src/knowledge/tokenBudget.ts`, `src/knowledge/regulatory/` -- established module pattern
- [4specs.com Division 08](https://www.4specs.com/s/08.html) -- Complete Division 08 section breakdown
- [ARCAT MasterFormat Division 08](https://www.arcat.com/content-type/product/openings-08) -- Section classification
- [ASTM Store C1036-21](https://store.astm.org/c1036-21.html) -- Current flat glass standard version
- [FGIA Official Site](https://fgiaonline.org/) -- AAMA-to-FGIA rebrand confirmation

### Secondary (MEDIUM confidence)
- [Sacks Tierney: AIA A401 vs ConsensusDocs 750](https://www.sackstierney.com/blog/compare-and-contrast-the-aia-a-401-and-the-consensusdocs-750-forms-of-subcontract/) -- Contract form clause comparison
- [Glass Magazine: AAMA/IGMA become FGIA](https://www.glassmagazine.com/news/aama-and-igma-officially-combine-fenestration-and-glazing-industry-alliance) -- Rebrand date and details
- [FGIA Store: AAMA standards](https://store.fgiaonline.org/) -- Standard availability and current designations

### Tertiary (LOW confidence)
- EJCDC C-520 article structure -- could not access actual document; detection relies on terminology patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, proven pattern
- Architecture: HIGH -- exact replication of Phase 9 pattern with 4 existing exemplars
- Division 08 content: HIGH -- well-documented CSI standard, multiple sources agree
- Standards validation content: MEDIUM -- core standards verified, full 40+ list needs implementer domain knowledge
- Contract form detection: MEDIUM -- clause comparison verified, exact article structures partially verified
- Pitfalls: HIGH -- based on direct code inspection of existing infrastructure

**Research date:** 2026-03-10
**Valid until:** 2026-04-10 (stable domain -- CSI, ASTM standards change slowly)
