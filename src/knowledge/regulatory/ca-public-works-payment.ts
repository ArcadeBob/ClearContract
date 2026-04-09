import type { KnowledgeModule } from '../types.js';

const content = `CALIFORNIA PUBLIC & PRIVATE WORKS PAYMENT AND RETAINAGE REQUIREMENTS
Analysis instructions for reviewing payment and retainage provisions in both public and private works subcontracts.

=== IMPORTANT: ALWAYS DETERMINE PROJECT TYPE FIRST ===
Before applying ANY statute, determine whether the contract is for PUBLIC works (government owner, public funding, prevailing wage) or PRIVATE works (private owner, commercial/residential). Many statutes apply ONLY to one type. Misapplying a public-works statute to a private project (or vice versa) produces incorrect analysis.

========================================
PART 1: PUBLIC WORKS STATUTES
========================================

CA PROMPT PAYMENT ACT -- PUBLIC WORKS (PCC 7107, 10853):
- Owner must pay GC within 30 days of acceptance of public works project
- GC must pay sub within 10 days of receiving each progress payment from owner
- 2% per month penalty on late payments from GC to sub
- Flag contracts with payment terms exceeding these statutory timelines as HIGH

RETENTION LIMITS ON PUBLIC PROJECTS (PCC 7201):
- Maximum retention: flat 5% of contract value on public works FROM THE START
- The 5% cap applies to every progress payment -- there is NO higher rate that reduces at 50% completion
- Retention must be released within 60 days of project completion/acceptance
- Sub's retention must be released within 10 days of GC receiving retention from owner
- Flag retention above 5% on public works as CRITICAL -- violates PCC 7201
- Flag contracts without retention release timeline as HIGH

STOP NOTICE RIGHTS ON PUBLIC WORKS (CC 9350-9364):
- Bonded stop notice: sub can freeze funds held by public entity for the project
- Must be served on public entity (not just GC)
- 20-day preliminary notice required before stop notice is effective
- Stop notice bond required (125% of claim amount) for bonded stop notice
- Flag contract clauses purporting to waive stop notice rights as CRITICAL -- void under CA law

PAYMENT BOND RIGHTS -- PUBLIC WORKS (PCC 7103, CA LITTLE MILLER ACT):
- On public works over $25,000, GC must provide payment bond
- Sub has right to claim against payment bond if unpaid
- 90-day deadline to file payment bond claim after completion of work
- Federal projects: Miller Act (40 USC 3131) requires payment bond on contracts over $100,000
- Flag contracts on public works with no mention of payment bond as MEDIUM
- NOTE: PCC 7103 and the Little Miller Act apply ONLY to public works -- do NOT cite these for private projects

PROGRESS PAYMENT REQUIREMENTS -- PUBLIC WORKS:
- Sub entitled to progress payments at least monthly on public works
- Application for payment must be processed within 7 working days by GC
- Disputed amounts: GC must pay undisputed portion and provide written notice of disputed items
- Flag contracts allowing GC to withhold entire payment over partial dispute as HIGH

WITHHOLDING LIMITS (PUBLIC AND PRIVATE):
- GC may only withhold for documented deficiencies, not as leverage
- Withholding must be proportional to the deficiency
- Flag broad withholding clauses (e.g., "GC may withhold any amount for any reason") as HIGH

========================================
PART 2: PRIVATE WORKS STATUTES
========================================

PROMPT PAYMENT ON PRIVATE WORKS (Cal. Civil Code §8800-8802):
- Owner must pay direct contractor within 30 days after demand for payment (CC §8800)
- 2% per month penalty for wrongful withholding of payment (CC §8802)
- These provisions establish baseline payment timing obligations on private projects

PROGRESS PAYMENT ON PRIVATE WORKS (B&P Code §7108.5):
- GC must pay sub within 7 days of receiving each progress payment from owner
- 2% per month penalty for wrongful withholding of progress payments
- NOTE: B&P §7108.5 governs PROGRESS PAYMENT TIMING only -- it does NOT set retainage caps and does NOT govern retainage release

PRIVATE WORKS RETAINAGE -- SB 61 (Stats. 2025, Ch. 139), Cal. Civil Code §8811:
(Effective January 1, 2026 -- applies to contracts entered into on or after that date)
- Caps retention at 5% of each progress payment AND 5% of total contract price for PRIVATE works of improvement
- Applies at ALL tiers: owner-to-GC, GC-to-sub, sub-to-sub-sub
- Retention in a subcontract CANNOT exceed the retention percentage in the prime contract
- NON-WAIVABLE under Cal. Civil Code §8820 -- parties cannot contract around the 5% cap
- Any retainage clause exceeding 5% in a private contract entered on or after 1/1/2026 VIOLATES California law
- Prevailing party in an action to enforce §8811 is entitled to MANDATORY attorney's fees
- Flag retention above 5% on private works (contract dated on/after 1/1/2026) as CRITICAL -- not merely "excessive," it is unlawful under §8811
- Flag retention clauses that attempt to waive §8811 as CRITICAL -- void under §8820

RETAINAGE RELEASE ON PRIVATE WORKS (Cal. Civil Code §8812, §8814, §8818):
- CC §8812: Owner must pay GC all retention within 45 days after completion of the work of improvement
- CC §8814: GC must pay sub retention within 10 days of receiving retention from owner
- CC §8818: 2% per month penalty for wrongful withholding of retention payments
- These are SEPARATE from progress payment timing (B&P §7108.5) -- they govern RETENTION RELEASE specifically
- Flag contracts without retention release timeline as HIGH
- Flag contracts with retention release terms less favorable than §8812/§8814 as HIGH

NON-WAIVABILITY OF PRIVATE WORKS RETENTION PROVISIONS (Cal. Civil Code §8820):
- ANY contract clause purporting to waive, modify, or render inoperative Cal. Civil Code §§8810-8818 is VOID
- This means the 5% cap (§8811), retention release timing (§8812, §8814), and penalty provisions (§8818) CANNOT be contracted around
- Flag any clause attempting to waive or override §§8810-8818 as CRITICAL -- void and unenforceable under §8820

PAYMENT BOND RIGHTS -- PRIVATE WORKS (Cal. Civil Code §8600-8614):
- Payment bonds are NOT required on private works, but if one exists, subs can claim against it
- CC §8600-8614 (Title 2, Chapter 5) govern private works payment bonds
- Do NOT cite PCC 7103, CC 9550, CC 9100, or CC 9554 for private works -- those are PUBLIC works statutes (Title 3)
- If a payment bond exists on a private project, verify sub's right to claim against it is not improperly restricted
- Flag contract clauses purporting to eliminate payment bond claim rights (where a bond exists) as HIGH

========================================
PART 3: COMMONLY CONFUSED STATUTES
========================================

IMPORTANT DISTINCTIONS:
- PCC 7201: Sets the flat 5% retention cap for PUBLIC works only -- applies from the start, not reduced at 50%
- Cal. Civil Code §8811 (SB 61): Sets the 5% retention cap for PRIVATE works only (contracts on/after 1/1/2026)
- Cal. Civil Code §8812: Governs retention RELEASE from owner to GC on PRIVATE works (45 days after completion)
- Cal. Civil Code §8814: Governs retention RELEASE from GC to sub on PRIVATE works (10 days after GC receives retention)
- Cal. Civil Code §8818: Penalty (2%/month) for wrongful withholding of RETENTION on private works
- Cal. Civil Code §8820: ALL private retention provisions (§§8810-8818) are NON-WAIVABLE -- waiver clauses are VOID
- B&P Code §7108.5: Governs PROGRESS PAYMENT TIMING on private works (7-day payment, 2% penalty) -- does NOT govern retainage caps or release
- Cal. Civil Code §8800-8802: Governs PROMPT PAYMENT from owner to direct contractor on private works (30-day, 2% penalty)
- CC §8600-8614: PRIVATE works payment bonds (Title 2)
- PCC 7103 / CC 9550: PUBLIC works payment bonds (Title 3) -- do NOT apply to private projects

========================================
ANALYSIS INSTRUCTIONS
========================================

STEP 1: DETERMINE PROJECT TYPE
- Is the owner a government entity or is the project publicly funded? -> PUBLIC WORKS
- Is the owner a private party (commercial, residential, industrial)? -> PRIVATE WORKS
- If unclear, flag as MEDIUM and note that applicable statutes depend on project classification

STEP 2: APPLY CORRECT STATUTES
- If public works: apply PCC 7201 (5% retention cap), PCC 7107/10853 (prompt payment), PCC 7103 (payment bonds), CC 9350-9364 (stop notices)
- If private works (contract on/after 1/1/2026): apply CC §8811 (5% retention cap), CC §8812/§8814/§8818 (retention release), CC §8820 (non-waivability), CC §8800-8802 (prompt payment), B&P §7108.5 (progress payment), CC §8600-8614 (payment bonds if any)

STEP 3: CHECK COMPLIANCE
- Check retention percentage against the applicable 5% statutory maximum
- Check retention release conditions against applicable release timelines
- Verify stop notice and payment bond rights are not waived or restricted
- Flag any payment term that is less favorable than statutory minimums
- Flag any attempt to waive the 5% retention cap (public or private) as CRITICAL
- Flag any attempt to waive private retention provisions (§§8810-8818) as CRITICAL under §8820`;

export const caPublicWorksPayment: KnowledgeModule = {
  id: 'ca-public-works-payment',
  domain: 'regulatory',
  title: 'California Public & Private Works Payment and Retainage Requirements',
  effectiveDate: '2026-01-01',
  reviewByDate: '2027-01-01',
  expirationDate: '2027-06-01',
  content,
  tokenEstimate: Math.ceil(content.length / 4),
};
