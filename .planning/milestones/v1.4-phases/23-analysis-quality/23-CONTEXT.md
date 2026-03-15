# Phase 23: Analysis Quality - Context

**Gathered:** 2026-03-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Strengthen the 16-pass analysis pipeline to produce more accurate, better-scored, and more comprehensive findings. Adds cross-pass synthesis, new CA knowledge modules, category-weighted scoring, verbiage pass refocus, Title 24 update with staleness warnings, and structured bid signal matching. No new UI pages or features beyond score tooltip and synthesis findings display.

</domain>

<decisions>
## Implementation Decisions

### Cross-pass synthesis (PIPE-01)
- 17th pass runs as a Claude API call AFTER all 16 passes complete and findings are deduplicated
- Receives all deduplicated findings as input, identifies compound risks spanning multiple clause types
- Creates DISTINCT NEW findings (not annotations on existing findings) — e.g., "Cash Flow Squeeze: Payment contingency + retainage + LD combined"
- Synthesis findings use High severity for visual prominence (amber badge)
- Synthesis findings are EXCLUDED from risk score computation — informational only, no score inflation
- Synthesis findings also excluded from the score breakdown tooltip
- Category for synthesis findings: new "Compound Risk" or similar designation to distinguish from pass findings

### Category-weighted scoring (PIPE-03)
- Replace flat severity weighting with category-weighted formula
- Two tiers: all legal/financial categories at 1.0x weight, scope and compliance categories at 0.75x weight
- Synthetic error findings (pass failures) excluded from score computation entirely — still appear as Critical for visibility but contribute 0 to score
- Risk score tooltip on hover shows category breakdown: "Financial: X pts, Legal: Y pts, Scope: Z pts"
- Synthesis findings excluded from tooltip breakdown
- Keep existing logarithmic scaling and severity base weights (Critical=25, High=15, Medium=8, Low=3, Info=0)

### Knowledge module strategy (PIPE-02, PIPE-05, PIPE-06)
- Create 4 new CA knowledge modules:
  1. **CA insurance law** — CIC 11580+, additional insured requirements, subrogation waivers, GL/WC minimums for glazing → legal-insurance pass
  2. **Public works payment** — Prompt Payment Act, retention limits on public projects, stop notice rights → legal-payment-contingency and legal-retainage passes
  3. **Dispute resolution statutes** — CCP 1281+, mandatory arbitration enforceability, venue/choice-of-law → legal-dispute-resolution pass
  4. **Liquidated damages law** — CC 1671, enforceability tests, time extension rights → legal-liquidated-damages pass
- Create 1 new trade knowledge module:
  5. **Glazing sub protections** — standard protections checklist (force majeure, limitation of liability, warranty disclaimer, right to cure, notice provisions, weather delay, material escalation) → verbiage-analysis pass
- Universal staleness warning system: every knowledge module gets effectiveDate and expirationDate metadata
- Stale modules generate Info-severity findings: "CA Insurance Law module last updated [date] — verify findings against current statutes"
- ca-title24 updated to 2025 code cycle as part of staleness system rollout
- Bid signal bonding factor: fix matchesBonding() to use structured metadata fields (e.g., clauseType or legalMeta) instead of title.includes('bond') text search — consistent with the other 4 factors

### Verbiage pass refocus (PIPE-04)
- Prompt-level deduplication: update verbiage pass system prompt to explicitly exclude issues covered by legal passes (indemnification, payment, insurance, retainage, termination, etc.)
- Refocus on MISSING standard protections — flag what's ABSENT, not what's present
- Use industry-standard clause checklist approach: force majeure, limitation of liability, warranty disclaimer, right to cure, notice provisions, weather delay allowance, material escalation clause
- New "glazing-sub-protections" knowledge module injected into verbiage pass with the checklist
- Keep finding limit at 3-8 per contract
- Retain existing issueType enum but shift emphasis from ambiguous-language toward missing-protection

### Claude's Discretion
- Exact compound risk patterns for synthesis pass to detect (the specific combinations)
- Synthesis pass schema design and finding format
- Knowledge module token budget and content depth (within existing 10000 cap)
- How to surface the bonding structured metadata field (clauseType vs legalMeta extension)
- Staleness expiration intervals per module (based on how frequently underlying law changes)
- Score tooltip layout and formatting
- Title 24 content update details for 2025 code cycle

</decisions>

<specifics>
## Specific Ideas

- Synthesis findings should feel like executive-summary-level insights: "These 3 clauses together create a cash flow problem" — not just restating individual findings
- Score tooltip should be concise: category name + point contribution, not a full breakdown of every finding
- Staleness warnings should be actionable: include the module name and date so user knows which findings to double-check
- Verbiage pass should feel like a checklist audit: "This contract is missing X, Y, Z protections" rather than "This language is vague"

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `api/scoring.ts` (47 lines): Current flat severity scoring — needs category weight layer added on top
- `src/utils/bidSignal.ts` (96 lines): 5-factor computation — matchesBonding() is the only text-search factor to fix
- `src/knowledge/registry.ts`: Map-based module registry — add new modules here with pass assignments
- `src/knowledge/index.ts`: System prompt composition with domain knowledge injection — already handles multi-module passes
- `api/merge.ts` (377 lines): Result merging and dedup — synthesis pass integrates after dedup phase
- Existing knowledge modules (regulatory/, trade/, standards/): Follow established pattern for new modules

### Established Patterns
- Knowledge modules export `{ id, name, domain, content, effectiveDate }` — add expirationDate field
- Each pass has its own Zod schema in src/schemas/ — synthesis pass needs a new schema
- Pass results flow through merge.ts conversion functions (convertLegalFinding, convertScopeFinding)
- Company profile injected into 6 passes via PASSES_RECEIVING_PROFILE set
- MAX_MODULES_PER_PASS = 4 (scope-of-work is at capacity)

### Integration Points
- `api/analyze.ts`: Orchestrates all 16 passes — synthesis pass runs after Promise.allSettled
- `api/merge.ts`: computeRiskScore() needs category weight logic; synthesis findings need exclusion flag
- `src/knowledge/registry.ts`: New modules registered with pass assignments
- `src/components/RiskScore.tsx` or equivalent: Tooltip rendering for score breakdown
- `src/types/contract.ts`: Finding type may need isSynthesis or sourceType field for exclusion logic

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 23-analysis-quality*
*Context gathered: 2026-03-14*
