import type { KnowledgeModule } from '../types.js';

const content = `CALIFORNIA PUBLIC WORKS PAYMENT REQUIREMENTS
Analysis instructions for reviewing payment provisions in public works subcontracts.

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

ANALYSIS INSTRUCTIONS:
- Determine if contract is for public works (government owner, public funding)
- If public works: verify all payment terms comply with PCC 7107 and Prompt Payment Act
- Check retention percentage and release conditions against 5% statutory maximum
- Verify stop notice and payment bond rights are not waived or restricted
- Flag any payment term that is less favorable than statutory minimums`;

export const caPublicWorksPayment: KnowledgeModule = {
  id: 'ca-public-works-payment',
  domain: 'regulatory',
  title: 'California Public Works Payment Requirements',
  effectiveDate: '2025-01-01',
  reviewByDate: '2027-01-01',
  expirationDate: '2027-06-01',
  content,
  tokenEstimate: Math.ceil(content.length / 4),
};
