# Feature Research: v3.0 Scope Intelligence

**Domain:** Glazing subcontract review — estimator-grade scope intelligence
**Researched:** 2026-04-05
**Confidence:** MEDIUM-HIGH (grounded in industry references + existing v2.2 pipeline capability)

---

## Context Read

- `.planning/PROJECT.md` — v3.0 milestone scope confirmed (multi-doc input, submittal tracking, spec reconciliation, exclusion stress-test, quantity signals, bid/contract reconciliation, cross-contract scope trends)
- `src/knowledge/trade/div08-scope.ts` — depth expected: CSI numbers (08 40 00 family), per-section severity rules, scope-creep flags by adjacent division
- `src/knowledge/standards/standards-validation.ts` — depth expected: standard-by-standard current versions, superseded versions, AAMA→FGIA rebrand context, severity rules by standard type
- `src/knowledge/trade/`, `src/knowledge/regulatory/`, `src/knowledge/standards/` — 13 existing modules covering CA regulatory (lien, PW, Cal/OSHA, Title 24, insurance law, dispute res, liquidated damages, public works payment), trade (Div 08 scope, glazing-sub-protections), standards (standards-validation, contract-forms)
- `api/passes.ts` scope-of-work pass (lines 138-195) — current scope pass extracts inclusions / exclusions / spec refs / scope rules / gaps / ambiguities with severity + negotiationPosition + actionPriority; scope pass is at `MAX_MODULES_PER_PASS` capacity (4 modules)

---

## Feature Landscape

### Table Stakes (Scope-Intel Tool Must Have These)

Features any estimator-grade scope review tool is expected to deliver. Missing = tool feels like a toy vs. the v2.2 legal review it already ships.

