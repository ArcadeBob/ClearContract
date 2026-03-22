import { z } from 'zod';
import type { PassResult, RiskOverviewResult, MergedAnalysisResult } from '../src/schemas/analysis';
import type { Severity, Category, LegalMeta, ScopeMeta } from '../src/types/contract';
import { computeRiskScore, applySeverityGuard } from './scoring';
import { getAllModules } from '../src/knowledge/registry';

import {
  IndemnificationFindingSchema,
  PaymentContingencyFindingSchema,
  LiquidatedDamagesFindingSchema,
  RetainageFindingSchema,
  InsuranceFindingSchema,
  TerminationFindingSchema,
  FlowDownFindingSchema,
  NoDamageDelayFindingSchema,
  LienRightsFindingSchema,
  DisputeResolutionFindingSchema,
  ChangeOrderFindingSchema,
} from '../src/schemas/legalAnalysis';

import {
  ScopeOfWorkFindingSchema,
  DatesDeadlinesFindingSchema,
  VerbiageFindingSchema,
  LaborComplianceFindingSchema,
} from '../src/schemas/scopeComplianceAnalysis';

export interface AnalysisPassInfo {
  name: string;
  isOverview: boolean;
  isLegal?: boolean;
  isScope?: boolean;
}

export interface UnifiedFinding {
  severity: Severity;
  category: Category;
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
  downgradedFrom?: Severity;
  isSynthesis?: boolean;
  actionPriority?: 'pre-bid' | 'pre-sign' | 'monitor';
}

// ---------------------------------------------------------------------------
// Base finding builder -- accepts any object with the common finding fields
// ---------------------------------------------------------------------------

interface BaseFindingFields {
  severity: string;
  category: string;
  title: string;
  description: string;
  recommendation: string;
  clauseReference: string;
  clauseText?: string;
  explanation?: string;
  crossReferences?: string[];
  negotiationPosition?: string;
  downgradedFrom?: string;
  actionPriority?: string;
}

function buildBaseFinding(
  finding: BaseFindingFields,
  passName: string
): UnifiedFinding {
  return {
    severity: finding.severity as Severity,
    category: finding.category as Category,
    title: finding.title,
    description: finding.description,
    recommendation: finding.recommendation,
    clauseReference: finding.clauseReference,
    clauseText: finding.clauseText,
    explanation: finding.explanation,
    crossReferences: finding.crossReferences,
    sourcePass: passName,
    negotiationPosition: finding.negotiationPosition,
    downgradedFrom: finding.downgradedFrom as Severity | undefined,
    actionPriority: finding.actionPriority as 'pre-bid' | 'pre-sign' | 'monitor' | undefined,
  };
}

// NOTE on remaining `as Severity` / `as Category` / `as 'pre-bid'|...` casts in buildBaseFinding:
// These are Zod-validated enum-to-type-alias casts. Zod's z.enum returns the
// literal string union, but the TS types are branded (Severity = 'Critical'|...).
// The Zod parse has already validated them, so these are safe narrowing casts,
// NOT the unsafe assertion casts the plan eliminates (Record/Array/unknown etc).

// ---------------------------------------------------------------------------
// Typed converter functions (one per pass)
// ---------------------------------------------------------------------------

type IndemnificationFinding = z.infer<typeof IndemnificationFindingSchema>;

function convertIndemnificationFinding(finding: IndemnificationFinding, passName: string): UnifiedFinding {
  return {
    ...buildBaseFinding(finding, passName),
    legalMeta: {
      clauseType: 'indemnification',
      riskType: finding.riskType,
      hasInsuranceGap: finding.hasInsuranceGap,
    },
  };
}

type PaymentContingencyFinding = z.infer<typeof PaymentContingencyFindingSchema>;

function convertPaymentContingencyFinding(finding: PaymentContingencyFinding, passName: string): UnifiedFinding {
  return {
    ...buildBaseFinding(finding, passName),
    legalMeta: {
      clauseType: 'payment-contingency',
      paymentType: finding.paymentType,
      enforceabilityContext: finding.enforceabilityContext,
    },
  };
}

type LiquidatedDamagesFinding = z.infer<typeof LiquidatedDamagesFindingSchema>;

function convertLiquidatedDamagesFinding(finding: LiquidatedDamagesFinding, passName: string): UnifiedFinding {
  return {
    ...buildBaseFinding(finding, passName),
    legalMeta: {
      clauseType: 'liquidated-damages',
      amountOrRate: finding.amountOrRate,
      capStatus: finding.capStatus,
      proportionalityAssessment: finding.proportionalityAssessment,
    },
  };
}

type RetainageFinding = z.infer<typeof RetainageFindingSchema>;

function convertRetainageFinding(finding: RetainageFinding, passName: string): UnifiedFinding {
  return {
    ...buildBaseFinding(finding, passName),
    legalMeta: {
      clauseType: 'retainage',
      percentage: finding.percentage,
      releaseCondition: finding.releaseCondition,
      tiedTo: finding.tiedTo,
    },
  };
}

type InsuranceFinding = z.infer<typeof InsuranceFindingSchema>;

