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
      passType: 'scope-of-work';
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
    };

export interface Finding {
  id: string;
  severity: Severity;
  category: Category;
  title: string;
  description: string;
  recommendation?: string;
  clauseReference?: string;
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
  resolved?: boolean;
  note?: string;
}

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

export interface Contract {
  id: string;
  name: string;
  client: string;
  type: 'Prime Contract' | 'Subcontract' | 'Purchase Order' | 'Change Order';
  uploadDate: string;
  status: 'Analyzing' | 'Reviewed' | 'Draft';
  findings: Finding[];
  dates: ContractDate[];
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
