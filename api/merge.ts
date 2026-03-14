import type { PassResult, RiskOverviewResult, MergedAnalysisResult, FindingResult } from '../src/schemas/analysis';
import type { LegalMeta, ScopeMeta } from '../src/types/contract';
import { computeRiskScore, applySeverityGuard } from './scoring';

export interface AnalysisPassInfo {
  name: string;
  isOverview: boolean;
  isLegal?: boolean;
  isScope?: boolean;
}

export interface UnifiedFinding {
  severity: string;
  category: string;
  title: string;
  description: string;
  recommendation: string;
  clauseReference: string;
  clauseText?: string;
  explanation?: string;
  crossReferences?: string[];
  legalMeta?: LegalMeta;
  scopeMeta?: ScopeMeta;
  sourcePass?: string;
  negotiationPosition?: string;
  downgradedFrom?: string;
}

function buildBaseFinding(
  finding: FindingResult & Record<string, unknown>,
  passName: string
): UnifiedFinding {
  return {
    severity: finding.severity,
    category: finding.category,
    title: finding.title,
    description: finding.description,
    recommendation: finding.recommendation,
    clauseReference: finding.clauseReference,
    clauseText: finding.clauseText,
    explanation: finding.explanation,
    crossReferences: finding.crossReferences as string[],
    sourcePass: passName,
    negotiationPosition: finding.negotiationPosition,
    downgradedFrom: finding.downgradedFrom,
  };
}

function convertLegalFinding(
  finding: FindingResult & Record<string, unknown>,
  passName: string
): UnifiedFinding {
  const base = buildBaseFinding(finding, passName);

  switch (passName) {
    case 'legal-indemnification':
      base.legalMeta = {
        clauseType: 'indemnification',
        riskType: finding.riskType as 'limited' | 'intermediate' | 'broad',
        hasInsuranceGap: finding.hasInsuranceGap as boolean,
      };
      break;
    case 'legal-payment-contingency':
      base.legalMeta = {
        clauseType: 'payment-contingency',
        paymentType: finding.paymentType as 'pay-if-paid' | 'pay-when-paid',
        enforceabilityContext: finding.enforceabilityContext as string,
      };
      break;
    case 'legal-liquidated-damages':
      base.legalMeta = {
        clauseType: 'liquidated-damages',
        amountOrRate: finding.amountOrRate as string,
        capStatus: finding.capStatus as 'capped' | 'uncapped',
        proportionalityAssessment: finding.proportionalityAssessment as string,
      };
      break;
    case 'legal-retainage':
      base.legalMeta = {
        clauseType: 'retainage',
        percentage: finding.percentage as string,
        releaseCondition: finding.releaseCondition as string,
        tiedTo: finding.tiedTo as 'sub-work' | 'project-completion' | 'unspecified',
      };
      break;
    case 'legal-insurance':
      base.legalMeta = {
        clauseType: 'insurance',
        coverageItems: finding.coverageItems as Array<{
          coverageType: string;
          requiredLimit: string;
          isAboveStandard: boolean;
        }>,
        endorsements: finding.endorsements as Array<{
          endorsementType: string;
          isNonStandard: boolean;
        }>,
        certificateHolder: finding.certificateHolder as string,
      };
      break;
    case 'legal-termination':
      base.legalMeta = {
        clauseType: 'termination',
        terminationType: finding.terminationType as string,
        noticePeriod: finding.noticePeriod as string,
        compensation: finding.compensation as string,
        curePeriod: finding.curePeriod as string,
      };
      break;
    case 'legal-flow-down':
      base.legalMeta = {
        clauseType: 'flow-down',
        flowDownScope: finding.flowDownScope as string,
        problematicObligations: finding.problematicObligations as string[],
        primeContractAvailable: finding.primeContractAvailable as boolean,
      };
      break;
    case 'legal-no-damage-delay':
      base.legalMeta = {
        clauseType: 'no-damage-delay',
        waiverScope: finding.waiverScope as string,
        exceptions: finding.exceptions as string[],
        enforceabilityContext: finding.enforceabilityContext as string,
      };
      break;
    case 'legal-lien-rights':
      base.legalMeta = {
        clauseType: 'lien-rights',
        waiverType: finding.waiverType as string,
        lienFilingDeadline: finding.lienFilingDeadline as string,
        enforceabilityContext: finding.enforceabilityContext as string,
      };
      break;
    case 'legal-dispute-resolution':
      base.legalMeta = {
        clauseType: 'dispute-resolution',
        mechanism: finding.mechanism as string,
        venue: finding.venue as string,
        feeShifting: finding.feeShifting as string,
        mediationRequired: finding.mediationRequired as boolean,
      };
      break;
    case 'legal-change-order':
      base.legalMeta = {
        clauseType: 'change-order',
        changeType: finding.changeType as string,
        noticeRequired: finding.noticeRequired as string,
        pricingMechanism: finding.pricingMechanism as string,
        proceedPending: finding.proceedPending as boolean,
      };
      break;
  }

  return base;
}