function convertInsuranceFinding(finding: InsuranceFinding, passName: string): UnifiedFinding {
  return {
    ...buildBaseFinding(finding, passName),
    legalMeta: {
      clauseType: 'insurance',
      coverageItems: finding.coverageItems,
      endorsements: finding.endorsements,
      certificateHolder: finding.certificateHolder,
    },
  };
}

type TerminationFinding = z.infer<typeof TerminationFindingSchema>;

function convertTerminationFinding(finding: TerminationFinding, passName: string): UnifiedFinding {
  return {
    ...buildBaseFinding(finding, passName),
    legalMeta: {
      clauseType: 'termination',
      terminationType: finding.terminationType,
      noticePeriod: finding.noticePeriod,
      compensation: finding.compensation,
      curePeriod: finding.curePeriod,
    },
  };
}

type FlowDownFinding = z.infer<typeof FlowDownFindingSchema>;

function convertFlowDownFinding(finding: FlowDownFinding, passName: string): UnifiedFinding {
  return {
    ...buildBaseFinding(finding, passName),
    legalMeta: {
      clauseType: 'flow-down',
      flowDownScope: finding.flowDownScope,
      problematicObligations: finding.problematicObligations,
      primeContractAvailable: finding.primeContractAvailable,
    },
  };
}

type NoDamageDelayFinding = z.infer<typeof NoDamageDelayFindingSchema>;

function convertNoDamageDelayFinding(finding: NoDamageDelayFinding, passName: string): UnifiedFinding {
  return {
    ...buildBaseFinding(finding, passName),
    legalMeta: {
      clauseType: 'no-damage-delay',
      waiverScope: finding.waiverScope,
      exceptions: finding.exceptions,
      enforceabilityContext: finding.enforceabilityContext,
    },
  };
}

type LienRightsFinding = z.infer<typeof LienRightsFindingSchema>;

function convertLienRightsFinding(finding: LienRightsFinding, passName: string): UnifiedFinding {
  return {
    ...buildBaseFinding(finding, passName),
    legalMeta: {
      clauseType: 'lien-rights',
      waiverType: finding.waiverType,
      lienFilingDeadline: finding.lienFilingDeadline,
      enforceabilityContext: finding.enforceabilityContext,
    },
  };
}

type DisputeResolutionFinding = z.infer<typeof DisputeResolutionFindingSchema>;

function convertDisputeResolutionFinding(finding: DisputeResolutionFinding, passName: string): UnifiedFinding {
  return {
    ...buildBaseFinding(finding, passName),
    legalMeta: {
      clauseType: 'dispute-resolution',
      mechanism: finding.mechanism,
      venue: finding.venue,
      feeShifting: finding.feeShifting,
      mediationRequired: finding.mediationRequired,
    },
  };
}

type ChangeOrderFinding = z.infer<typeof ChangeOrderFindingSchema>;

function convertChangeOrderFinding(finding: ChangeOrderFinding, passName: string): UnifiedFinding {
  return {
    ...buildBaseFinding(finding, passName),
    legalMeta: {
      clauseType: 'change-order',
      changeType: finding.changeType,
      noticeRequired: finding.noticeRequired,
      pricingMechanism: finding.pricingMechanism,
      proceedPending: finding.proceedPending,
    },
  };
}

// --- Scope converter functions ---

type ScopeOfWorkFinding = z.infer<typeof ScopeOfWorkFindingSchema>;

function convertScopeOfWorkFinding(finding: ScopeOfWorkFinding, passName: string): UnifiedFinding {
  return {
    ...buildBaseFinding(finding, passName),
    scopeMeta: {
      passType: 'scope-of-work',
      scopeItemType: finding.scopeItemType,
      specificationReference: finding.specificationReference,
      affectedTrade: finding.affectedTrade,
    },
  };
}

type DatesDeadlinesFinding = z.infer<typeof DatesDeadlinesFindingSchema>;

function convertDatesDeadlinesFinding(finding: DatesDeadlinesFinding, passName: string): UnifiedFinding {
  return {
    ...buildBaseFinding(finding, passName),
    scopeMeta: {
      passType: 'dates-deadlines',
      periodType: finding.periodType,
      duration: finding.duration,
      triggerEvent: finding.triggerEvent,
    },
  };
}

type VerbiageFinding = z.infer<typeof VerbiageFindingSchema>;

function convertVerbiageFinding(finding: VerbiageFinding, passName: string): UnifiedFinding {
  return {
    ...buildBaseFinding(finding, passName),
    scopeMeta: {
      passType: 'verbiage',
      issueType: finding.issueType,
      affectedParty: finding.affectedParty,
      suggestedClarification: finding.suggestedClarification,
    },
  };
}

type LaborComplianceFinding = z.infer<typeof LaborComplianceFindingSchema>;

function convertLaborComplianceFinding(finding: LaborComplianceFinding, passName: string): UnifiedFinding {
  return {
    ...buildBaseFinding(finding, passName),
    scopeMeta: {
      passType: 'labor-compliance',
      requirementType: finding.requirementType,
      responsibleParty: finding.responsibleParty,
      contactInfo: finding.contactInfo,
      deadline: finding.deadline,
      checklistItems: finding.checklistItems,
    },
  };
}

