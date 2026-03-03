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