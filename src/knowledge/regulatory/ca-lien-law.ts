import type { KnowledgeModule } from '../types';

const content = `CALIFORNIA MECHANICS LIEN LAW & VOID-BY-LAW CLAUSES
Analysis instructions for glazing subcontractor contract review.

PRELIMINARY NOTICE (CC 8200-8216):
- Subcontractors/suppliers must serve 20-day preliminary notice from first furnishing of labor/materials
- Late notice only protects work performed within 20 days BEFORE notice was sent
- Without preliminary notice, lien rights are severely limited

RECORDING DEADLINES:
- WITHOUT Notice of Completion: 90 days from completion for ALL claimants (CC 8412)
- WITH Notice of Completion: 60 days for direct contractors, 30 days for subs/suppliers (CC 8414)
- Foreclosure action: must commence within 90 days of recording lien (CC 8460)

STOP NOTICES (CC 8500-8560):
- Bonded stop notice freezes construction funds held by owner
- 30-day release period after stop notice served
- Powerful remedy when owner holds retention or unpaid funds

VOID-BY-LAW PROVISIONS -- FLAG AS CRITICAL:

CC 8122 - LIEN WAIVER CLAUSES VOID:
Any contract term requiring waiver of lien rights before payment is VOID by statute.
>> If you find pre-payment lien waiver clauses, flag as CRITICAL severity citing CC 8122. These clauses are unenforceable and indicate bad-faith contracting.

CC 8814 - PAY-IF-PAID CLAUSES VOID:
Contract clauses conditioning subcontractor payment on owner's payment to GC are VOID.
>> If you find pay-if-paid clauses (e.g., "payment contingent upon receipt of payment from owner"), flag as CRITICAL severity citing CC 8814.
>> Also check retention: GC must pay sub retention within 10 days of receiving retention from owner.
>> Pay-when-paid (reasonable time after GC payment) is distinguishable and permissible but flag as HIGH.

CC 2782 + CC 2782.05 - BROAD-FORM INDEMNITY VOID:
Indemnity clauses requiring sub to indemnify GC for GC's sole negligence or willful misconduct are VOID (CC 2782).
CC 2782.05 extends void status to GC's active negligence for contracts executed after Jan 1, 2013.
>> If you find broad-form indemnity clauses (sub indemnifies for "any and all claims" without negligence carve-outs), flag as CRITICAL severity citing CC 2782.
>> Intermediate-form indemnity (sub's proportionate negligence only) is permissible.`;

export const caLienLaw: KnowledgeModule = {
  id: 'ca-lien-law',
  domain: 'regulatory',
  title: 'California Mechanics Lien Law and Void-by-Law Clauses',
  effectiveDate: '2024-01-01',
  reviewByDate: '2027-01-01',
  expirationDate: '2027-01-01',
  content,
  tokenEstimate: Math.ceil(content.length / 4),
};
