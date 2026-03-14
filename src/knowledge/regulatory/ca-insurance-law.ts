import type { KnowledgeModule } from '../types';

const content = `CALIFORNIA INSURANCE LAW FOR GLAZING SUBCONTRACTORS
Analysis instructions for reviewing insurance requirements in construction subcontracts.

ADDITIONAL INSURED REQUIREMENTS (CIC 11580.04):
- GC and owner commonly required as additional insureds on sub's GL policy
- Additional insured endorsement must be ISO CG 20 10 or equivalent (ongoing operations)
- ISO CG 20 37 covers completed operations -- both endorsements typically required
- Check: if contract requires "blanket additional insured" status, verify sub's policy supports it
- Flag contracts requiring additional insured status on WC policy as HIGH -- not standard practice

SUBROGATION WAIVER REQUIREMENTS:
- Construction contracts commonly require waiver of subrogation on GL and WC policies
- CIC permits waiver of subrogation if endorsed on the policy before the loss
- Flag contracts requiring subrogation waiver without specifying it must be pre-loss endorsed as MEDIUM
- Waiver of subrogation on builder's risk is standard; on other lines, verify insurability

GENERAL LIABILITY MINIMUMS (Typical CA Glazing):
- Per-Occurrence: $1,000,000 (standard)
- General Aggregate: $2,000,000 (standard)
- Products/Completed Operations Aggregate: $2,000,000
- Flag requirements exceeding $2,000,000 per-occurrence as HIGH -- may require umbrella/excess
- Flag requirements exceeding $5,000,000 aggregate as HIGH -- significant cost to sub

WORKERS COMPENSATION (LC 3700):
- WC coverage is mandatory for all CA employers -- statutory limits
- Employer's Liability: $1,000,000 per accident / $1,000,000 disease-each employee / $1,000,000 disease-policy limit (standard)
- Flag contracts requiring WC limits above statutory + $1M EL as MEDIUM

AUTO LIABILITY:
- Combined single limit: $1,000,000 (standard for commercial auto)
- Must cover owned, hired, and non-owned autos
- Flag requirements above $1,000,000 CSL as MEDIUM

UMBRELLA/EXCESS LIABILITY:
- $1,000,000 to $5,000,000 common for glazing subs depending on project size
- Flag umbrella requirements above $5,000,000 as HIGH -- significant premium cost for small/mid-size subs
- Verify umbrella follows form over GL, auto, and employer's liability

PRIMARY AND NON-CONTRIBUTORY:
- Many contracts require sub's insurance be "primary and non-contributory"
- This means sub's policy pays first regardless of other available insurance
- Standard endorsement ISO CG 20 01 achieves this
- Flag as INFO if present -- standard but worth noting for insurance review

CERTIFICATE OF INSURANCE (COI):
- Acord 25 certificate is standard format
- Certificate must name additional insureds, list project, show required coverages/limits
- 30-day notice of cancellation is standard; 10-day for non-payment
- Flag contracts requiring 60+ day cancellation notice as MEDIUM -- may not be available from insurer

ANALYSIS INSTRUCTIONS:
- Compare contract insurance requirements against the standard minimums listed above
- Flag any requirement that exceeds standard minimums by category with appropriate severity
- Check for prohibited insurance requirements (e.g., additional insured on WC)
- Note if contract requires sub to maintain coverage for completed operations period (typically 2-5 years post-completion)
- Flag contracts with no insurance requirements at all as MEDIUM -- unusual and risky for all parties`;

export const caInsuranceLaw: KnowledgeModule = {
  id: 'ca-insurance-law',
  domain: 'regulatory',
  title: 'California Insurance Law for Glazing Subcontractors',
  effectiveDate: '2025-01-01',
  reviewByDate: '2027-01-01',
  expirationDate: '2027-06-01',
  content,
  tokenEstimate: Math.ceil(content.length / 4),
};