// ---------------------------------------------------------------------------
// Pass handler dispatch map (generic helper avoids casts)
// ---------------------------------------------------------------------------

interface PassHandler {
  schema: z.ZodTypeAny;
  convert: (finding: never, passName: string) => UnifiedFinding;
}

function createHandler<T extends z.ZodTypeAny>(
  schema: T,
  convert: (finding: z.infer<T>, passName: string) => UnifiedFinding
): PassHandler {
  return { schema, convert: convert as PassHandler['convert'] };
}

const passHandlers: Record<string, PassHandler> = {
  'legal-indemnification': createHandler(IndemnificationFindingSchema, convertIndemnificationFinding),
  'legal-payment-contingency': createHandler(PaymentContingencyFindingSchema, convertPaymentContingencyFinding),
  'legal-liquidated-damages': createHandler(LiquidatedDamagesFindingSchema, convertLiquidatedDamagesFinding),
  'legal-retainage': createHandler(RetainageFindingSchema, convertRetainageFinding),
  'legal-insurance': createHandler(InsuranceFindingSchema, convertInsuranceFinding),
  'legal-termination': createHandler(TerminationFindingSchema, convertTerminationFinding),
  'legal-flow-down': createHandler(FlowDownFindingSchema, convertFlowDownFinding),
  'legal-no-damage-delay': createHandler(NoDamageDelayFindingSchema, convertNoDamageDelayFinding),
  'legal-lien-rights': createHandler(LienRightsFindingSchema, convertLienRightsFinding),
  'legal-dispute-resolution': createHandler(DisputeResolutionFindingSchema, convertDisputeResolutionFinding),
  'legal-change-order': createHandler(ChangeOrderFindingSchema, convertChangeOrderFinding),
  'scope-of-work': createHandler(ScopeOfWorkFindingSchema, convertScopeOfWorkFinding),
  'dates-deadlines': createHandler(DatesDeadlinesFindingSchema, convertDatesDeadlinesFinding),
  'verbiage-analysis': createHandler(VerbiageFindingSchema, convertVerbiageFinding),
  'labor-compliance': createHandler(LaborComplianceFindingSchema, convertLaborComplianceFinding),
};

// ---------------------------------------------------------------------------
// Type guard for risk overview results
// ---------------------------------------------------------------------------

function isRiskOverview(r: PassResult | RiskOverviewResult): r is RiskOverviewResult {
  return 'client' in r;
}

// ---------------------------------------------------------------------------
// Staleness check for knowledge modules
// ---------------------------------------------------------------------------

function checkModuleStaleness(): UnifiedFinding[] {
  const now = new Date();
  const findings: UnifiedFinding[] = [];

  for (const mod of getAllModules()) {
    if (new Date(mod.expirationDate) < now) {
      findings.push({
        severity: 'Info',
        category: 'Risk Assessment',
        title: `Knowledge Module Outdated: ${mod.title}`,
        description: `The ${mod.title} module (effective ${mod.effectiveDate}) expired on ${mod.expirationDate}. Findings derived from this module should be verified against current statutes.`,
        recommendation: 'Verify findings from this module against current law before relying on them.',
        clauseReference: 'N/A',
        sourcePass: 'staleness-check',
      });
    }
  }

  return findings;
}

// ---------------------------------------------------------------------------
// Main merge function
// ---------------------------------------------------------------------------

/** MergedAnalysisResult with findings widened to UnifiedFinding[] */
export type MergedResult = Omit<MergedAnalysisResult, 'findings'> & { findings: UnifiedFinding[] };

export function mergePassResults(
  results: PromiseSettledResult<{
    passName: string;
    result: PassResult | RiskOverviewResult;
  }>[],
  passes: AnalysisPassInfo[]
): MergedResult {
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

      if (passes[i].isOverview && isRiskOverview(result)) {
        client = result.client || client;
        contractType = result.contractType || contractType;
      }

      const handler = passHandlers[passName];
      if (handler) {
        // Specialized pass -- parse each finding through its Zod schema
        for (const f of result.findings) {
          const parsed = handler.schema.safeParse(f);
          if (parsed.success) {
            allFindings.push(handler.convert(parsed.data as never, passName));
          } else {
            console.error('Malformed finding in pass %s:', passName, parsed.error.issues);
          }
        }
      } else {
        // Generic/overview findings -- no special meta
        for (const f of result.findings) {
          allFindings.push(buildBaseFinding(f, passName));
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

  // Append staleness warnings for expired knowledge modules (Info severity, weight 0)
  deduplicatedFindings.push(...checkModuleStaleness());

  // Compute risk score BEFORE severity guard (uses original severities)
  const scoreResult = computeRiskScore(deduplicatedFindings);

  // Apply CA void-by-law severity guard AFTER risk score (display-only upgrade)
  for (const finding of deduplicatedFindings) {
    applySeverityGuard(finding);
  }

  return {
    client,
    contractType,
    riskScore: scoreResult.score,
    scoreBreakdown: scoreResult.categories,
    findings: deduplicatedFindings,
    dates: allDates,
    passResults,
  };
}
