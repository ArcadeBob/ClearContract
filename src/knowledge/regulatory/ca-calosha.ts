import type { KnowledgeModule } from '../types';

const content = `CAL/OSHA SAFETY REQUIREMENTS FOR GLAZING WORK
Analysis instructions for glazing subcontractor contract review. All references are California Code of Regulations Title 8.

GLASS HANDLING & INSTALLATION:
- T8 1525: Protection against walking-through-glass hazard. Glazing installations in traffic areas must have barriers or markings until completion.

SCAFFOLDING & ELEVATED WORK:
- T8 1637: Scaffolds required when work cannot be done safely from permanent construction at least 20 inches wide. Scaffolds must meet load and construction requirements.
- T8 1637(q): Overhead protection required when workers are exposed to falling objects from above.

FALL PROTECTION:
- T8 1621(a), 1632: Guardrails required at floor openings, open sides, and unprotected edges where fall hazard exists (generally 7.5 feet or more).
- T8 1670(a): Personal fall arrest systems (tie-off) required at heights when guardrails are infeasible. Anchorage must support 5,000 lbs per attached worker.

LADDERS:
- T8 3276, 1675: Ladder inspection before each use. Proper setup angle (4:1 ratio). Do not carry glass or heavy materials on ladders.

INJURY & ILLNESS PREVENTION:
- T8 1509(a)(b)(c): Written IIPP (Injury and Illness Prevention Program) required for all employers. Must include Code of Safe Practices specific to glazing hazards.

INCIDENT REPORTING:
- T8 342(a): Fatality or serious injury must be reported to Cal/OSHA within 8 hours. Serious injury includes hospitalization, amputation, loss of eye.

HAZARDOUS MATERIALS:
- T8 5194(g): Safety Data Sheets (SDS) must be maintained and accessible for all hazardous chemicals used on site (sealants, adhesives, coatings, cleaners).

CONTRACT ANALYSIS INSTRUCTIONS:
- Flag contracts that shift ALL OSHA/safety responsibility to subcontractor without providing adequate site safety provisions (e.g., no GC site safety plan, no coordination of multi-employer site hazards) as HIGH severity.
- Flag contracts requiring sub to indemnify GC for safety violations caused by GC's own site conditions as CRITICAL (relates to CC 2782 void-by-law).
- Flag contracts with no mention of safety coordination on multi-trade sites as MEDIUM.
- Verify contract addresses scaffolding responsibility (who provides, who inspects).`;

export const caCalosha: KnowledgeModule = {
  id: 'ca-calosha',
  domain: 'regulatory',
  title: 'Cal/OSHA Safety Requirements for Glazing Work',
  effectiveDate: '2024-01-01',
  reviewByDate: '2027-01-01',
  content,
  tokenEstimate: Math.ceil(content.length / 4),
};
