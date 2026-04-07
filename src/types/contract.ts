import type { MergedFinding as Finding } from '../schemas/finding';

export const SEVERITIES = ['Critical', 'High', 'Medium', 'Low', 'Info'] as const;
export type Severity = (typeof SEVERITIES)[number];

export const CATEGORIES = [
  'Legal Issues',
  'Scope of Work',
  'Contract Compliance',
  'Labor Compliance',
  'Insurance Requirements',
  'Important Dates',
  'Financial Terms',
  'Technical Standards',
  'Risk Assessment',
  'Compound Risk',
] as const;
export type Category = (typeof CATEGORIES)[number];

export const LIFECYCLE_STATUSES = [
  'Draft',
  'Under Review',
  'Negotiating',
  'Signed',
  'Active',
  'Expired',
] as const;
export type LifecycleStatus = (typeof LIFECYCLE_STATUSES)[number];

export const LIFECYCLE_TRANSITIONS: Record<LifecycleStatus, readonly LifecycleStatus[]> = {
  'Draft':         ['Under Review', 'Expired'],
  'Under Review':  ['Negotiating', 'Signed', 'Draft', 'Expired'],
  'Negotiating':   ['Under Review', 'Signed', 'Expired'],
  'Signed':        ['Active', 'Expired'],
  'Active':        ['Expired'],
  'Expired':       [],
};

export interface InsuranceCoverageItem {
  coverageType: string;
  requiredLimit: string;
  isAboveStandard: boolean;
}

export interface InsuranceEndorsement {
  endorsementType: string;
  isNonStandard: boolean;
}

export type LegalMeta =
  | {
      clauseType: 'indemnification';
      riskType: 'limited' | 'intermediate' | 'broad';
      hasInsuranceGap: boolean;
    }
  | {
      clauseType: 'payment-contingency';
      paymentType: 'pay-if-paid' | 'pay-when-paid';
      enforceabilityContext: string;
    }
  | {
      clauseType: 'liquidated-damages';
      amountOrRate: string;
      capStatus: 'capped' | 'uncapped';
      proportionalityAssessment: string;
    }
  | {
      clauseType: 'retainage';
      percentage: string;
      releaseCondition: string;
      tiedTo: 'sub-work' | 'project-completion' | 'unspecified';
    }
  | {
      clauseType: 'insurance';
      coverageItems: InsuranceCoverageItem[];
      endorsements: InsuranceEndorsement[];
      certificateHolder: string;
    }
  | {
      clauseType: 'termination';
      terminationType: string;
      noticePeriod: string;
      compensation: string;
      curePeriod: string;
    }
  | {
      clauseType: 'flow-down';
      flowDownScope: string;
      problematicObligations: string[];
      primeContractAvailable: boolean;
    }
  | {
      clauseType: 'no-damage-delay';
      waiverScope: string;
      exceptions: string[];
      enforceabilityContext: string;
    }
  | {
      clauseType: 'lien-rights';
      waiverType: string;
      lienFilingDeadline: string;
      enforceabilityContext: string;
    }
  | {
      clauseType: 'dispute-resolution';
      mechanism: string;
      venue: string;
      feeShifting: string;
      mediationRequired: boolean;
    }
  | {
      clauseType: 'change-order';
      changeType: string;
      noticeRequired: string;
      pricingMechanism: string;
      proceedPending: boolean;
    };

export interface ComplianceChecklistItem {
  item: string;
  deadline: string;
  responsibleParty: string;
  contactInfo: string;
  status: 'required' | 'conditional' | 'recommended';
}

export type ScopeMeta =
  | {
      passType: 'scope-extraction';
      scopeItemType: string;
      specificationReference: string;
      affectedTrade: string;
    }
  | {
      passType: 'dates-deadlines';
      periodType: string;
      duration: string;
      triggerEvent: string;
    }
  | {
      passType: 'verbiage';
      issueType: string;
      affectedParty: string;
      suggestedClarification: string;
    }
  | {
      passType: 'labor-compliance';
      requirementType: string;
      responsibleParty: string;
      contactInfo: string;
      deadline: string;
      checklistItems: ComplianceChecklistItem[];
    }
  | {
      passType: 'spec-reconciliation';
      specSection: string;
      typicalDeliverable: string;
      gapType: string;
    }
  | {
      passType: 'exclusion-stress-test';
      exclusionQuote: string;
      tensionQuote: string;
      specSection: string;
      tensionType: string;
    }
  | {
      passType: 'bid-reconciliation';
      contractQuote: string | null;
      bidQuote: string | null;
      reconciliationType: 'exclusion-parity' | 'quantity-delta' | 'unbid-scope';
      directionOfRisk: string;
    }
  | {
      passType: 'warranty';
      warrantyAspect: string;
      warrantyDuration: string;
      affectedParty: string;
    }
  | {
      passType: 'safety-osha';
      safetyAspect: string;
      regulatoryReference: string;
      responsibleParty: string;
    };

export type { MergedFinding as Finding } from '../schemas/finding';

export type BidSignalLevel = 'bid' | 'caution' | 'no-bid';

export interface BidFactor {
  name: string;
  score: number;
  weight: number;
}

export interface BidSignal {
  level: BidSignalLevel;
  label: string;
  score: number;
  factors: BidFactor[];
}

export interface ContractDate {
  label: string;
  date: string;
  type: 'Start' | 'Milestone' | 'Deadline' | 'Expiry';
}

export interface SubmittalEntry {
  type: 'shop-drawing' | 'sample' | 'mockup' | 'product-data';
  description: string;
  reviewDuration: number;
  responsibleParty: string;
  reviewCycles: number;
  resubmittalBuffer: number;
  specSection: string;
  leadTime: number;
  clauseReference: string;
  statedFields: string[];
}

export interface Contract {
  id: string;
  name: string;
  client: string;
  type: 'Prime Contract' | 'Subcontract' | 'Purchase Order' | 'Change Order';
  uploadDate: string;
  status: 'Analyzing' | 'Reviewed' | 'Partial' | 'Draft';
  lifecycleStatus: LifecycleStatus;
  findings: Finding[];
  dates: ContractDate[];
  submittals: SubmittalEntry[];
  bidFileName?: string | null;
  riskScore: number; // 0-100
  scoreBreakdown?: Array<{ name: string; points: number }>;
  bidSignal?: BidSignal;
  passResults?: Array<{
    passName: string;
    status: 'success' | 'failed';
    error?: string;
  }>;
}

export type ViewState =
  | 'dashboard'
  | 'upload'
  | 'review'
  | 'contracts'
  | 'settings'
  | 'compare';
