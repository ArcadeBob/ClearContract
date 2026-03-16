/**
 * Test fixtures for all 16 analysis passes + synthesis pass.
 *
 * These fixtures provide raw JSON objects matching what the Anthropic API
 * would return for each pass -- flat pass-specific fields, NOT the
 * Zod-parsed MergedFinding shape with legalMeta/scopeMeta nesting.
 */
import { vi } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ANALYSIS_PASSES } from '../passes';

// ---------------------------------------------------------------------------
// Pass name constant (exported for test assertions)
// ---------------------------------------------------------------------------

export const PASS_NAMES = ANALYSIS_PASSES.map((p) => p.name);

// ---------------------------------------------------------------------------
// Common base fields shared by all pass fixture findings
// ---------------------------------------------------------------------------

function findingBase(passLabel: string, category: string) {
  return {
    severity: 'Medium' as const,
    title: `Test ${passLabel} Finding 0`,
    description: `Test description for ${passLabel} finding.`,
    recommendation: `Test recommendation for ${passLabel}.`,
    clauseReference: 'Section X.X',
    clauseText: 'Sample clause text',
    explanation: 'Sample explanation',
    crossReferences: [] as string[],
    negotiationPosition: 'Request amendment',
    actionPriority: 'monitor' as const,
    category,
  };
}

// ---------------------------------------------------------------------------
// 16 pass fixtures (raw flat-field objects)
// ---------------------------------------------------------------------------

export const passFixtures: Record<string, Record<string, unknown>> = {
  'risk-overview': {
    client: 'Test Construction Corp',
    contractType: 'Subcontract',
    findings: [
      {
        severity: 'High',
        category: 'Risk Assessment',
        title: 'Overall Risk Assessment',
        description: 'Contract contains multiple high-risk clauses',
        recommendation: 'Review all flagged items before signing',
        clauseReference: 'Multiple sections',
        negotiationPosition: 'Review recommended',
        actionPriority: 'pre-sign',
      },
    ],
    dates: [],
  },

  'dates-deadlines': {
    findings: [
      {
        ...findingBase('DatesDeadlines', 'Important Dates'),
        periodType: 'project-milestone',
        duration: '180 days',
        triggerEvent: 'NTP',
      },
    ],
    dates: [
      { label: 'Substantial Completion', date: '2026-12-01', type: 'Deadline' },
    ],
  },

  'scope-of-work': {
    findings: [
      {
        ...findingBase('ScopeOfWork', 'Scope of Work'),
        scopeItemType: 'exclusion',
        specificationReference: 'Section 08 80 00',
        affectedTrade: 'Glazing',
      },
    ],
    dates: [],
  },

  'legal-indemnification': {
    findings: [
      {
        ...findingBase('Indemnification', 'Legal Issues'),
        riskType: 'limited',
        hasInsuranceGap: false,
      },
    ],
    dates: [],
  },

  'legal-payment-contingency': {
    findings: [
      {
        ...findingBase('PaymentContingency', 'Financial Terms'),
        paymentType: 'pay-when-paid',
        enforceabilityContext: 'Standard in CA',
      },
    ],
    dates: [],
  },

  'legal-liquidated-damages': {
    findings: [
      {
        ...findingBase('LiquidatedDamages', 'Financial Terms'),
        amountOrRate: '$500/day',
        capStatus: 'capped',
        proportionalityAssessment: 'Reasonable',
      },
    ],
    dates: [],
  },

  'legal-retainage': {
    findings: [
      {
        ...findingBase('Retainage', 'Financial Terms'),
        percentage: '10%',
        releaseCondition: 'Final completion',
        tiedTo: 'sub-work',
      },
    ],
    dates: [],
  },

  'legal-insurance': {
    findings: [
      {
        ...findingBase('Insurance', 'Insurance Requirements'),
        coverageItems: [
          { coverageType: 'GL', requiredLimit: '$1M', isAboveStandard: false },
        ],
        endorsements: [],
        certificateHolder: 'Owner',
      },
    ],
    dates: [],
  },

  'legal-termination': {
    findings: [
      {
        ...findingBase('Termination', 'Legal Issues'),
        terminationType: 'for-cause',
        noticePeriod: '30 days',
        compensation: 'Work completed to date',
        curePeriod: '10 days',
      },
    ],
    dates: [],
  },

  'legal-flow-down': {
    findings: [
      {
        ...findingBase('FlowDown', 'Legal Issues'),
        flowDownScope: 'blanket',
        problematicObligations: [],
        primeContractAvailable: false,
      },
    ],
    dates: [],
  },

  'legal-no-damage-delay': {
    findings: [
      {
        ...findingBase('NoDamageDelay', 'Legal Issues'),
        waiverScope: 'absolute',
        exceptions: [],
        enforceabilityContext: 'Enforceable in CA',
      },
    ],
    dates: [],
  },

  'legal-lien-rights': {
    findings: [
      {
        ...findingBase('LienRights', 'Financial Terms'),
        waiverType: 'conditional',
        lienFilingDeadline: '90 days',
        enforceabilityContext: 'Standard timeline',
      },
    ],
    dates: [],
  },

  'legal-dispute-resolution': {
    findings: [
      {
        ...findingBase('DisputeResolution', 'Legal Issues'),
        mechanism: 'mandatory-arbitration',
        venue: 'County of project',
        feeShifting: 'none',
        mediationRequired: true,
      },
    ],
    dates: [],
  },

  'legal-change-order': {
    findings: [
      {
        ...findingBase('ChangeOrder', 'Contract Compliance'),
        changeType: 'mutual',
        noticeRequired: '5 days written',
        pricingMechanism: 'Time and materials',
        proceedPending: true,
      },
    ],
    dates: [],
  },

  'verbiage-analysis': {
    findings: [
      {
        ...findingBase('Verbiage', 'Contract Compliance'),
        issueType: 'ambiguous-language',
        affectedParty: 'subcontractor',
        suggestedClarification: 'Clarify scope boundaries',
      },
    ],
    dates: [],
  },

  'labor-compliance': {
    findings: [
      {
        ...findingBase('LaborCompliance', 'Labor Compliance'),
        requirementType: 'prevailing-wage',
        responsibleParty: 'Subcontractor',
        contactInfo: 'DIR',
        deadline: 'Pre-job',
        checklistItems: [
          {
            item: 'Certified payroll',
            deadline: 'Weekly',
            responsibleParty: 'Sub',
            contactInfo: 'DIR',
            status: 'required',
          },
        ],
      },
    ],
    dates: [],
  },
};

