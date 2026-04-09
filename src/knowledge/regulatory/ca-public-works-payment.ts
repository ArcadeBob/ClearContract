import type { KnowledgeModule } from '../types.js';

const content = `CALIFORNIA PUBLIC & PRIVATE WORKS PAYMENT AND RETAINAGE REQUIREMENTS
Analysis instructions for reviewing payment and retainage provisions in both public and private works subcontracts.

CA PROMPT PAYMENT ACT (PCC 7107, 10853):
- Owner must pay GC within 30 days of acceptance of public works project
- GC must pay sub within 10 days of receiving each progress payment from owner
- 2% per month penalty on late payments from GC to sub (PCC 7108.5)
- Flag contracts with payment terms exceeding these statutory timelines as HIGH

RETENTION LIMITS ON PUBLIC PROJECTS (PCC 7107):
- Maximum retention: 5% of contract value on public works
- Retention must be released within 60 days of project completion/acceptance
- Sub's retention must be released within 10 days of GC receiving retention from owner
- Flag retention above 5% on public works as CRITICAL -- violates PCC 7107
- Flag contracts without retention release timeline as HIGH

STOP NOTICE RIGHTS ON PUBLIC WORKS (CC 9350-9364):
- Bonded stop notice: sub can freeze funds held by public entity for the project
- Must be served on public entity (not just GC)
- 20-day preliminary notice required before stop notice is effective
- Stop notice bond required (125% of claim amount) for bonded stop notice
- Flag contract clauses purporting to waive stop notice rights as CRITICAL -- void under CA law

PAYMENT BOND RIGHTS (PCC 7103, CA LITTLE MILLER ACT):
- On public works over $25,000, GC must provide payment bond
- Sub has right to claim against payment bond if unpaid
- 90-day deadline to file payment bond claim after completion of work
- Federal projects: Miller Act (40 USC 3131) requires payment bond on contracts over $100,000
- Flag contracts on public works with no mention of payment bond as MEDIUM

PROGRESS PAYMENT REQUIREMENTS:
- Sub entitled to progress payments at least monthly on public works
- Application for payment must be processed within 7 working days by GC
- Disputed amounts: GC must pay undisputed portion and provide written notice of disputed items
- Flag contracts allowing GC to withhold entire payment over partial dispute as HIGH

WITHHOLDING LIMITS:
- GC may only withhold for documented deficiencies, not as leverage
- Withholding must be proportional to the deficiency
- Flag broad withholding clauses (e.g., "GC may withhold any amount for any reason") as HIGH

PRIVATE WORKS RETAINAGE -- SB 61 (Stats. 2025, Ch. 139), Cal. Civil Code §8811:
(Effective January 1, 2026 -- applies to contracts entered into on or after that date)
- Caps retention at 5% of each progress payment AND 5% of total contract price for PRIVATE works of improvement
- Applies at ALL tiers: owner-to-GC, GC-to-sub, sub-to-sub-sub
- NON-WAIVABLE under Cal. Civil Code §8820 -- parties cannot contract around the 5% cap
- Any retainage clause exceeding 5% in a private contract entered on or after 1/1/2026 VIOLATES California law
- Flag retention above 5% on private works (contract dated on/after 1/1/2026) as CRITICAL -- not merely "excessive," it is unlawful under §8811
- Flag retention clauses that attempt to waive §8811 as CRITICAL -- void under §8820

IMPORTANT DISTINCTIONS -- COMMONLY CONFUSED STATUTES:
- Cal. Civil Code §8814: Governs retention RELEASE TIMING (GC must pay sub within 10 days of receiving retention from owner) -- does NOT set retention amount caps
- B&P Code §7108.5: Governs PROGRESS PAYMENT TIMING (7-day payment requirement, 2% monthly penalty for wrongful withholding) -- does NOT set retainage caps
- PCC 7107: Sets the 5% retention cap for PUBLIC works only
- Cal. Civil Code §8811 (SB 61): Sets the 5% retention cap for PRIVATE works only (contracts on/after 1/1/2026)

ANALYSIS INSTRUCTIONS:
- Determine if contract is for public works (government owner, public funding) or private works
- If public works: verify all payment terms comply with PCC 7107 and Prompt Payment Act
- If private works (contract dated on/after 1/1/2026): verify retention does not exceed 5% under Civil Code §8811
- Check retention percentage and release conditions against the applicable 5% statutory maximum
- Verify stop notice and payment bond rights are not waived or restricted
- Flag any payment term that is less favorable than statutory minimums
- Flag any attempt to waive the 5% retention cap (public or private) as CRITICAL`;

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
