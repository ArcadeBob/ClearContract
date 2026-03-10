import type { KnowledgeModule } from '../types';

const content = `CONTRACT STANDARD FORM DETECTION AND DEVIATION ANALYSIS
Analysis instructions for identifying contract form families and flagging sub-unfavorable deviations.

AIA A401-2017 DETECTION PATTERNS:
Identify an AIA A401 subcontract by the presence of these indicators:
- References to "AIA Document A201" (General Conditions of the Contract for Construction)
- Use of "Subcontract Sum" terminology for the contract price
- "Architect" as a defined and active role in contract administration
- Articles numbered 1 through 15 with Section X.X internal numbering (e.g., Section 4.1, Section 11.3)
- Cross-references to other AIA documents: A201, A101, A701
- AIA copyright notice or document header referencing "American Institute of Architects"

AIA A401 SUB-UNFAVORABLE DEVIATIONS:
When an AIA A401 form is detected, check for these modifications that disadvantage the subcontractor:
- Pay-if-paid language replacing the default pay-when-paid provision -- Flag as CRITICAL with category "Payment Terms" (this shifts non-payment risk entirely to the sub)
- Removed or reduced retainage reduction provisions -- Flag as HIGH with category "Payment Terms" (default A401 allows retainage reduction as work progresses)
- Broadened indemnification beyond the A401 default (which limits indemnification to sub's own negligence) -- Flag as CRITICAL with category "Legal Issues"
- Removed subcontractor stop-work rights for non-payment -- Flag as HIGH with category "Payment Terms"
- Shortened notice periods below the A401 defaults -- Flag as MEDIUM with category "Contract Compliance"
- Added broad consequential damages exposure (A401 default includes mutual waiver) -- Flag as CRITICAL with category "Legal Issues"
- Eliminated or restricted claims/dispute resolution provisions -- Flag as HIGH with category "Legal Issues"

CONSENSUSDOCS 750 DETECTION PATTERNS:
Identify a ConsensusDocs 750 subcontract by the presence of these indicators:
- Decimal section numbering system (3.1.1, 8.3.4, 11.2.1) rather than Article/Section format
- Use of "Subcontract Amount" terminology (not "Subcontract Sum")
- Three compensation method options: fixed-price, unit price, and time-and-materials
- Explicit 7-day stop-work rights provision for non-payment
- Matching retainage rate provision (sub retainage cannot exceed GC retainage from owner)
- ConsensusDocs endorsement references or copyright notice
- References to "Constructor" (GC) rather than "Contractor" in some editions

CONSENSUSDOCS 750 SUB-UNFAVORABLE DEVIATIONS:
When a ConsensusDocs 750 form is detected, check for these modifications:
- Removed or restricted the 7-day stop-work rights for non-payment -- Flag as CRITICAL with category "Payment Terms" (this is a core ConsensusDocs protection)
- Removed retainage rate matching provision -- Flag as HIGH with category "Payment Terms" (allows GC to retain more from sub than owner retains from GC)
- Expanded withholding grounds beyond the default enumerated list -- Flag as HIGH with category "Payment Terms"
- Removed dispute resolution neutrality (ConsensusDocs default uses binding arbitration with neutral selection) -- Flag as MEDIUM with category "Legal Issues"
- Deleted mutual waiver of consequential damages -- Flag as CRITICAL with category "Legal Issues"
- Modified termination provisions to allow GC termination without cause while restricting sub termination rights -- Flag as HIGH with category "Legal Issues"

EJCDC C-520 DETECTION PATTERNS:
Identify an EJCDC C-520 subcontract by the presence of these indicators:
- Engineer-centric language (references to "Engineer" rather than "Architect" for design professional)
- Cross-references to EJCDC C-700 (Standard General Conditions of the Construction Contract)
- Use of "Stipulated Price" terminology for the contract amount
- Paragraph-based numbering system
- EJCDC copyright notice or header referencing "Engineers Joint Contract Documents Committee"
- Common in public works and infrastructure projects

EJCDC C-520 SUB-UNFAVORABLE DEVIATIONS:
When an EJCDC C-520 form is detected, check for these modifications:
- Modified dispute resolution to remove neutral third-party involvement or favor GC -- Flag as HIGH with category "Legal Issues"
- Removed or shortened notice provisions below EJCDC defaults -- Flag as MEDIUM with category "Contract Compliance"
- Broadened GC termination rights beyond the EJCDC default grounds -- Flag as HIGH with category "Legal Issues"
- Added indemnification obligations beyond sub's own negligence -- Flag as CRITICAL with category "Legal Issues"
- Removed sub's right to stop work or suspend performance -- Flag as HIGH with category "Payment Terms"
- Shortened payment timing below EJCDC defaults -- Flag as MEDIUM with category "Payment Terms"

CUSTOM OR PROPRIETARY FORM DETECTION:
If the contract does not match any of the detection patterns above (no AIA, ConsensusDocs, or EJCDC indicators), it is likely a custom or proprietary form.
- Generate an INFO severity finding with category "Contract Compliance": "Non-standard contract form detected. This appears to be a custom or proprietary subcontract form rather than an industry-standard document (AIA A401, ConsensusDocs 750, or EJCDC C-520). Recommend heightened review scrutiny as custom forms lack the industry-negotiated balance of standard forms."
- Custom forms should trigger more careful review of ALL contract provisions since there is no known baseline to compare against

ANALYSIS INSTRUCTIONS:
When reviewing a subcontract:

1. First, identify the contract form family by checking detection patterns in this order: AIA A401, ConsensusDocs 750, EJCDC C-520, then Custom
2. Once the form is identified, check for sub-unfavorable deviations from that form's default provisions
3. Only flag deviations that are sub-unfavorable -- do not flag neutral changes or sub-favorable modifications
4. In findings, reference the specific form provision that was modified (e.g., "AIA A401 Section 4.6 modified to add pay-if-paid language")
5. Do not reproduce copyrighted contract language in findings -- describe the deviation and its effect
6. For custom forms, apply general subcontractor risk analysis without form-specific deviation checking
7. If the form family cannot be determined with confidence, note this as an INFO finding and proceed with general analysis`;

export const contractForms: KnowledgeModule = {
  id: 'contract-forms',
  domain: 'standards',
  title: 'Contract Standard Form Detection and Deviation Analysis',
  effectiveDate: '2026-03-01',
  reviewByDate: '2027-03-01',
  content,
  tokenEstimate: Math.ceil(content.length / 4),
};
