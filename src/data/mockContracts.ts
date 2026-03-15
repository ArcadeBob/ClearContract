import { Contract } from '../types/contract';

export const MOCK_CONTRACTS: Contract[] = [
  {
    id: 'c1',
    name: 'Oceanview Tower - Prime Contract',
    client: 'Turner Construction',
    type: 'Prime Contract',
    uploadDate: '2023-10-15',
    status: 'Reviewed',
    riskScore: 78,
    dates: [
      { label: 'Effective Date', date: '2023-11-01', type: 'Start' },
      { label: 'Substantial Completion', date: '2025-03-15', type: 'Deadline' },
      { label: 'Warranty Expiry', date: '2027-03-15', type: 'Expiry' },
    ],

    findings: [
      {
        id: 'f1-1',
        severity: 'Critical',
        category: 'Legal Issues',
        title: 'Broad Indemnification Clause',
        description:
          'Section 8.2 requires defense of all claims regardless of fault, extending beyond standard negligence.',
        recommendation:
          'Negotiate to limit indemnification to extent of negligence.',
        clauseReference: 'Section 8.2',
        negotiationPosition: 'Request mutual indemnification limited to each party\'s negligence',
        actionPriority: 'pre-sign',
        resolved: false,
        note: '',
      },
      {
        id: 'f1-2',
        severity: 'Critical',
        category: 'Technical Standards',
        title: 'Missing AAMA 501.1 Requirement',
        description:
          'Specs do not explicitly require AAMA 501.1 dynamic water penetration testing for the curtain wall system.',
        recommendation:
          'Add specific reference to AAMA 501.1 to avoid scope gaps.',
        clauseReference: 'Exhibit C - Specs',
        negotiationPosition: 'Request explicit AAMA 501.1 inclusion in specifications',
        actionPriority: 'pre-bid',
        resolved: false,
        note: '',
      },
      {
        id: 'f1-3',
        severity: 'Critical',
        category: 'Labor Compliance',
        title: 'Missing Prevailing Wage Clause',
        description:
          'Contract fails to cite California Labor Code §1720 requirements despite being a public works project.',
        recommendation:
          'Insert mandatory prevailing wage language to ensure compliance.',
        clauseReference: 'General Conditions',
        negotiationPosition: 'Require prevailing wage clause insertion before execution',
        actionPriority: 'pre-sign',
        resolved: false,
        note: '',
      },
      {
        id: 'f1-4',
        severity: 'High',
        category: 'Financial Terms',
        title: 'Excessive Retention',
        description:
          'Retention is set at 10%, which exceeds the industry standard of 5% for glazing subcontracts.',
        recommendation:
          'Request reduction to 5% consistent with recent legislation.',
        clauseReference: 'Section 4.1',
        negotiationPosition: 'Cite state retention cap legislation and request 5% maximum',
        actionPriority: 'pre-sign',
        resolved: false,
        note: '',
      },
      {
        id: 'f1-5',
        severity: 'High',
        category: 'Financial Terms',
        title: 'Unfavorable Payment Terms',
        description:
          'Payment terms are Net 60 after approval, creating significant cash flow risk.',
        recommendation:
          'Negotiate for Net 30 or "Paid when Paid" with reasonable time limit.',
        clauseReference: 'Section 4.3',
        negotiationPosition: 'Propose Net 30 payment terms with interest on late payments',
        actionPriority: 'pre-sign',
        resolved: false,
        note: '',
      },
      {
        id: 'f1-6',
        severity: 'High',
        category: 'Risk Assessment',
        title: 'Aggressive Liquidated Damages',
        description:
          '$5,000/day LDs with no force majeure exception for material supply delays.',
        recommendation: 'Add exception for supply chain delays beyond control.',
        clauseReference: 'Section 9.5',
        negotiationPosition: 'Add force majeure carve-out for supply chain disruptions',
        actionPriority: 'pre-sign',
        resolved: false,
        note: '',
      },
      {
        id: 'f1-7',
        severity: 'Medium',
        category: 'Technical Standards',
        title: 'Warranty Term Discrepancy',
        description:
          'Warranty term listed as 2 years; AAMA standard recommendation is 5 years.',
        recommendation: 'Clarify if 2 years is intended or error.',
        clauseReference: 'Section 12.1',
        negotiationPosition: 'Request alignment with AAMA 5-year warranty standard',
        actionPriority: 'monitor',
        resolved: false,
        note: '',
      },
    ],
  },
  {
    id: 'c2',
    name: 'Metro Center Retail - Subcontract',
    client: 'Webcor Builders',
    type: 'Subcontract',
    uploadDate: '2023-10-12',
    status: 'Reviewed',
    riskScore: 45,
    dates: [
      { label: 'Start Date', date: '2023-12-01', type: 'Start' },
      { label: 'Mockup Approval', date: '2024-01-15', type: 'Milestone' },
    ],

    findings: [
      {
        id: 'f2-1',
        severity: 'Critical',
        category: 'Insurance Requirements',
        title: 'Missing Pollution Liability',
        description:
          'Contract requires Pollution Liability which is not standard for glazing scope.',
        recommendation: 'Request waiver for this requirement.',
        clauseReference: 'Exhibit D - Insurance',
        negotiationPosition: 'Request waiver of pollution liability for glazing scope',
        actionPriority: 'pre-bid',
        resolved: false,
        note: '',
      },
      {
        id: 'f2-2',
        severity: 'High',
        category: 'Scope of Work',
        title: 'Ambiguous Scope: Storefront vs. Curtain Wall',
        description:
          'Drawings show mixed systems but scope description is vague on transition details.',
        recommendation: 'Define exact transition points and responsibility.',
        clauseReference: 'Scope Exhibit A',
        negotiationPosition: 'Request scope clarification addendum defining transition details',
        actionPriority: 'pre-bid',
        resolved: false,
        note: '',
      },
      {
        id: 'f2-3',
        severity: 'Medium',
        category: 'Important Dates',
        title: 'Accelerated Schedule Risk',
        description:
          'Schedule shows 4 weeks for fabrication; standard is 6-8 weeks.',
        recommendation: 'Flag lead time concern immediately.',
        clauseReference: 'Project Schedule',
        negotiationPosition: 'Request schedule adjustment to 6-8 week fabrication timeline',
        actionPriority: 'pre-bid',
        resolved: false,
        note: '',
      },
    ],
  },
  {
    id: 'c3',
    name: 'Harbor District Office Park - Purchase Order',
    client: 'Viracon',
    type: 'Purchase Order',
    uploadDate: '2023-10-18',
    status: 'Draft',
    riskScore: 15,
    dates: [
      { label: 'Order Date', date: '2023-10-18', type: 'Start' },
      { label: 'Expected Delivery', date: '2023-12-20', type: 'Deadline' },
    ],

    findings: [
      {
        id: 'f3-1',
        severity: 'Medium',
        category: 'Financial Terms',
        title: 'Freight Damage Responsibility',
        description: 'FOB Origin terms shift risk of transit damage to buyer.',
        recommendation: 'Request FOB Destination terms.',
        clauseReference: 'Terms & Conditions',
        negotiationPosition: 'Request FOB Destination to shift transit risk to supplier',
        actionPriority: 'monitor',
        resolved: false,
        note: '',
      },
    ],
  },
];