function convertScopeFinding(
  finding: FindingResult & Record<string, unknown>,
  passName: string
): UnifiedFinding {
  const base = buildBaseFinding(finding, passName);

  switch (passName) {
    case 'scope-of-work':
      base.scopeMeta = {
        passType: 'scope-of-work',
        scopeItemType: finding.scopeItemType as string,
        specificationReference: finding.specificationReference as string,
        affectedTrade: finding.affectedTrade as string,
      };
      break;
    case 'dates-deadlines':
      base.scopeMeta = {
        passType: 'dates-deadlines',
        periodType: finding.periodType as string,
        duration: finding.duration as string,
        triggerEvent: finding.triggerEvent as string,
      };
      break;
    case 'verbiage-analysis':
      base.scopeMeta = {
        passType: 'verbiage',
        issueType: finding.issueType as string,
        affectedParty: finding.affectedParty as string,
        suggestedClarification: finding.suggestedClarification as string,
      };
      break;
    case 'labor-compliance':
      base.scopeMeta = {
        passType: 'labor-compliance',
        requirementType: finding.requirementType as string,
        responsibleParty: finding.responsibleParty as string,
        contactInfo: finding.contactInfo as string,
        deadline: finding.deadline as string,
        checklistItems: (
          (finding.checklistItems as Array<Record<string, unknown>>) || []
        ).map((item) => ({
          item: item.item as string,
          deadline: item.deadline as string,
          responsibleParty: item.responsibleParty as string,
          contactInfo: item.contactInfo as string,
          status: item.status as 'required' | 'conditional' | 'recommended',
        })),
      };
      break;
  }

  return base;
}

