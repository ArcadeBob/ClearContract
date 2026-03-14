import type { KnowledgeModule } from '../types';

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

FLAG INSTRUCTIONS:
- Public works contract missing DIR registration requirement: flag HIGH
- Public works contract missing CPR/apprenticeship clauses: flag MEDIUM
- Contract shifting all prevailing wage liability to sub without flow-up protections: flag HIGH`;

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
