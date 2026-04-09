import type { KnowledgeModule } from '../types.js';

const content = `CALIFORNIA PREVAILING WAGE & DIR REQUIREMENTS
Analysis instructions for glazing subcontractor contract review.

PUBLIC WORKS DETECTION (apply first):
- Determine if this is a public works contract: government entity as owner, public funding, or public building/infrastructure
- If NOT a public works contract, SKIP all prevailing wage findings entirely
- Mixed-funding projects: if any portion uses public funds, prevailing wage applies to entire project

PUBLIC WORKS THRESHOLDS:
- Construction: $25,000 or more
- Maintenance/alteration: $15,000 or more
- Below thresholds: prevailing wage does not apply

DIR REGISTRATION (LC 1725.5):
- ALL contractors and subcontractors on public works must have active DIR registration
- Registration must be current at time of bid submission AND throughout project
- Non-registered sub cannot be listed on bid; contract with unregistered sub is void
- Check: does contract require proof of DIR registration? If public works and missing, flag as HIGH

CERTIFIED PAYROLL RECORDS (LC 1776):
- CPRs required for all public works projects
- Must be submitted to Labor Commissioner and available for inspection
- Penalty for delinquent/inadequate CPRs: $100 per calendar day per worker (LC 1776(h))
- Check: does contract specify CPR obligations? If public works and missing, flag as MEDIUM

APPRENTICESHIP REQUIREMENTS (LC 1777.5):
- Required on public works contracts $30,000 or more
- Must employ registered apprentices in applicable crafts
- Glazing (C-17) apprenticeship ratio requirements apply
- Penalty for non-compliance: $100 per day per apprentice not employed

PREVAILING WAGE PENALTIES (LC 1775):
- Underpayment penalty: $200 per day per worker for each violation
- NOTE: Verify current penalty rate -- set reviewByDate accordingly
- Contractor and sub are jointly/severally liable for wage violations
- Check: does contract include prevailing wage flow-down and compliance clauses?

SB 727 / LABOR CODE 218.7 -- GC JOINT LIABILITY FOR WAGE DEBTS (PRIVATE WORKS):
- SB 727 (effective January 1, 2018) enacted Labor Code 218.7: on PRIVATE works, the direct contractor (GC) is jointly and severally liable for any unpaid wages, fringe benefits, and contributions owed by a subcontractor at any tier
- Applies to contracts entered into on or after January 1, 2022 (phased enforcement)
- This is significant if the glazing sub uses lower-tier subcontractors (e.g., caulking subs, material installers) -- the GC can be held liable for the glazing sub's wage debts to those lower-tier subs
- Conversely, the glazing sub itself becomes a "direct contractor" vis-a-vis its own lower-tier subs and faces the same joint liability exposure
- Check: does the contract include wage compliance flow-down clauses requiring lower-tier subs to comply with all wage/hour laws? If NOT, flag as HIGH
- Check: does the contract require the sub to provide certified payroll or wage compliance documentation for lower-tier subs on private works? If the sub uses lower-tier subs and no flow-down exists, flag as HIGH
- The GC may withhold sufficient funds to cover wage claims -- verify contract language does not create unreasonable withholding exposure beyond LC 218.7 requirements

FLAG INSTRUCTIONS:
- Public works contract missing DIR registration requirement: flag HIGH
- Public works contract missing CPR/apprenticeship clauses: flag MEDIUM
- Contract shifting all prevailing wage liability to sub without flow-up protections: flag HIGH
- Private works contract with lower-tier subs but no wage compliance flow-down (LC 218.7): flag HIGH
- Contract withholding provisions exceeding LC 218.7 statutory scope: flag MEDIUM`;

export const caPrevailingWage: KnowledgeModule = {
  id: 'ca-prevailing-wage',
  domain: 'regulatory',
  title: 'California Prevailing Wage and DIR Requirements',
  effectiveDate: '2024-01-01',
  reviewByDate: '2026-07-01',
  expirationDate: '2027-01-01',
  content,
  tokenEstimate: Math.ceil(content.length / 4),
};
