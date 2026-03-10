# Phase 7: Knowledge Architecture and Company Profile - Context

**Gathered:** 2026-03-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the knowledge module infrastructure (TypeScript module system, registry, prompt builder with per-pass selective loading, token budget enforcement) and the company profile Settings UI with localStorage persistence. No domain knowledge content yet — Phase 9-10 fill the modules. No pipeline integration yet — Phase 8 wires knowledge into analysis.

</domain>

<decisions>
## Implementation Decisions

### Settings page overhaul
- Remove ALL existing decorative sections: Integrations (Procore/BuildOps), Notifications, AI Engine stats, and Review Playbooks toggles
- Settings page becomes purely company profile — clean slate
- Playbook toggles can return in a future phase if/when they actually control pass execution
- Layout: grouped cards (white rounded-xl with header + content) — one card per data group: Insurance, Bonding, Licenses, Capabilities
- Auto-save on change — each field saves to localStorage immediately when changed, no Save button

### Company profile defaults (Clean Glass Installation)
- **GL:** $1M per occurrence / $2M aggregate
- **Umbrella:** $1M umbrella/excess liability
- **Auto:** $1M combined single limit
- **Workers' Comp:** CA statutory limits, $1M employer's liability
- **Bonding:** $500K single project limit / $1M aggregate
- **CA Contractors License:** C-17 | #965590 | Expires 9-30-2026
- **SBE Certification:** ID 2034373, issued by DGS
- **DIR Registration:** PW-LR-1001072989 | Expires 6-30-2026
- **LAUSD Vendor/SAP Number:** 1000012976
- **Capabilities:** Claude's discretion for reasonable small CA glazing sub defaults (employee count, service area, typical project size range)

### Knowledge module organization
- Modules live in `src/knowledge/`
- Subdirectories by domain: `regulatory/`, `trade/`, `standards/` (for Phase 9-10 content)
- Phase 7 creates infrastructure only — no domain knowledge content, no stubs
- Knowledge modules are TypeScript files with effective date and review-by date metadata
- 1,500 token cap per knowledge file, max 4 files per pass

### Prompt builder composition
- Hard reject before API call when token budget exceeded — developer must fix the knowledge file
- Phase 7 builds infrastructure only — no domain content until Phase 9-10

### Claude's Discretion
- Pass-to-knowledge mapping approach (central registry vs in pass definitions vs in knowledge modules) — pick cleanest for prompt builder consumption
- Whether to compose knowledge on top of existing inline systemPrompt strings or extract base prompts into separate files — balance clean architecture with minimal risk to working pipeline
- Company capabilities defaults (employee count, service area, typical project size)
- Exact field layout within each Settings card
- localStorage key naming convention
- Knowledge module TypeScript interface design

</decisions>

<specifics>
## Specific Ideas

- License data is real and should be pre-populated exactly as provided (C-17 #965590, DIR PW-LR-1001072989, SBE 2034373, LAUSD 1000012976)
- Insurance/bonding values are real company numbers — these will be compared against contract requirements in Phase 8
- Settings page should feel clean — the old decorative content (fake integrations, fake model stats) was placeholder and should be completely removed

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- Settings page (`src/pages/Settings.tsx`): Existing card pattern with `motion.section`, `rounded-xl`, `border-slate-200` — reuse styling pattern but replace all content
- Lucide icons: Shield, Scale, HardHat, DollarSign already imported — relevant for insurance/bonding/license sections
- Framer Motion staggered entry animations (`delay: 0.1 * index`) — established pattern for cards

### Established Patterns
- State management: `useState` hooks, no Redux/Context — company profile will need its own hook or extend `useContractStore`
- No localStorage usage exists yet — this will be the first localStorage integration
- Tailwind utility classes for all styling, `.glass-panel` custom class available
- Inter font, color-coded severity scheme (won't apply to Settings but maintains consistency)

### Integration Points
- `src/pages/Settings.tsx` — complete rewrite of page content
- `api/analyze.ts` — prompt builder will modify how `systemPrompt` is consumed in the `AnalysisPass` interface
- `src/types/contract.ts` — may need company profile type definitions
- New: `src/knowledge/` directory tree
- New: prompt builder function (likely in `src/knowledge/` or `api/`)
- `src/hooks/` — may need a `useCompanyProfile` hook for localStorage read/write

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-knowledge-architecture-and-company-profile*
*Context gathered: 2026-03-08*