| Feature | Why Expected | Complexity | Notes / Dependencies |
|---|---|---|---|
| **Submittal register extraction** (list every submittal item with type: shop drawing, product data, sample, mock-up, warranty, QC plan, closeout doc) | Every glazing PM maintains a submittal log; #1 schedule-risk artifact because glass lead times are 8-14 weeks | LOW | New clause-style pass. Similar shape to existing `date-extraction` pass. Table-stakes fields: submittal name, type, spec ref, who submits, who reviews, due relative to NTP / mobilization / fabrication release, review duration allowed, resubmittal handling clause |
| **Submittal lead-time / schedule conflict flags** (compute: submittal due + review cycle + resubmittal cycle + fab lead time vs. installation milestone) | Late approvals are THE glazing scheduling killer. Industry rule of thumb: 10-14 bus days per review cycle, plan for ≥1 revision cycle, glass lead time 8-14 weeks | MEDIUM | Depends on submittal register extraction + existing date-extraction pass. Pure arithmetic once both structured outputs exist; no new AI pass. Flag when `submittalDue + 2*reviewCycle + fabLead > installationStart` |
| **Spec section cite reconciliation** (given "Section 08 41 13" or "ASTM E1300", tell user what's typically required under that section and whether subcontract scope references it) | Subs frequently sign contracts saying "comply with Section 08 44 13" without reading what 08 44 13 requires (performance testing, mock-ups, warranties, structural calcs) | MEDIUM | New knowledge module: CSI Div 08 section → typical required deliverables mapping (084113 storefront → shop drawings, product data, samples, mock-ups, 2-yr warranty, AAMA 501.2 field water test, structural calcs per ASTM E330). Inference-based from published MasterFormat + NGA/FGIA guides. No full spec PDF upload (explicitly out-of-scope per PROJECT.md) |
| **Exclusion stress-test** (cross-check declared exclusions against inferred spec requirements; flag exclusions that the spec section still requires the sub to do) | Classic glazing gotchas: sub excludes "perimeter caulking" but Section 079200 flows down through Div 08 specs; sub excludes "backup/blocking" but storefront details show sub-installed blocking | MEDIUM | Requires (a) exclusion extraction (already in scope pass) + (b) spec cite reconciliation module. Output: severity-rated gap findings with specific clause pointers |
| **Quantity-ambiguity flagging** (scan scope/takeoff language for non-quantified terms: "as required", "as shown", "as necessary", "sufficient to", "approximately", "typical of", "per plan") | Lump-sum contracts put quantity risk on the sub; vague quantity language is the #1 bid-risk flag for glazing estimators | LOW | New clause-style pass OR extension of existing scope pass. Pattern-match + AI classification of severity by phrase proximity (e.g., "as required to weatherproof" is high-risk; "typical elevation shown" is low-risk). Could fit in existing scope pass if MAX_MODULES_PER_PASS raised |
| **Multi-document input (contract PDF + bid/estimate PDF)** | Cannot do bid-vs-contract reconciliation without both docs. Architectural prerequisite for half the v3.0 features | MEDIUM-HIGH | UI: second dropzone on Upload page with explicit labels ("Contract PDF" / "Your Bid or Estimate PDF"). Server: Files API supports multiple attachments per request; pipeline must tag source doc per pass. Current pipeline assumes one Files API upload — requires generalizing to Map<docRole, fileId> |
| **Bid-vs-contract exclusion parity check** (list exclusions user declared in bid, list exclusions acknowledged in contract, flag deltas) | If bid says "excludes perimeter sealant" but contract's scope language still assigns it to sub, user owes sealant at lump-sum — classic disaster | MEDIUM | Depends on multi-doc input + bid-side scope extraction. Pairwise matcher over exclusion strings with AI-assisted semantic equivalence (e.g., "perimeter caulking" ≈ "sealant at perimeter joint") |
| **Bid-vs-contract quantity delta** (bid says 245 openings; contract/exhibits reference different count or "as shown") | Estimators routinely bid off a schedule that changes between bid and executed contract | MEDIUM | Depends on multi-doc input + quantity signal extraction on both sides. Output: table of quantity items with bid value vs contract value vs delta flag |
| **Unbid-scope detection** (scope in contract that the bid never priced) | Wrapper around exclusion parity + inclusion diff. "Contract assigns X, your bid is silent on X = unpriced exposure" | MEDIUM | Depends on the two above. Most common unpriced-risk pattern in practice |

### Differentiators (Catches What Expert Reviewers Miss)

Features that push the tool above a senior glazing estimator with a yellow highlighter. Should be the marketing story for v3.0.

| Feature | Value Proposition | Complexity | Notes / Dependencies |
|---|---|---|---|
| **Inferred-but-unreferenced spec requirements** (contract cites 084413 curtain wall → infer AAMA 501.1/501.2 field water test, structural calcs per E330, thermal performance per NAFS; flag ones NOT mentioned elsewhere) | Experts catch what's CITED; this catches what the cite IMPLIES but contract omits — the "assumed" requirements that become change orders | HIGH | Requires deep Div 08 → deliverables knowledge module. Inference chain: section cite → typical required submittals → cross-check against submittal register → flag missing. Uses existing standards-validation module + new div08-deliverables module |
| **Exclusion risk-ranking by historical acceptance** (this exclusion has been accepted on 3 of 4 prior GC contracts — LIKELY OK; this exclusion has been struck on 4 of 5 — LIKELY FIGHT) | Sole user has rich portfolio history; no competitor tool has it. Turns v2.2 cross-contract pattern detection into forward-looking risk signal | MEDIUM | Depends on exclusion extraction + cross-contract synthesis (v2.2 foundation already in place). Store per-exclusion outcome on contract record; aggregate at portfolio level. BLOCKED by PROJECT.md out-of-scope on "outcome tracking" — see Clause Pass Recommendation |
| **Submittal critical-path overlay** (chain: submittal due → review window → resubmittal window → shop fabrication → shipping → installation window; compute slack to installation milestone) | Transforms submittal data into schedule-risk finding with hard numbers, not just "review submittal schedule" | MEDIUM | Depends on submittal register + date-extraction. Pure computed view; no new AI. Best expressed as timeline visualization + "slack = X days" finding |
| **"Which GC pushes broadest scope" portfolio view** (rank prior GCs/clients by avg scope severity, avg exclusion-rejection rate, avg scope-ambiguity count) | Sole user has ~10-30 contracts in portfolio; institutional memory in a dashboard card. No multi-tenant competitor has this | LOW-MEDIUM | Depends on existing cross-contract pattern detection + lifecycle_status. Aggregate per-client metrics on dashboard |
| **"Sections you keep getting burned by" trend** (of your 17 contracts, exclusions involving 079200 sealants were rejected 12 times — recommend pricing them by default) | Estimator-grade coaching loop based on user's own data | MEDIUM | Depends on exclusion extraction + outcome capture on exclusions (new field: `exclusionStatus: accepted | rejected | pending`). Could piggyback on existing finding `resolved`+`note` workflow as a semantic layer |
| **Scope-rule responsibility matrix** (who provides: scaffolding, hoisting, dumpsters, daily cleanup, temp enclosures, protection of adjacent, cold-weather enclosures, security, watch service, final clean) | Currently covered loosely by "scope rules" in existing pass; upgrading to a structured matrix ("GC / Sub / Silent") with severity on every "Silent" entry would be a market-leading output | MEDIUM | Extension of existing scope pass. New schema field: `responsibilityMatrix: Array<{item, assignedTo, evidence, severity}>`. Glazing-specific fixed list of ~15 items from domain knowledge |
| **Schedule-of-values / line-item reconciliation** (if bid has SOV and contract has SOV, flag line-item additions/deletions/value shifts) | Last step before signing: did my line items survive? | MEDIUM | Depends on multi-doc input + structured extraction of SOVs (if present). High value for experienced estimator |

### Anti-Features (Commonly Requested, Should NOT Build)

Already-listed PROJECT.md out-of-scope items plus new ones surfaced during this research.

| Feature | Why Requested | Why Problematic | Alternative |
|---|---|---|---|
| **Automated takeoff from drawings / OCR of elevations** | User wants "count the openings for me" | Drawing OCR is a dedicated product category (Togal, BeamUp, Kreo); AI hallucinates counts from raster images; liability of wrong count is the bid itself | Quantity-signal extraction from TEXT only; flag drawing references with "verify count manually" note. Already out of scope per PROJECT.md |
| **Full spec section PDF upload + parsing** (upload Section 084413 PDF, parse it) | User wants tool to read actual spec instead of inferring | File-size blowout (specs run 20-80 pages per section × multiple sections); copyright on manufacturer-authored specs; parsing variation across architects is enormous | Inference-based reconciliation from cite + curated Div 08 knowledge module. Already out of scope per PROJECT.md |
| **Real-time submittal log sync with Procore / Autodesk Build / Submittal Exchange** | "Import my submittal log and validate it" | Integration surface area enormous; auth, webhooks, mapping per PM system; sole-user tool; exported artifacts sufficient | CSV export of submittal register to paste into PM tool. Consistent with existing "no Procore integration" boundary |
| **Auto-generate a bid from the contract** | "Tell me what to bid" | Massive liability; pricing is proprietary + market-dependent; cost data ages instantly | Analyze the bid user provides; flag gaps. NEVER author pricing |
| **Drawing sheet OCR to auto-populate quantities** | "Parse the elevation sheets" | Same as drawing OCR; glass elevations have dozens of overlapping dimensions and rarely-scannable notes | Extract quantity REFERENCES ("see A8.11") and flag sheet number for manual confirm |
| **Playbook-per-GC (custom prompt rules)** | "This GC always tries X, flag it automatically" | Already out of scope per PROJECT.md ("AI prompt IS the playbook"). Cross-contract pattern detection gives same value without per-GC config | v2.2 cross-contract patterns + new "by-GC" portfolio roll-up |
| **Structural calculations / E1300 load verification** | "Tell me if the glass thickness is adequate" | Engineering practice — licensed PE liability. Never do this | Flag calculations as required-submittal items; DO NOT compute |
| **Specification redlining / auto-markup of contract PDF** | "Generate redlined version" | Already out of scope per PROJECT.md ("Automated redlining / markup — legal liability risk"). Negotiation positions sufficient | Keep negotiation positions as text; user does the redlining |
| **Real-time chat with the contract** | "Ask questions of the contract document" | Already out of scope per PROJECT.md ("comprehensive upfront analysis suffices"). Adds latency + token burn + session state | Comprehensive 17-pass analysis is the answer |

---

## Domain-Specific Answers to Research Questions

### Q1: Shop drawing / submittal tracking — what data does a glazing PM want?

Confirmed via NGA / FGIA / EJCDC + CSI submittal references. Fields to extract per submittal item:

1. **Submittal name** (e.g., "Curtain Wall Shop Drawings")
2. **Submittal type** — `product-data | shop-drawing | sample | mock-up | warranty | quality-control-plan | test-report | closeout | structural-calcs`
3. **Spec reference** (e.g., "Section 08 41 13" or "Section 08 44 13 §1.4.B")
4. **Submitter → Reviewer chain** — typically Sub → GC → Architect/Engineer; capture if contract deviates (direct-to-architect, owner-review)
5. **Due date basis** — relative anchor (days after NTP, days after award, days before mobilization, days before fabrication release)
6. **Review duration allowed** — typically 10-14 business days; flag if contract compresses this
7. **Resubmittal handling** — clause existence, cycles allowed, delay cost allocation
8. **Approval prerequisite** — does fabrication release require architect approval (nearly always yes for curtain wall; sometimes stamped-only for storefront)

Derived schedule metrics (table-stakes differentiator):
- **Planned critical path** = submittal due + (review cycles × cycle duration) + fab lead time + shipping + installation window
- **Slack to installation milestone** (from date-extraction pass) — negative slack = CRITICAL finding
- **Resubmittal buffer** — did contract allow realistic buffer for ≥1 revision cycle (industry norm)

### Q2: Spec section cite reconciliation

Given "Section 08 41 13" (Aluminum-Framed Entrances and Storefronts), tool should surface:

**Typical required submittals** (inference from CSI MasterFormat + manufacturer spec templates):
- Product data for each storefront series
- Shop drawings showing layout, profiles, anchorage, accessories, finish colors
- Verification samples (finish colors on actual aluminum substrates)
- Field-constructed mock-up (obtain owner + architect acceptance before fab release)
- Warranty documents (2 years from Substantial Completion typical; 10-yr finish warranty separately)
- Structural calculations per ASTM E330 for wind load
- AAMA 501.2 field water test report (if called for in spec)

**Typical required performance criteria:**
- Air infiltration per ASTM E283
- Water penetration per ASTM E331 (static) and E547 (dynamic)
- Structural per ASTM E330
- Thermal per NAFS / AAMA 101

**Typical required warranties:**
- 2-year system warranty (storefront)
- 10-year finish warranty (AAMA 2605 for 70% PVDF; 5-year for AAMA 2604 50% PVDF)
- 10-year IGU warranty (per ASTM E2190)

**Output:** For each cited section, a table "Required by 084113 — Mentioned in contract scope — Status" with gap findings at appropriate severity.

### Q3: Exclusion stress-test — common glazing "gotchas"

Ranked by industry frequency of dispute:

| Commonly-excluded item | Spec section that often still requires it | Dispute frequency | Severity |
|---|---|---|---|
| Perimeter caulking/sealant at glazing frame-to-wall joint | Section 079200 Joint Sealants cross-ref in 084413/084113 | Very high | CRITICAL if excluded — sub almost always owes frame-to-wall seal per Div 08 |
| Backup walls / blocking behind storefront | 084113 anchorage notes often require sub-furnished blocking | High | HIGH — can add 3-8% to contract |
| Sill flashing / pan flashing at openings | Some 084113 specs require, some offload to 079000 | High | HIGH — waterproofing liability severe if neither trade covers it |
| Anchor/embed plates | 084413 anchorage drawings often require sub-furnished embeds | High | HIGH — 8-15% of contract value on large facades |
| Window washing anchors / davit tie-backs | 084413 §3 often requires coordination or supply | Medium | HIGH if sub owes supply |
| Firestopping at curtain wall perimeter (safing insulation) | 078400 but Div 08 often flows down | Medium | CRITICAL — life safety, certification required |
| Cold-weather enclosures / heat for sealant cure | GCs usually; 079200 app-temp specs flow to Div 08 | Medium | MEDIUM |
| Final cleaning of glass at turnover | 088000 typically requires; sometimes excluded as "final clean by GC" | Medium | MEDIUM |
| Protection of adjacent finishes during installation | Varies | Low-Medium | MEDIUM |
| Temporary glazing (during phased occupancy) | Rare but appears on renovations | Low | HIGH when present |
| Structural steel / support steel for curtain wall | Div 05 but often pushed to Div 08 | Medium | HIGH — already flagged by existing div08-scope module |
| Punch list glass replacement (non-warranty) | Closeout sections | Medium | LOW-MEDIUM |

This list should drive a new `exclusion-stress-test` knowledge module.

### Q4: Quantity ambiguity — highest-risk phrases

Ranked by bid-risk exposure:

| Phrase pattern | Risk level | Why |
|---|---|---|
| `as required to [weatherproof / complete / satisfy architect]` | CRITICAL | Open-ended scope expansion; no quantitative bound |
| `sufficient to [perform / complete]` | CRITICAL | Subjective standard; architect's judgment controls |
| `as shown on drawings` (without specific sheet cite) | HIGH | Requires cross-reference tool cannot verify; drawing set versioning risk |
| `approximately [N]` / `not less than [N]` / `minimum of [N]` | HIGH | One-sided ratchet — sub owes more, never less |
| `typical of / similar to [other area]` | HIGH | Undefined extrapolation |
| `per plan / per drawing` (without sheet number) | MEDIUM-HIGH | Ambiguous reference |
| `as necessary` | HIGH | Subjective standard |
| `coordinated with other trades` | MEDIUM | Implies unbid coordination labor |
| `as directed [by architect / by GC]` | MEDIUM | Discretionary scope expansion |
| `customary / standard / good practice` | MEDIUM | Undefined industry standard |
| `include all [materials / labor / items] required` | MEDIUM-HIGH | Catch-all — sub bears omission risk |
| `complete in place` / `turnkey` | MEDIUM | Implies no exclusions allowed |
| `allowance of [$N] for [X]` | LOW-MEDIUM | Allowance items need separate treatment (track overages) |

Output format: quote exact clause + surrounding context, highlight the phrase, explain bid-risk, provide negotiation position (e.g., "Request replacing 'as required to weatherproof perimeter' with 'frame-to-wall seal per detail X/A8.11 only'").

### Q5: Bid vs contract reconciliation — what matters most

Rank-ordered list of deltas an estimator cares about at signing:

1. **Exclusion parity** — exclusions declared in bid that contract scope language did not adopt (CRITICAL — unpriced exposure)
2. **New inclusions** — scope items in contract that bid never addressed (CRITICAL — unbid scope)
3. **Quantity deltas** — opening counts, SF of glass, linear feet of storefront, number of mock-ups, number of field tests (HIGH)
4. **Submittal schedule compression** — if bid assumed 14-day review cycles and contract imposes 5-day (HIGH)
5. **Warranty extension** — bid priced 2-yr, contract demands 10-yr (HIGH)
6. **Performance criteria upgrades** — bid priced AAMA 2604, contract demands AAMA 2605 finish (HIGH — finish upgrade cost)
7. **Standard version shifts** — bid priced against ASTM E1300-12a, contract cites -16 (MEDIUM, usually)
8. **Liquidated damages / retainage changes** — covered by existing legal passes already
9. **Insurance/bonding upgrades** — already covered by existing v1.1 gap detection
10. **SOV line-item delta** (if both parties provided SOVs) — structural-level differences (MEDIUM)

### Q6: Cross-contract scope trends for sole user

Valuable portfolio-level insights:

1. **Per-GC scope behavior profile** — for each prior GC: avg exclusion acceptance rate, avg scope-ambiguity count, avg scope-gap count, avg risk score delta from portfolio mean
2. **Exclusion outcome history** — "Perimeter sealant exclusion: declared 15 times, accepted 3, rejected 9, modified 3 — RECOMMEND pricing in by default"
3. **Section-cite frequency** — which Div 08 sections appear most; which consistently generate disputes
4. **Ambiguity phrase recurrence** — which ambiguous phrases keep showing up across contracts from a given architect or GC
5. **Submittal compression trend** — is review-cycle duration shrinking over time across your portfolio
6. **Bid-gap repeat offenders** — scope items you keep leaving out of bids (→ estimator-checklist feedback loop)

NOTE: #2 requires per-exclusion outcome tracking which is currently out of scope per PROJECT.md. Flagging as the single biggest unlock if that decision is revisited.

---

## Feature Dependencies

```
Multi-Document Input (contract + bid)
    └──required-by──> Bid-vs-Contract Exclusion Parity
    └──required-by──> Bid-vs-Contract Quantity Delta
    └──required-by──> Unbid Scope Detection
    └──required-by──> SOV Line-Item Reconciliation

Submittal Register Extraction
    └──required-by──> Submittal Schedule-Conflict Flags
    └──required-by──> Submittal Critical-Path Overlay
    └──enhanced-by──> Date Extraction Pass (v1.0 existing)

Spec Cite Reconciliation (knowledge module)
    └──required-by──> Exclusion Stress-Test
    └──required-by──> Inferred-but-Unreferenced Requirements
    └──enhances──> Scope-of-Work Pass (v1.0 existing)

Quantity-Ambiguity Flagging
    └──enhances──> Scope-of-Work Pass
    └──required-by──> Bid-vs-Contract Quantity Delta

Cross-Contract Pattern Detection (v2.2 existing)
    └──enhanced-by──> Per-GC Scope Behavior Profile
    └──enhanced-by──> Exclusion Outcome History  [BLOCKED: outcome tracking out-of-scope]
    └──enhanced-by──> Section-Cite Frequency

MAX_MODULES_PER_PASS constraint
    └──conflicts-with──> Adding Exclusion-Stress-Test + Div08-Deliverables modules to scope pass
    └──resolution: either raise constraint OR split scope pass into scope-extraction + scope-reconciliation passes
```

### Key Dependency Notes

- **Multi-doc input is the architectural prerequisite** for 4 of 9 table-stakes features. Any phase that builds bid-vs-contract reconciliation must land multi-doc infra first.
- **Submittal register is independent of multi-doc input** — can ship in an earlier phase and stand alone.
- **Spec cite reconciliation is the highest-leverage knowledge module** — unlocks both exclusion stress-test AND inferred-but-unreferenced differentiator.
- **Scope pass is at module capacity (4 of 4).** Adding exclusion-stress-test + div08-deliverables modules requires either raising `MAX_MODULES_PER_PASS` or splitting scope pass into two (scope-extraction + scope-reconciliation). Splitting is cleaner architecturally and allows independent caching.
- **Exclusion outcome tracking is currently out-of-scope per PROJECT.md**, which limits richness of cross-contract scope trends. Flag for user decision.

---

## MVP Definition

### Launch With (v3.0 core)

Minimum to deliver "estimator-grade scope intelligence" promise:

- [ ] **Submittal register extraction pass** — stands alone, independent of multi-doc. Table-stakes, LOW-MED complexity.
- [ ] **Submittal schedule-conflict flags** — pure computation over existing date-extraction + new submittal pass. MED, high value.
- [ ] **Quantity-ambiguity flagging** — extension of scope pass OR new lightweight pass. LOW, high-frequency findings.
- [ ] **Spec cite reconciliation knowledge module** (Div 08 sections → typical deliverables) — foundational. MED. Plus new `div08-deliverables` + `exclusion-stress-test` modules.
- [ ] **Exclusion stress-test** — depends on spec cite reconciliation module. MED, the single biggest "catches what experts miss" feature.
- [ ] **Multi-document input infrastructure** — UI + pipeline changes. MED-HIGH. Architectural prerequisite.
- [ ] **Bid-vs-contract exclusion parity** — highest-value reconciliation feature. MED (given multi-doc).
- [ ] **Bid-vs-contract quantity delta** — MED.
- [ ] **Unbid scope detection** — MED.
- [ ] **Cross-contract scope trend view** — LOW-MED, layered on v2.2 pattern detection.
- [ ] **1-2 new clause passes** — see Clause Pass Recommendation below.

### Add After Validation (v3.x)

- [ ] **Submittal critical-path overlay visualization** — timeline UI component layered on submittal schedule-conflict flags
- [ ] **Responsibility matrix (structured)** — upgrade scope rules from list to GC/Sub/Silent matrix
- [ ] **Inferred-but-unreferenced requirements** — HIGH complexity; wait for spec cite reconciliation to prove out first
- [ ] **Per-GC scope behavior profile** — cross-contract roll-up dashboard card
- [ ] **Section-cite frequency + ambiguity recurrence** — portfolio insights
- [ ] **SOV line-item reconciliation** — only if users' bids routinely include SOVs

### Future Consideration (v4+)

- [ ] **Exclusion outcome history** — requires reversing PROJECT.md out-of-scope decision on outcome tracking
- [ ] **Full spec PDF upload + parsing** — already deferred per PROJECT.md
- [ ] **Drawing OCR / automated takeoff** — already out of scope per PROJECT.md

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---|---|---|---|
| Submittal register extraction | HIGH | LOW-MED | P1 |
| Submittal schedule-conflict flags | HIGH | MED | P1 |
| Quantity-ambiguity flagging | HIGH | LOW | P1 |
| Spec cite reconciliation knowledge module | HIGH | MED | P1 |
| Exclusion stress-test | HIGH | MED | P1 |
| Multi-document input infrastructure | HIGH | MED-HIGH | P1 (gate) |
| Bid-vs-contract exclusion parity | HIGH | MED | P1 |
| Bid-vs-contract quantity delta | MED-HIGH | MED | P1 |
| Unbid scope detection | HIGH | MED | P1 |
| Cross-contract scope trend view | MED | LOW-MED | P1 |
| New clause pass — warranty (see below) | MED-HIGH | LOW-MED | P1 |
| Submittal critical-path visualization | MED | MED | P2 |
| Responsibility matrix (structured) | MED | MED | P2 |
| Inferred-but-unreferenced requirements | HIGH | HIGH | P2 |
| Per-GC scope behavior profile | MED | LOW-MED | P2 |
| SOV line-item reconciliation | MED | MED | P2 |
| Exclusion outcome tracking + history | HIGH | LOW (schema) + out-of-scope decision | P3 |

---

## Clause Pass Recommendation

The milestone allows 1-2 new clause passes from: warranty, assignment, IP, safety/OSHA, audit rights.

Ranked by fit for v3.0 scope-intelligence theme:

| Candidate | Scope-intel fit | Glazing relevance | Recommendation |
|---|---|---|---|
| **Warranty** | STRONG — directly intersects spec cite reconciliation (2-yr system + 10-yr finish + 10-yr IGU warranty stacking per Div 08 specs), exclusion stress-test (warranty exclusions), and submittal register (warranty docs are a required submittal) | Critical — warranty is THE highest-dollar glazing exposure after liability | **Primary recommendation — BUILD in v3.0** |
| **Safety/OSHA** | MEDIUM — Cal/OSHA module already exists; a dedicated clause pass for safety obligations (site safety plans, fall protection on storefront/curtain wall, pre-task plans, safety submittal tracking) would deepen existing coverage | High — glazing is a fall-hazard trade with high Cal/OSHA exposure | **Secondary recommendation if slot available** — complements existing ca-calosha module |
| **Assignment** | WEAK — not scope-related | Medium — assignment matters for M&A + project transfer but isn't scope-intel | Defer to v3.x or v4 |
| **IP** | WEAK — glazing shop drawings raise IP questions but typically handled via warranty/ownership clauses in existing passes | Low-Medium | Defer |
| **Audit rights** | WEAK — financial/compliance, not scope | Low-Medium | Defer |

**Primary pick: Warranty** (strong theme fit, highest glazing-industry relevance, triangulates with 3 other v3.0 features).
**Secondary pick: Safety/OSHA** (fills a known gap — existing ca-calosha knowledge module has no dedicated clause pass consuming it).

---

## Knowledge Module Recommendation

Milestone allows 1-2 new scope-intel knowledge modules. Recommended:

1. **`div08-deliverables`** (new, trade domain) — Div 08 section → typical required submittals + performance criteria + warranty durations mapping. Consumed by spec cite reconciliation + exclusion stress-test + inferred-but-unreferenced. **Must-have for P1 features.**
2. **`exclusion-stress-test`** (new, trade domain) — glazing-sub commonly-excluded items + which spec sections typically still require them + typical dispute outcomes. Consumed by exclusion stress-test. **Must-have for P1.**

Optional third candidate:
3. **`aama-submittal-standards`** — review-cycle durations, submittal log conventions, AAMA mock-up testing requirements. Could be absorbed into `div08-deliverables` to save a module slot.

Constraint check: scope pass is at `MAX_MODULES_PER_PASS = 4` today. Adding 2 new modules requires either raising cap OR splitting scope pass into scope-extraction + scope-reconciliation passes (recommended — cleaner caching + enables parallel execution).

---

## Sources

- [Glazing Scope of Work | Template & Checklist — Provision](https://provision.com/resources/glazing-scope-of-work)
- [Sill Flashing and Curtain Wall Systems — Kovach](https://www.kovach.net/sill-flashing-for-glazing-systems/) — perimeter sealant + anchor plate cost impact (8-15%)
- [Overcoming Storefront Glazing Detailing Challenges — Tremco Sealants](https://www.tremcosealants.com/blog/overcoming-storefront-glazing-detailing-challenges) — backup wall / blocking construction sequencing
- [Glass Project Scheduling Strategies — InAir Space](https://inairspace.com/blogs/learn-with-inair/glass-project-scheduling-strategies-for-on-time-profitable-installations) — 10-14 day submittal review cycles, 8-14 wk glass lead times
- [Shop Drawings and Submittals — Kevin O'Beirne / EJCDC](https://ejcdc.org/shop-drawings-and-submittalspart-1-definition-purpose-and-necessityby-kevin-obeirne-pe/) — submittal types, review chain
- [CSI Section 08 41 13 Storefront Specification — YKK AP](https://www.ykkap.com/commercial/productguide/specs/CSI_Storefront/02-3009-09.pdf) — required submittals per 084113
- [Structural Glazing Project Submittal — Dow](https://siliconeforbuilding.com/structural-glazing-project-submittal)
- [Construction Submittal Templates — Smartsheet](https://www.smartsheet.com/content/construction-submittal-templates) — submittal log field definitions
- [Top 10 Exclusions in Construction Job Bids — ProfitDig](https://profitdig.com/blog/construction-job-bid-exclusions/)
- [Limiting Risks of Scope Gaps and Subcontract Exclusions — VERTEX](https://vertexeng.com/insights/limiting-risks-of-scope-gaps-and-subcontract-exclusions-in-completion-projects/)
- [Inclusions, Exclusions, and Assumptions — PVBid](https://pvbid.com/blog/inclusions-exclusions-and-assumptions-avoiding-scope-drop/) — bid-leveling framework
- [Common Rules of Contract Interpretation — Virginia Tech Press](https://pressbooks.lib.vt.edu/constructioncontracting/chapter/common-rules-of-contract-interpretation/) — quantity-ambiguity interpretation
- [Allocation of Risk in Construction Contracts — Global Arbitration Review](https://globalarbitrationreview.com/guide/the-guide-construction-arbitration/fifth-edition/article/allocation-of-risk-in-construction-contracts) — lump-sum vs remeasurement quantity risk
- [What's in Your Spec? A Checklist for Glazing Contractors — Vitro Glass Ed](https://glassed.vitroglazings.com/topics/whats-in-your-spec)
- [NGA Resources for Glaziers & Installers — Glass Magazine](https://www.glassmagazine.com/article/nga-resources-glaziers-installers)

---

*Feature research for: Glazing subcontract scope intelligence (v3.0 milestone)*
*Researched: 2026-04-05*
*Confidence: MEDIUM-HIGH — primary claims (submittal durations, perimeter-sealant gotcha, 084113 submittal requirements, quantity-ambiguity patterns) verified across multiple industry sources. Claims about sole-user portfolio insights (cross-contract scope trends) are design inferences grounded in v2.2 existing infrastructure, not empirical user research.*
