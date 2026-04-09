import type { KnowledgeModule } from '../types.js';

const content = `CALIFORNIA INSURANCE LAW FOR GLAZING SUBCONTRACTORS
Analysis instructions for reviewing insurance requirements in construction subcontracts.

ADDITIONAL INSURED REQUIREMENTS (CIC 11580.04):
- GC and owner commonly required as additional insureds on sub's GL policy
- Additional insured endorsement must be ISO CG 20 10 or equivalent (ongoing operations)
- ISO CG 20 37 covers completed operations -- both endorsements typically required
- Check: if contract requires "blanket additional insured" status, verify sub's policy supports it
- Flag contracts requiring additional insured status on WC policy as HIGH -- not standard practice

SUBROGATION WAIVER REQUIREMENTS:
- Construction contracts commonly require waiver of subrogation on GL and WC policies
- CIC permits waiver of subrogation if endorsed on the policy before the loss
- Flag contracts requiring subrogation waiver without specifying it must be pre-loss endorsed as MEDIUM
- Waiver of subrogation on builder's risk is standard; on other lines, verify insurability

GENERAL LIABILITY MINIMUMS (Typical CA Glazing):
- Per-Occurrence: $1,000,000 (standard)
- General Aggregate: $2,000,000 (standard)
- Products/Completed Operations Aggregate: $2,000,000
- Flag requirements exceeding $2,000,000 per-occurrence as HIGH -- may require umbrella/excess
- Flag requirements exceeding $5,000,000 aggregate as HIGH -- significant cost to sub

WORKERS COMPENSATION (LC 3700):
- WC coverage is mandatory for all CA employers -- statutory limits
- Employer's Liability: $1,000,000 per accident / $1,000,000 disease-each employee / $1,000,000 disease-policy limit (standard)
- Flag contracts requiring WC limits above statutory + $1M EL as MEDIUM

AUTO LIABILITY:
- Combined single limit: $1,000,000 (standard for commercial auto)
- Must cover owned, hired, and non-owned autos
- Flag requirements above $1,000,000 CSL as MEDIUM

UMBRELLA/EXCESS LIABILITY:
- $1,000,000 to $5,000,000 common for glazing subs depending on project size
- Flag umbrella requirements above $5,000,000 as HIGH -- significant premium cost for small/mid-size subs
- Verify umbrella follows form over GL, auto, and employer's liability

PRIMARY AND NON-CONTRIBUTORY:
- Many contracts require sub's insurance be "primary and non-contributory"
- This means sub's policy pays first regardless of other available insurance
- Standard endorsement ISO CG 20 01 achieves this
- Flag as INFO if present -- standard but worth noting for insurance review

CERTIFICATE OF INSURANCE (COI):
- Acord 25 certificate is standard format
- Certificate must name additional insureds, list project, show required coverages/limits
- 30-day notice of cancellation is standard; 10-day for non-payment
- Flag contracts requiring 60+ day cancellation notice as MEDIUM -- may not be available from insurer

OCIP (OWNER-CONTROLLED INSURANCE PROGRAM):
- OCIP deductible contributions: typical range is $2,500-$10,000 per occurrence; $5,000 is the most common benchmark
- For subcontracts under $250,000, many OCIPs use tiered structures with $2,500-$5,000 deductibles
- Deductibles exceeding 4% of subcontract value per claim are disproportionately high -- flag as HIGH
- Recommended: $5,000/occurrence and $15,000 aggregate cap for subcontracts under $500K
- CC 2782.96 requires OCIP sponsors to disclose policy limits, exclusions, and premium credit calculations
- CC 2782.9 "reasonably limited" deductible protections apply ONLY to residential construction, NOT commercial -- do NOT cite 2782.9 for commercial projects
- CRITICAL: The AI MUST check that the OCIP policy dates COVER the anticipated construction period. An expired OCIP means zero coverage from day one -- flag as CRITICAL (highest priority finding). Compare OCIP policy start/end dates against contract execution date and anticipated construction timeline. Any gap = CRITICAL.
- If OCIP is expired or inadequate, advise: refuse to execute until GC provides current OCIP, OR amend contract to require sub to carry own CGL and WC (requiring approximately 2-4% price increase)

PROFESSIONAL LIABILITY / ERRORS AND OMISSIONS (E&O):
- NO statutory E&O requirement exists in California for any contractor classification, including C-17 glazing
- CSLB requires: general liability, workers' compensation, and $25,000 contractor bond (B&P Code 7071.6, increased from $15,000 effective January 1, 2023 per SB 607) -- NOT E&O
- E&O is contractual and risk-management-driven, NOT statutory -- the AI must NOT present E&O as a legal requirement
- For design-build glazing work, E&O at $1M per claim is PRUDENT BEST PRACTICE
- $2M per claim is disproportionate for subcontracts under $500K -- typically reserved for $1M+ subcontracts
- Cost ranges: Annual E&O at $1M/$1M limits for a glazing sub with limited design scope: $2,000-$6,000/year. Project-specific endorsement: $3,000-$8,000. Do NOT cite $15,000 -- that only applies to dedicated project-specific policies with unusually high limits.
- If design-build, review whether Civil Code 2782.8 (SB 496, effective January 1, 2018) applies to limit the sub's indemnity obligations for professional services to proportionate percentage of fault

OPPI (OWNER'S PROTECTIVE PROFESSIONAL INDEMNITY) -- DO NOT RECOMMEND:
- An OPPI policy is purchased by the PROJECT OWNER, NOT a subcontractor
- OPPI is designed for projects with $50M+ in hard costs
- Minimum premiums: $50,000-$75,000
- The AI must NEVER recommend OPPI in connection with a subcontract -- it reflects a fundamental misunderstanding of the product
- If the AI detects OPPI language or requirements in a subcontract, flag it as an ANOMALY -- the owner's obligation, not the sub's

PAYMENT BONDS -- CORRECT DIRECTION OF PROTECTION:
- A PAYMENT BOND is obtained by a HIGHER-TIER PARTY to guarantee payment to parties BELOW it
- If a subcontractor purchases a payment bond, that bond protects the sub's OWN material suppliers, laborers, and lower-tier subs -- NOT the subcontractor itself
- The AI must NEVER recommend a subcontractor purchase a voluntary payment bond as self-protection against GC non-payment
- Instead, the sub's payment protections are:
  1. Mechanics lien rights (CC 8400-8494, constitutionally protected, non-waivable per 8122) -- requires timely 20-day preliminary notice
  2. Stop payment notices to owner and/or construction lender
  3. Prompt payment statute (B&P Code 7108.5, 2% monthly penalty)
  4. Section 8850 claims process and stop-work rights (effective 1/1/2026)
  5. Check whether GC has obtained a payment bond from the owner -- if so, sub can make direct claim against GC's surety (CC 8600-8614)

CSLB BOND REQUIREMENT:
- Current contractor bond requirement: $25,000 (effective January 1, 2023 per SB 607)
- Prior amount was $15,000 -- do NOT reference the old amount
- B&P Code 7071.6 governs the contractor bond requirement

ANALYSIS INSTRUCTIONS:
- Compare contract insurance requirements against the standard minimums listed above
- Flag any requirement that exceeds standard minimums by category with appropriate severity
- Check for prohibited insurance requirements (e.g., additional insured on WC)
- Note if contract requires sub to maintain coverage for completed operations period (typically 2-5 years post-completion)
- Flag contracts with no insurance requirements at all as MEDIUM -- unusual and risky for all parties
- If OCIP is referenced, verify policy dates cover the full construction period -- expired OCIP is CRITICAL
- If E&O is required, do NOT present it as a statutory requirement -- it is contractual only
- Never recommend OPPI for a subcontractor
- Never recommend a subcontractor purchase a payment bond for self-protection against GC non-payment`;

export const caInsuranceLaw: KnowledgeModule = {
  id: 'ca-insurance-law',
  domain: 'regulatory',
  title: 'California Insurance Law for Glazing Subcontractors',
  effectiveDate: '2026-01-01',
  reviewByDate: '2027-01-01',
  expirationDate: '2027-06-01',
  content,
  tokenEstimate: Math.ceil(content.length / 4),
};
