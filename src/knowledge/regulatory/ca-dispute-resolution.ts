import type { KnowledgeModule } from '../types.js';

const content = `CALIFORNIA DISPUTE RESOLUTION FOR CONSTRUCTION CONTRACTS
Analysis instructions for reviewing dispute resolution provisions in subcontracts.

MANDATORY ARBITRATION (CCP 1281-1281.97):
- Arbitration clauses are generally enforceable in CA construction contracts
- CCP 1281.2: court shall order arbitration if valid agreement exists
- CCP 1281.97: arbitration fees must be paid within 30 days or right is waived
- Flag arbitration clauses that waive sub's right to discovery as HIGH -- limits ability to build case
- Flag clauses requiring arbitration in a jurisdiction outside California as HIGH

VENUE AND CHOICE-OF-LAW PROVISIONS:
- CA courts generally enforce choice-of-law provisions in commercial contracts
- For CA construction projects, CA law typically applies regardless of contract terms
- Flag contracts requiring disputes be resolved under non-CA law for CA projects as HIGH
- Flag contracts requiring venue outside the county where the project is located as MEDIUM
- Out-of-state venue creates significant cost burden for small/mid-size glazing subs

MEDIATION-FIRST REQUIREMENTS:
- Many standard forms require mediation before arbitration or litigation
- AIA A401 requires mediation as condition precedent to binding dispute resolution
- Mediation is generally favorable to subcontractors (lower cost, faster resolution)
- Flag contracts that skip mediation and go directly to litigation or arbitration as MEDIUM
- Flag contracts with no dispute resolution provision at all as MEDIUM

FEE-SHIFTING PROVISIONS:
- CA follows American Rule: each party pays own attorney fees unless contract provides otherwise
- One-way fee-shifting (only GC can recover fees) is enforceable but unfavorable to sub
- CC 1717: if contract provides attorney fees to one party, the prevailing party is entitled regardless
- Flag one-way attorney fee provisions as HIGH -- CC 1717 may make them reciprocal but creates uncertainty
- Flag contracts with no attorney fee provision as INFO -- default American Rule applies

PUBLIC WORKS DISPUTE RESOLUTION (PCC 10240.2, 20104):
- Public works contracts may have mandatory claim procedures (PCC 20104)
- Claims under $375,000: meet and confer, then non-binding mediation or judicial arbitration
- Claims over $375,000: meet and confer, then mediation, then binding arbitration or litigation
- Strict timelines apply -- failure to follow procedures may waive claims
- Flag public works contracts without required claim procedures as HIGH

NOTICE REQUIREMENTS FOR DISPUTES:
- Most contracts require written notice of claims within a specified timeframe
- Typical notice period: 7-21 days from discovery of the issue
- Flag notice periods shorter than 7 days as HIGH -- insufficient time to investigate and respond
- Flag contracts with no notice requirement as MEDIUM -- ambiguity creates risk for both parties

ANALYSIS INSTRUCTIONS:
- Identify the dispute resolution mechanism specified in the contract
- Check for mediation-first requirement and flag if absent
- Review venue and choice-of-law clauses for CA project appropriateness
- Evaluate fee-shifting provisions for one-way unfairness
- For public works, verify compliance with PCC claim procedures
- Check notice requirements for reasonableness`;

export const caDisputeResolution: KnowledgeModule = {
  id: 'ca-dispute-resolution',
  domain: 'regulatory',
  title: 'California Dispute Resolution for Construction Contracts',
  effectiveDate: '2025-01-01',
  reviewByDate: '2027-01-01',
  expirationDate: '2027-06-01',
  content,
  tokenEstimate: Math.ceil(content.length / 4),
};
