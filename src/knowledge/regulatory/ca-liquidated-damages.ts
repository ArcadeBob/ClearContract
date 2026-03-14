import type { KnowledgeModule } from '../types';

const content = `CALIFORNIA LIQUIDATED DAMAGES LAW FOR CONSTRUCTION SUBCONTRACTS
Analysis instructions for reviewing liquidated damages provisions in subcontracts.

ENFORCEABILITY (CC 1671):
- CC 1671(b): liquidated damages in non-consumer contracts are valid unless the party seeking to invalidate them shows they were unreasonable at the time the contract was made
- Two-part test: (1) damages must have been impracticable or extremely difficult to fix at time of contracting, and (2) the amount must represent a reasonable endeavor to estimate fair compensation
- Flag LD clauses with no stated basis for the daily/weekly rate as MEDIUM -- enforceability may be challenged
- Flag LD amounts that appear disproportionate to the sub's scope value as HIGH

TIME EXTENSION RIGHTS AFFECTING LD EXPOSURE:
- Sub should have contractual right to time extensions for excusable delays
- Excusable delays typically include: owner-caused delays, differing site conditions, force majeure, design changes
- Flag contracts with LD provisions but NO time extension provisions as CRITICAL -- sub has unlimited LD exposure for delays beyond its control
- Flag contracts where time extension requires GC approval without objective criteria as HIGH

FLOW-DOWN LD PROVISIONS:
- GC contracts often contain LD clauses with the owner; GC may flow these down to sub
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

ANALYSIS INSTRUCTIONS:
- Identify all LD provisions including flow-down from prime contract
- Evaluate LD rate against sub's contract value for proportionality
- Check for time extension rights and excusable delay provisions
- Verify LD cap exists and is reasonable relative to subcontract value
- Flag any LD provision that creates disproportionate exposure for the glazing sub
- Note that LD provisions without corresponding time extension rights are particularly dangerous`;

export const caLiquidatedDamages: KnowledgeModule = {
  id: 'ca-liquidated-damages',
  domain: 'regulatory',
  title: 'California Liquidated Damages Law for Construction Subcontracts',
  effectiveDate: '2025-01-01',
  reviewByDate: '2027-01-01',
  expirationDate: '2027-06-01',
  content,
  tokenEstimate: Math.ceil(content.length / 4),
};
