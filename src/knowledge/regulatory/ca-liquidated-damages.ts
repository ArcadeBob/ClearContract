import type { KnowledgeModule } from '../types.js';

const content = `CALIFORNIA LIQUIDATED DAMAGES LAW FOR CONSTRUCTION SUBCONTRACTS
Analysis instructions for reviewing liquidated damages provisions in subcontracts.

ENFORCEABILITY (CC 1671):
- CC 1671(b): liquidated damages in COMMERCIAL (non-consumer) contracts are PRESUMPTIVELY VALID
- The burden of proof falls on the party CHALLENGING the clause (typically the subcontractor) to demonstrate it was "unreasonable under the circumstances existing at the time the contract was made"
- The AI MUST mention this presumption when analyzing LD clauses -- it significantly affects litigation risk assessment because the sub bears the uphill burden
- Two-part test: (1) damages must have been impracticable or extremely difficult to fix at time of contracting, and (2) the amount must represent a reasonable endeavor to estimate fair compensation
- Flag LD clauses with no stated basis for the daily/weekly rate as MEDIUM -- enforceability may be challenged
- Flag LD amounts that appear disproportionate to the sub's scope value as HIGH

PROPORTIONALITY CASE LAW:
- Ridgley v. Topa Thrift & Loan Assn. (1998) 17 Cal.4th 970: "the characteristic feature of a penalty is its lack of proportional relation to the damages which may actually flow from failure to perform under a contract"
- If the LD amount would consume the entire subcontract value within approximately 30 days, that strains credulity and is vulnerable to challenge as a disproportionate penalty rather than a reasonable estimate of damages
- Flag LD provisions where daily rate multiplied by 30 exceeds total subcontract value as HIGH -- likely disproportionate and vulnerable to penalty challenge under Ridgley

TIME EXTENSION RIGHTS AFFECTING LD EXPOSURE:
- Sub should have contractual right to time extensions for excusable delays
- Excusable delays typically include: owner-caused delays, differing site conditions, force majeure, design changes
- Flag contracts with LD provisions but NO time extension provisions as CRITICAL -- sub has unlimited LD exposure for delays beyond its control
- Flag contracts where time extension requires GC approval without objective criteria as HIGH

FLOW-DOWN LD PROVISIONS:
- GC contracts often contain LD clauses with the owner; GC may flow these down to sub
- Flow-down of owner-level LDs to subs is common and generally enforceable IF the sub's delay was on the critical path and causally responsible for the project delay
- HOWEVER, passing through a full project-level LD rate to a sub representing a small fraction of total project cost remains vulnerable to challenge as disproportionate under Ridgley
- If the LD represents a flow-down of the owner's LD rate from the prime contract, note this context -- it changes the calculus somewhat but does not eliminate proportionality concerns
- Sub's LD exposure should be proportional to sub's scope, not the entire project
- Flag flow-down LD where sub is liable for full project LD rate as CRITICAL -- disproportionate exposure
- Flag LD clauses referencing "prime contract" LD rate without adjustment for sub's scope as HIGH
- Check if sub's LD exposure is capped (e.g., at a percentage of subcontract value)

PROPORTIONALITY ANALYSIS FOR GLAZING SUB SCOPE:
- Glazing is typically 5-15% of total project value
- If project LD is $5,000/day and glazing scope is 10% of project, proportional LD would be $500/day
- Flag LD rates that exceed 0.5% of subcontract value per day as HIGH -- likely disproportionate
- Flag uncapped LD (no maximum total) as HIGH -- total exposure could exceed contract value

LD CAP PROVISIONS:
- Best practice: LD should be capped at a percentage of subcontract value (typically 5-10%)
- Flag contracts with no LD cap as HIGH -- exposure could exceed the entire subcontract value
- Flag LD caps exceeding 15% of subcontract value as MEDIUM -- higher than typical

CONCURRENT DELAY:
- When both GC and sub cause concurrent delay, LD typically should not be assessed
- Flag contracts that assess LD during concurrent delay periods as HIGH
- Check for concurrent delay provisions and their fairness to the sub

RECOMMENDATION GUIDANCE:
- Recommend including a CAP on total LDs (e.g., 5-10% of subcontract value) -- this is industry best practice and protects against runaway exposure
- Recommend language requiring GC to demonstrate the sub was on the critical path before assessing LDs -- without critical path causation, LD assessment is legally vulnerable
- Graduated damages starting at a reasonable daily rate are sound -- they demonstrate good-faith estimation of actual damages rather than a punitive flat penalty
- If no cap exists, recommend negotiating one as a priority item

ANALYSIS INSTRUCTIONS:
- Identify all LD provisions including flow-down from prime contract
- Always note the CC 1671(b) presumptive validity of commercial LD provisions and that the burden falls on the challenging party
- Evaluate LD rate against sub's contract value for proportionality, citing Ridgley where relevant
- Check for time extension rights and excusable delay provisions
- Verify LD cap exists and is reasonable relative to subcontract value
- Check for critical path causation requirements before LD can be assessed
- Flag any LD provision that creates disproportionate exposure for the glazing sub
- Note that LD provisions without corresponding time extension rights are particularly dangerous`;

export const caLiquidatedDamages: KnowledgeModule = {
  id: 'ca-liquidated-damages',
  domain: 'regulatory',
  title: 'California Liquidated Damages Law for Construction Subcontracts',
  effectiveDate: '2026-04-08',
  reviewByDate: '2027-01-01',
  expirationDate: '2027-06-01',
  content,
  tokenEstimate: Math.ceil(content.length / 4),
};
