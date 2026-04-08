import type { KnowledgeModule } from '../types.js';

const content = `GLAZING SUBCONTRACTOR STANDARD PROTECTIONS CHECKLIST
Analysis instructions for verbiage-analysis pass: check for presence or absence of key protective clauses.

1. FORCE MAJEURE CLAUSE:
- What to look for: clause excusing performance delays due to events beyond party's control (weather, natural disasters, material shortages, acts of God, government actions, pandemics)
- Glazing-specific: exterior glazing work is highly weather-dependent; glass and aluminum supply chains are volatile
- If MISSING: flag as HIGH severity -- sub has no protection for delays caused by supply chain disruptions or severe weather
- If PRESENT but narrow: flag as MEDIUM if it excludes material shortages or supply chain delays -- these are critical for glazing trade
- Recommendation: force majeure should explicitly include material shortages, supply chain disruptions, and adverse weather conditions

2. LIMITATION OF LIABILITY:
- What to look for: clause capping sub's total liability at the subcontract value or sub's scope of work
- If MISSING: flag as HIGH severity -- sub's liability exposure is unlimited and could far exceed contract value
- If PRESENT but inadequate: flag as MEDIUM if cap exceeds 100% of subcontract value
- Recommendation: liability should be capped at subcontract value; consequential damages should be mutually waived

3. WARRANTY DISCLAIMER / LIMITATION:
- What to look for: clause limiting sub's warranty to workmanship and materials, excluding design adequacy
- If MISSING: flag as MEDIUM severity -- sub may be held to implied warranty of fitness for particular purpose
- If sub is warranting design: flag as HIGH -- glazing sub typically does not design; architect/engineer is responsible for design adequacy
- Recommendation: warranty should be limited to workmanship per manufacturer specs; design warranty should be excluded unless sub performed design

4. RIGHT TO CURE:
- What to look for: clause giving sub written notice and a reasonable cure period before GC can declare default
- Typical cure period: 7-14 days for minor issues, 30 days for material breaches
- If MISSING: flag as HIGH severity -- GC could terminate without giving sub opportunity to fix issues
- If cure period is less than 7 days: flag as MEDIUM -- may be insufficient for glazing remediation work
- Recommendation: minimum 14-day cure period after written notice of default

5. NOTICE PROVISIONS:
- What to look for: clause requiring written notice (not just verbal) with specific delivery method, addresses, and timeframes
- If MISSING: flag as MEDIUM severity -- creates ambiguity about when obligations are triggered
- If notice period is less than 5 days: flag as MEDIUM -- may be insufficient to respond
- Recommendation: all notices should be in writing, delivered to specified addresses, with reasonable response timeframes

6. WEATHER DELAY ALLOWANCE:
- What to look for: clause specifically addressing weather delays for exterior work
- Glazing-specific: curtain wall, storefront, and window installation are exterior operations highly sensitive to wind, rain, and temperature
- If MISSING: flag as MEDIUM severity -- sub may be held to schedule despite weather preventing safe exterior work
- If contract has no-damage-for-delay clause AND no weather exception: flag as HIGH -- sub absorbs all weather delay costs
- Recommendation: contract should include weather delay provision or reference to recognized weather delay standards

7. MATERIAL ESCALATION CLAUSE:
- What to look for: clause addressing price adjustments for material cost increases (glass, aluminum, sealants)
- Glazing-specific: glass and aluminum prices are subject to significant volatility; long-duration projects are especially at risk
- If MISSING on contracts over 12 months duration: flag as HIGH severity -- sub bears all material cost escalation risk
- If MISSING on contracts under 12 months: flag as MEDIUM -- lower risk but still notable
- If PRESENT: verify it has a reasonable threshold (typically 5-10% increase triggers adjustment) and clear documentation requirements
- Recommendation: escalation clause with defined threshold, documentation process, and mutual adjustment mechanism

ANALYSIS INSTRUCTIONS:
For each protection item above:
1. Search the contract for the relevant clause or provision
2. If found: evaluate whether it adequately protects the subcontractor per the criteria above
3. If missing: generate a finding with the severity and category noted above, using category "Scope of Work" for items 6-7 and "Legal Issues" for items 1-5
4. Group related missing protections into a single finding if they are addressed in the same contract section
5. Do not flag protections that are adequately addressed -- only flag missing or inadequate protections`;

export const glazingSubProtections: KnowledgeModule = {
  id: 'glazing-sub-protections',
  domain: 'trade',
  title: 'Glazing Subcontractor Standard Protections Checklist',
  effectiveDate: '2025-01-01',
  reviewByDate: '2027-06-01',
  expirationDate: '2028-01-01',
  content,
  tokenEstimate: Math.ceil(content.length / 4),
};