// ---------------------------------------------------------------------------
// Synthesis fixture
// ---------------------------------------------------------------------------

export const synthesisFixture = {
  findings: [
    {
      title: 'Cash Flow Squeeze',
      description:
        'Pay-if-paid combined with high retainage creates compounded cash flow risk',
      recommendation:
        'Negotiate payment terms and retainage reduction before signing',
      constituentFindings: [
        'Test PaymentContingency Finding 0',
        'Test Retainage Finding 0',
      ],
      actionPriority: 'pre-sign' as const,
    },
  ],
};

// ---------------------------------------------------------------------------
// Stream response helper
// ---------------------------------------------------------------------------

export function createStreamResponse(jsonText: string) {
  return {
    async *[Symbol.asyncIterator]() {
      yield {
        type: 'content_block_delta' as const,
        delta: { type: 'text_delta' as const, text: jsonText },
      };
    },
  };
}

// ---------------------------------------------------------------------------
// Mock request / response helpers
// ---------------------------------------------------------------------------

export function createMockReq(
  overrides?: Record<string, unknown>
): VercelRequest {
  const defaults = {
    method: 'POST',
    body: { pdfBase64: Buffer.from('fake-pdf').toString('base64') },
  };
  return { ...defaults, ...overrides } as unknown as VercelRequest;
}

export function createMockRes() {
  const res = {
    statusCode: 0,
    body: null as unknown,
    headers: {} as Record<string, string | string[]>,
    setHeader: vi.fn((key: string, value: string | string[]) => {
      res.headers[key] = value;
    }),
    status: vi.fn((code: number) => {
      res.statusCode = code;
      return res;
    }),
    json: vi.fn((data: unknown) => {
      res.body = data;
      return res;
    }),
    end: vi.fn(() => res),
  };
  return res as unknown as VercelResponse & typeof res;
}
