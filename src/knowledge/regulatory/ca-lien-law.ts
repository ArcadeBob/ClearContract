import type { KnowledgeModule } from '../types.js';

const content = `CALIFORNIA MECHANICS LIEN LAW & VOID-BY-LAW CLAUSES
Analysis instructions for glazing subcontractor contract review.
Effective: January 1, 2026 (includes Cal. Civil Code §8850 amendments).

PRIVATE vs PUBLIC WORKS -- CRITICAL THRESHOLD DETERMINATION:
Before citing ANY statute, the AI MUST determine whether the project is private or public:
- Title 2 (PRIVATE Works): Cal. Civil Code §§8000-8848
- Title 3 (PUBLIC Works): Cal. Civil Code §§9000-9566
Using public works statutes (Title 3) for a private project -- or vice versa -- is a CRITICAL ERROR that can mislead the client on deadlines, notice requirements, and available remedies.
>> The AI must identify the project type from the contract (owner identity, funding source, project description) and cite ONLY the correct title's statutes throughout the analysis.

PRELIMINARY NOTICE (CC 8200-8216) -- CRITICAL PROTECTIVE STEP:
- Civil Code §8200 establishes the REQUIREMENT for preliminary notice on private works
- Civil Code §8204 sets the actual 20-DAY DEADLINE: notice must be served within 20 days from first furnishing of labor/materials
- Late service still preserves PARTIAL rights: lien protection covers work performed within the 20 days PRIOR to service plus all work going forward
- Without preliminary notice, lien rights are severely limited
- IMPORTANT: For any private commercial project with pay-if-paid risk, timely service of a 20-day preliminary notice is the MOST CRITICAL protective step. Failure to serve this notice can forfeit the sub's mechanic's lien, stop notice, AND bond claim rights entirely.
- Cal. Civil Code §8160 governs progress payment disputes between owner and direct contractor on private works (30-day payment requirement), establishing the upstream payment timeline that triggers the GC's downstream obligation under B&P Code §7108.5.

RECORDING DEADLINES:
- WITHOUT Notice of Completion: 90 days from completion for ALL claimants (CC 8412)
- WITH Notice of Completion: 60 days for direct contractors, 30 days for subs/suppliers (CC 8414)

MECHANICS LIEN ENFORCEMENT DEADLINE (CC 8460) -- TWO SEPARATE DEADLINES:
- Deadline to RECORD the lien: CC 8414 = 90 days after completion OR 30 days after notice of completion (whichever is earlier for subs)
- Deadline to FILE SUIT to enforce: Sub must commence a foreclosure action within 90 DAYS AFTER RECORDING the lien claim (CC 8460), or the lien EXPIRES and is unenforceable
- BOTH deadlines must be independently tracked -- missing either one forfeits the lien
>> Flag any contract that purports to shorten these statutory deadlines as potentially void under CC 8122.

STOP PAYMENT NOTICES -- PRIVATE WORKS (CC 8500-8560):
- These are PRIVATE works statutes (Title 2). Public works stop payment notices are under CC 9350-9566 (Title 3) -- do NOT confuse the two.
- Bonded stop payment notice freezes construction funds held by owner
- 30-day release period after stop payment notice served
- Powerful remedy when owner holds retention or unpaid funds

VOID-BY-LAW PROVISIONS -- FLAG AS CRITICAL:

CC 8122 - ANTI-WAIVER STATUTE (PROMINENT -- CITE IN ALL RELEVANT FINDINGS):
CC 8122 voids ANY contract term that purports to waive mechanic's lien rights, stop payment notice rights, OR payment bond rights. This is the single most important protective statute for subcontractors.
>> If you find pre-payment lien waiver clauses, flag as CRITICAL severity citing CC 8122. These clauses are unenforceable and indicate bad-faith contracting.
>> When analyzing pay-if-paid clauses, ALWAYS cite CC 8122 alongside Wm. R. Clarke Corp. v. Safeco (1997) 15 Cal.4th 882.
>> Any clause waiving stop payment notice or payment bond rights is ALSO void under CC 8122.

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
>> If contract predates January 1, 2026, §8850 does NOT apply -- rely on existing lien law and B&P Code §7108.5 framework.

LIEN WAIVER FORMS -- CONDITIONAL vs UNCONDITIONAL (CC 8132-8138):
California mandates four specific statutory lien waiver forms. Non-conforming waiver forms are VOID under CC 8120.
- Conditional Waiver and Release on Progress Payment (CC 8132): effective ONLY when payment is actually received
- Unconditional Waiver and Release on Progress Payment (CC 8134): IRREVOCABLE upon execution -- never sign before payment clears
- Conditional Waiver and Release on Final Payment (CC 8136): effective ONLY when final payment is actually received
- Unconditional Waiver and Release on Final Payment (CC 8138): IRREVOCABLE upon execution -- never sign before final payment clears
>> WARNING: "Never sign an unconditional waiver before confirming payment has cleared." Unconditional waivers are IRREVOCABLE on execution regardless of whether payment is later dishonored.
>> If a contract requires execution of unconditional waivers BEFORE payment, flag as CRITICAL severity citing CC 8120 and CC 8122.
>> If a contract uses non-statutory waiver forms, flag as HIGH severity -- non-conforming forms are VOID (CC 8120) and may create confusion about what rights have actually been waived.

RIGHT TO STOP WORK (CC 8830-8848):
- Cal. Civil Code §8830-8848: A DIRECT CONTRACTOR may suspend work if the owner fails to pay for 35 continuous days, provided the contractor gives 5 days' written notice before suspending.
- Subcontractors CANNOT directly invoke this right against the GC -- it applies only to the direct contractor-owner relationship.
- However, subs should be aware this right exists: if the GC stops work due to owner nonpayment, it directly impacts the sub's schedule, costs, and potential delay claims.
>> If analyzing schedule or delay provisions, note that GC work stoppage under CC 8830 is a risk factor for the sub's timeline and should be addressed in force majeure or delay clauses.`;

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
