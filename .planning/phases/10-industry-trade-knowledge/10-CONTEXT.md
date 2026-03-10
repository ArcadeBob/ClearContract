# Phase 10: Industry and Trade Knowledge - Context

**Gathered:** 2026-03-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Create trade-specific knowledge modules that make the AI a glazing industry expert — recognizing Division 08 scope boundaries, validating AAMA/ASTM/FGIA standard references, and detecting contract standard form families with deviation flagging. No new infrastructure beyond raising the token budget cap. No UI changes. Follows the same knowledge module pattern established in Phase 9.

</domain>

<decisions>
## Implementation Decisions

### Division 08 scope intelligence
- Full Division 08 coverage: classify ALL sections (doors, frames, hardware, glazing, louvers) as glazing-trade vs non-glazing
- Also flag adjacent division scope-creep: Div 05 (support steel), Div 07 (sealants, waterproofing, firestopping at openings), Div 09 (painting frames)
- Use broader CSI section ranges (2nd/3rd level: 08 40 00, 08 80 00) not Level 4 detail — contracts rarely use Level 4 consistently
- Severity by risk level: non-glazing Div 08 work assigned to sub = High; adjacent division scope-creep = High or Critical depending on cost exposure
- Module teaches Claude which CSI sections belong to the glazing trade and which don't, so the AI can flag scope assignments outside the sub's trade

### AAMA/ASTM standard validation
- Broad ASTM coverage: 40+ standards across glass, glazing, sealants, metals, and testing methods
- AAMA-to-FGIA rebrand: flag AAMA references as outdated (Info/Low severity) noting the 2020 rebrand and current FGIA designation
- Obsolete/superseded standards: severity depends on the standard — safety-related obsolete standards (impact/safety glass test methods) = High; performance standards (air/water infiltration) = Medium; cosmetic standards = Low
- Missing version years on standard references: do NOT flag — too common in construction contracts to be actionable
- Module contains a lookup table of current vs superseded standard numbers with replacement designations

### Contract standard form detection
- Cover AIA A401, ConsensusDocs 750, EJCDC C-520 plus custom/proprietary form detection
- Detection via clause pattern matching: teach Claude signature patterns for each form family (article numbering, characteristic boilerplate phrases, numbering schemes) — no copyrighted form content stored
- Custom/proprietary forms get a general "non-standard form" Info finding
- Only flag sub-unfavorable deviations from standard form defaults — don't flag neutral or sub-favorable changes
- Maps to risk-overview + scope-of-work passes

### Module organization
- 3 modules, one per requirement:
  - `src/knowledge/trade/div08-scope.ts` — Division 08 section classification + adjacent division scope-creep flags
  - `src/knowledge/standards/standards-validation.ts` — AAMA/ASTM/FGIA current vs superseded lookup table
  - `src/knowledge/standards/contract-forms.ts` — Standard form family detection patterns and deviation flagging
- Domain field: div08-scope uses `'trade'`, standards-validation and contract-forms use `'standards'`

### Pass mapping
- `div08-scope` → `scope-of-work`
- `standards-validation` → `scope-of-work`
- `contract-forms` → `risk-overview`, `scope-of-work`
- scope-of-work will have 4 modules total (ca-title24 + 3 new) — at the max-4-per-pass limit
- risk-overview gets 1 module (contract-forms)

### Token budget change
- Raise per-module token cap from 1,500 to 10,000 tokens
- Update `validateTokenBudget()` in `src/knowledge/tokenBudget.ts` with new cap
- Max 4 modules per pass limit remains unchanged
- This eliminates token-fitting constraints for all knowledge modules (regulatory and trade/standards)

### Claude's Discretion
- Exact content wording within each knowledge module
- Which specific ASTM/AAMA/FGIA standards to include in the 40+ standard lookup table
- Clause pattern matching details for form family detection (specific phrases, article patterns)
- Which adjacent-division scope items are most commonly pushed onto glazing subs
- Severity calibration for specific obsolete standards (which are safety-related vs performance vs cosmetic)
- How to structure the "custom/proprietary form" Info finding

</decisions>

<specifics>
## Specific Ideas

- Division 08 scope module should make Claude smart enough to say "Section 08 11 13 (Hollow Metal Doors) is being assigned to you — this is not glazing work" with specific CSI section references
- Adjacent division scope-creep is a real pain point for glazing subs — the sealant/waterproofing (Div 07) and painting frames (Div 09) are the most common disputes
- Standard form detection should NOT store copyrighted content — just teach Claude to recognize the patterns (this is legally safe)
- The AAMA-to-FGIA rebrand flag is informational — the standards themselves didn't change, just the organization name

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `KnowledgeModule` type in `src/knowledge/types.ts`: id, domain ('trade' | 'standards'), title, effectiveDate, reviewByDate, content, tokenEstimate
- `registerModule()` in `src/knowledge/registry.ts`: Map-based module store
- `PASS_KNOWLEDGE_MAP` in `src/knowledge/registry.ts`: All 16 passes with current mappings (4 CA regulatory modules wired)
- `composeSystemPrompt()` in `src/knowledge/index.ts`: Composes base + knowledge + profile
- `validateTokenBudget()` in `src/knowledge/tokenBudget.ts`: Currently enforces 1,500 token cap — to be raised to 10,000
- `src/knowledge/regulatory/` directory with 4 CA modules — established pattern to follow
- Scope-of-work pass already mentions ASTM/AAMA/architectural specs in its system prompt — new modules enhance this

### Established Patterns
- Knowledge modules are TypeScript files exporting `KnowledgeModule` objects with `registerModule()` called at load
- Content written as Claude analysis instructions, not legal reference text (Phase 9 pattern)
- `PASS_KNOWLEDGE_MAP` maps pass names to module ID arrays — modules register, map wires them
- Module registration happens in domain index files (e.g., `src/knowledge/regulatory/index.ts`)

### Integration Points
- `src/knowledge/registry.ts` PASS_KNOWLEDGE_MAP — add div08-scope, standards-validation, contract-forms to their mapped passes
- `src/knowledge/tokenBudget.ts` — raise MAX_TOKENS_PER_MODULE from 1500 to 10000
- `src/knowledge/trade/` — new directory, create div08-scope.ts + index.ts
- `src/knowledge/standards/` — new directory, create standards-validation.ts + contract-forms.ts + index.ts
- `src/knowledge/index.ts` — import new domain index files to trigger registration

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 10-industry-trade-knowledge*
*Context gathered: 2026-03-10*
