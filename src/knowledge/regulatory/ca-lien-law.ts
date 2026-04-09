import type { KnowledgeModule } from '../types.js';

const content = `CALIFORNIA MECHANICS LIEN LAW & VOID-BY-LAW CLAUSES
Analysis instructions for glazing subcontractor contract review.
Effective: January 1, 2026 (includes Cal. Civil Code §8850 amendments).

PRELIMINARY NOTICE (CC 8200-8216) -- CRITICAL PROTECTIVE STEP:
- Subcontractors/suppliers must serve 20-DAY PRELIMINARY NOTICE under Civil Code §8200 from first furnishing of labor/materials
- Late notice only protects work performed within 20 days BEFORE notice was sent
- Without preliminary notice, lien rights are severely limited
- IMPORTANT: For any private commercial project with pay-if-paid risk, timely service of a 20-day preliminary notice is the MOST CRITICAL protective step. Failure to serve this notice can forfeit the sub's mechanic's lien, stop notice, AND bond claim rights entirely.
- Cal. Civil Code §8160 governs progress payment disputes between owner and direct contractor on private works (30-day payment requirement), establishing the upstream payment timeline that triggers the GC's downstream obligation under B&P Code §7108.5.

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

CC 8814 - PAY-IF-PAID CLAUSES: VOID AND UNENFORCEABLE:
Pay-if-paid clauses are VOID AND UNENFORCEABLE in California. This is not merely a risk -- these clauses are ALREADY LEGALLY VOID.
Constitutional basis: Article XIV, §3 of the California Constitution protects mechanic's lien rights.
Statutory basis: Cal. Civil Code §8122 prohibits waiver of lien rights.
Leading case: Wm. R. Clarke Corp. v. Safeco Ins. Co. (1997) 15 Cal.4th 882 -- the California Supreme Court held that pay-if-paid provisions "are contrary to the public policy of this state and therefore unenforceable because they effect an impermissible indirect waiver or forfeiture of the subcontractor's constitutionally protected mechanic's lien rights."
>> If you find pay-if-paid clauses (e.g., "payment contingent upon receipt of payment from owner", "condition precedent to payment"), flag as CRITICAL severity citing CC 8814 and Wm. R. Clarke Corp. v. Safeco. State unequivocally the clause is ALREADY LEGALLY VOID -- do NOT merely recommend "converting to pay-when-paid."
>> Also check retention: GC must pay sub retention within 10 days of receiving retention from owner.

PAY-WHEN-PAID -- ENFORCEABLE ONLY WITH TIME CAP:
- Pay-when-paid with a reasonable TIME CAP is enforceable per Yamanishi v. Bailey & Collishaw, Inc. (1972) 29 Cal.App.3d 457.
- BUT open-ended pay-when-paid that defers payment until GC-owner litigation conclusion is ALSO UNENFORCEABLE per Crosno Construction, Inc. v. Travelers Casualty and Surety Co. of America (2020) 47 Cal.App.5th 940.
>> If you find pay-when-paid without a definite time cap, flag as HIGH severity citing Crosno Construction.
>> Recommended time cap: 30-60 days after GC receipt, or a defined number of days after substantial completion of sub's work, whichever is EARLIER.

CC 2782 + CC 2782.05 - INDEMNIFICATION (ACTIVE vs. PASSIVE NEGLIGENCE):
Indemnity clauses requiring sub to indemnify GC for GC's sole negligence or willful misconduct are VOID (CC 2782).
CC 2782.05 extends void status to GC's ACTIVE NEGLIGENCE for contracts executed after Jan 1, 2013.
CRITICAL DISTINCTION -- Active vs. Passive Negligence:
- §2782.05 uses an "ACTIVE NEGLIGENCE" standard, not simple "negligence."
- Per Rossmoor Sanitation, Inc. v. Pylon, Inc. (1975) 13 Cal.3d 622, passive negligence (e.g., failure to discover a dangerous condition created by another) is NOT "active negligence."
- Therefore, a broad indemnification clause could STILL require the sub to indemnify for the GC's PASSIVE negligence on a commercial project, even under §2782.05.
- Residential projects: subs get broader protection under §2782(d), which bars indemnity for ANY negligence of the indemnitee.
- Proportionate/comparative fault regime applies per Oltmans Construction Co. v. Bayside Interiors, Inc. (2017) 10 Cal.App.5th 355.
>> If you find broad-form indemnity clauses (sub indemnifies for "any and all claims" without negligence carve-outs), flag as CRITICAL severity citing CC 2782.
>> Intermediate-form indemnity (sub's proportionate negligence only) is permissible.
>> Recommendation: drafting should explicitly exclude BOTH active AND passive negligence of the GC to fully protect the subcontractor.
>> For residential projects, flag any indemnity for GC's negligence as VOID under §2782(d).

GC WITHHOLDING CONSTRAINTS (B&P Code §7108.5):
- GC must pay sub within 7 days of receiving each progress payment from owner (modifiable by written agreement).
- Good faith dispute: GC may withhold NO MORE THAN 150% of the disputed amount. Undisputed amounts MUST still be paid.
- Violations trigger: 2% per month penalty on wrongly withheld amounts, CSLB disciplinary action, and prevailing party attorney's fees.
- United Riggers & Erectors, Inc. v. Coast Iron & Steel Co. (2018) 4 Cal.5th 1082: timely payment may be excused ONLY when payor has a good faith basis for contesting the payee's right to receive the SPECIFIC monies withheld. GC CANNOT use unrelated disputes to withhold otherwise undisputed payments.
>> If contract allows GC to withhold payments beyond 150% of disputed amounts or to offset unrelated claims, flag as CRITICAL severity citing B&P Code §7108.5 and United Riggers.
>> If contract extends payment timeline beyond 7 days post-receipt without explicit written agreement, flag as HIGH severity.

CAL. CIVIL CODE §8850 -- MANDATORY CLAIMS PROCESS (Effective January 1, 2026):
Signed October 10, 2025. Applies to contracts entered on or after January 1, 2026.
Establishes a mandatory claims process for private construction contracts:
- Structured timelines and dispute escalation: informal conference → mediation → litigation.
- 2% monthly interest on undisputed amounts not paid within 60 days.
- RIGHT TO SUSPEND WORK upon owner non-payment after proper notice.
- Creates a defined procedural framework that supplements existing lien and stop notice rights.
>> If contract was entered on or after January 1, 2026, verify compliance with §8850 claims process requirements.
>> If contract purports to waive or limit §8850 rights (right to suspend work, mandatory interest), flag as CRITICAL severity.
>> If contract predates January 1, 2026, §8850 does NOT apply -- rely on existing lien law and B&P Code §7108.5 framework.`;

export const caLienLaw: KnowledgeModule = {
  id: 'ca-lien-law',
  domain: 'regulatory',
  title: 'California Mechanics Lien Law and Void-by-Law Clauses',
  effectiveDate: '2026-01-01',
  reviewByDate: '2028-01-01',
  expirationDate: '2028-01-01',
  content,
  tokenEstimate: Math.ceil(content.length / 4),
};