export function mergePassResults(
  results: PromiseSettledResult<{
    passName: string;
    result: PassResult | RiskOverviewResult;
  }>[],
  passes: AnalysisPassInfo[]
): MergedAnalysisResult {
  const allFindings: UnifiedFinding[] = [];
  const allDates: Array<PassResult['dates'][number]> = [];
  const passResults: MergedAnalysisResult['passResults'] = [];

  let client = 'Unknown Client';
  let contractType: MergedAnalysisResult['contractType'] = 'Subcontract';

  const severityRank: Record<string, number> = {
    Critical: 5,
    High: 4,
    Medium: 3,
    Low: 2,
    Info: 1,
  };

  for (let i = 0; i < results.length; i++) {
    const settled = results[i];
    const passName = passes[i].name;

    if (settled.status === 'fulfilled') {
      const { result } = settled.value;
      allDates.push(...result.dates);
      passResults.push({ passName, status: 'success' });

      if (passes[i].isOverview && 'client' in result) {
        const overview = result as RiskOverviewResult;
        client = overview.client || client;
        contractType = overview.contractType || contractType;
      }

      if (passes[i].isLegal) {
        for (const f of result.findings) {
          allFindings.push(
            convertLegalFinding(f as FindingResult & Record<string, unknown>, passName)
          );
        }
      } else if (passes[i].isScope) {
        for (const f of result.findings) {
          allFindings.push(
            convertScopeFinding(f as FindingResult & Record<string, unknown>, passName)
          );
        }
      } else {
        for (const f of result.findings) {
          allFindings.push({
            ...f,
            sourcePass: passName,
            negotiationPosition: f.negotiationPosition,
          });
        }
      }
    } else {
      const errorMessage =
        settled.reason instanceof Error
          ? settled.reason.message
          : String(settled.reason);

      passResults.push({ passName, status: 'failed', error: errorMessage });

      allFindings.push({
        severity: 'Critical',
        category: 'Risk Assessment',
        title: `Analysis Pass Failed: ${passName}`,
        description: `The ${passName} analysis pass failed: ${errorMessage}`,
        recommendation:
          'Try uploading the contract again. If the problem persists, the contract may have formatting issues that prevent analysis.',
        clauseReference: 'N/A',
        sourcePass: passName,
      });
    }
  }

  // --- Enhanced deduplication ---
  const isSpecializedPass = (sp: string) =>
    sp.startsWith('legal-') ||
    ['scope-of-work', 'dates-deadlines', 'verbiage-analysis', 'labor-compliance'].includes(sp);

  // Phase 1: clauseReference + category composite key dedup
  const byClauseAndCategory = new Map<string, UnifiedFinding>();
  const noClauseRefFindings: UnifiedFinding[] = [];

  for (const finding of allFindings) {
    const clauseRef = finding.clauseReference;
    if (clauseRef && clauseRef !== 'N/A' && clauseRef !== 'Not Found') {
      const key = `${clauseRef}::${finding.category}`;
      const existing = byClauseAndCategory.get(key);

      if (!existing) {
        byClauseAndCategory.set(key, finding);
      } else {
        const findingIsSpecialized = isSpecializedPass(finding.sourcePass || '');
        const existingIsSpecialized = isSpecializedPass(existing.sourcePass || '');

        if (findingIsSpecialized && !existingIsSpecialized) {
          byClauseAndCategory.set(key, finding);
        } else if (!findingIsSpecialized && existingIsSpecialized) {
          // Keep existing
        } else if (
          (severityRank[finding.severity] || 0) >
          (severityRank[existing.severity] || 0)
        ) {
          byClauseAndCategory.set(key, finding);
        }
      }
    } else {
      noClauseRefFindings.push(finding);
    }
  }

  // Phase 2: title-based dedup as fallback
  const byTitle = new Map<string, UnifiedFinding>();
  for (const finding of byClauseAndCategory.values()) {
    const existing = byTitle.get(finding.title);
    if (
      !existing ||
      (severityRank[finding.severity] || 0) > (severityRank[existing.severity] || 0)
    ) {
      byTitle.set(finding.title, finding);
    }
  }
  for (const finding of noClauseRefFindings) {
    const existing = byTitle.get(finding.title);
    if (!existing) {
      byTitle.set(finding.title, finding);
    } else {
      const findingIsSpecialized = isSpecializedPass(finding.sourcePass || '');
      const existingIsSpecialized = isSpecializedPass(existing.sourcePass || '');

      if (findingIsSpecialized && !existingIsSpecialized) {
        byTitle.set(finding.title, finding);
      } else if (!findingIsSpecialized && existingIsSpecialized) {
        // Keep existing
      } else if (
        (severityRank[finding.severity] || 0) > (severityRank[existing.severity] || 0)
      ) {
        byTitle.set(finding.title, finding);
      }
    }
  }

  const deduplicatedFindings = Array.from(byTitle.values());

  // Compute risk score BEFORE severity guard (uses original severities)
  const riskScore = computeRiskScore(deduplicatedFindings);

  // Apply CA void-by-law severity guard AFTER risk score (display-only upgrade)
  for (const finding of deduplicatedFindings) {
    applySeverityGuard(finding);
  }

  return {
    client,
    contractType,
    riskScore,
    findings: deduplicatedFindings as MergedAnalysisResult['findings'],
    dates: allDates,
    passResults,
  };
}
