export type Severity = 'Critical' | 'High' | 'Medium' | 'Low' | 'Info';

export type Category =
'Legal Issues' |
'Scope of Work' |
'Contract Compliance' |
'Labor Compliance' |
'Insurance Requirements' |
'Important Dates' |
'Financial Terms' |
'Technical Standards' |
'Risk Assessment';

export type LegalMeta =
  | { clauseType: 'indemnification'; riskType: 'limited' | 'intermediate' | 'broad'; hasInsuranceGap: boolean }
  | { clauseType: 'payment-contingency'; paymentType: 'pay-if-paid' | 'pay-when-paid'; enforceabilityContext: string }
  | { clauseType: 'liquidated-damages'; amountOrRate: string; capStatus: 'capped' | 'uncapped'; proportionalityAssessment: string }
  | { clauseType: 'retainage'; percentage: string; releaseCondition: string; tiedTo: 'sub-work' | 'project-completion' | 'unspecified' };

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
  sourcePass?: string;
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
  passResults?: Array<{ passName: string; status: 'success' | 'failed'; error?: string }>;
}

export type ViewState =
'dashboard' |
'upload' |
'review' |
'contracts' |
'settings';