// @vitest-environment node

// ---------------------------------------------------------------------------
// Module-level mocks (hoisted above imports by vitest)
// ---------------------------------------------------------------------------

const mockCreate = vi.fn();
const mockFileDelete = vi.fn().mockResolvedValue({});
const mockFileUpload = vi.fn().mockResolvedValue({ id: 'file-reg-123' });

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    beta: {
      messages: { create: mockCreate },
      files: {
        delete: mockFileDelete,
        upload: mockFileUpload,
      },
    },
    files: {
      upload: mockFileUpload,
    },
  })),
}));

vi.mock('./pdf', () => ({
  preparePdfForAnalysis: vi.fn().mockResolvedValue({
    fileId: 'file-reg-123',
    usedFallback: false,
  }),
}));

// Knowledge module mocks (same as analyze.test.ts)
vi.mock('../src/knowledge/registry', () => ({
  getAllModules: vi.fn().mockReturnValue([]),
  getModulesForPass: vi.fn().mockReturnValue([]),
  validateAllModulesRegistered: vi.fn(),
  PASS_KNOWLEDGE_MAP: {},
}));

vi.mock('../src/knowledge/index', () => ({
  composeSystemPrompt: vi.fn().mockImplementation((base: string) => base),
  validateTokenBudget: vi.fn(),
  getModulesForPass: vi.fn().mockReturnValue([]),
  PASS_KNOWLEDGE_MAP: {},
  registerModule: vi.fn(),
  estimateTokens: vi.fn().mockReturnValue(0),
  TOKEN_CAP_PER_MODULE: 4000,
  MAX_MODULES_PER_PASS: 5,
  DEFAULT_COMPANY_PROFILE: {},
}));

vi.mock('../src/knowledge/regulatory/index', () => ({}));
vi.mock('../src/knowledge/trade/index', () => ({}));
vi.mock('../src/knowledge/standards/index', () => ({}));

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import handler from './analyze';
import {
  passFixtures,
  synthesisFixture,
  createStreamResponse,
  createMockReq,
  createMockRes,
  PASS_NAMES,
} from './test-fixtures/pass-responses';
import { MergedFindingSchema } from '../src/schemas/finding';
import { ANALYSIS_PASSES } from './passes';

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

let originalApiKey: string | undefined;

beforeEach(() => {
  originalApiKey = process.env.ANTHROPIC_API_KEY;
  process.env.ANTHROPIC_API_KEY = 'test-key-regression';
  mockCreate.mockReset();
  mockFileDelete.mockReset().mockResolvedValue({});

  // Route each call to the correct pass fixture sequentially
  let callIndex = 0;
  mockCreate.mockImplementation(async () => {
    const passName = PASS_NAMES[callIndex] || 'synthesis';
    callIndex++;
    const fixture =
      passName === 'synthesis'
        ? synthesisFixture
        : passFixtures[passName];
    return createStreamResponse(
      JSON.stringify(fixture || { findings: [], dates: [] })
    );
  });
});

afterEach(() => {
  if (originalApiKey !== undefined) {
    process.env.ANTHROPIC_API_KEY = originalApiKey;
  } else {
    delete process.env.ANTHROPIC_API_KEY;
  }
});

// ---------------------------------------------------------------------------
// Regression suite
// ---------------------------------------------------------------------------

describe('regression suite', { timeout: 30_000 }, () => {
  it('pipeline output structure is stable across fixture replay', async () => {
    const req = createMockReq();
    const res = createMockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(200);

    const body = res.body as Record<string, unknown>;
    expect(body).toHaveProperty('client');
    expect(body).toHaveProperty('contractType');
    expect(body).toHaveProperty('riskScore');
    expect(body).toHaveProperty('scoreBreakdown');
    expect(body).toHaveProperty('bidSignal');
    expect(body).toHaveProperty('findings');
    expect(body).toHaveProperty('dates');
    expect(body).toHaveProperty('passResults');

    expect(body.client).toBe('Test Construction Corp');
    expect(body.contractType).toBe('Subcontract');
    expect(typeof body.riskScore).toBe('number');
    expect(body.riskScore as number).toBeGreaterThanOrEqual(0);
    expect(body.riskScore as number).toBeLessThanOrEqual(100);
    expect(Array.isArray(body.findings)).toBe(true);
    expect((body.findings as unknown[]).length).toBeGreaterThan(0);
    expect(Array.isArray(body.dates)).toBe(true);
  });

  it('all findings validate against MergedFindingSchema', async () => {
    const req = createMockReq();
    const res = createMockRes();
    await handler(req, res);

    const body = res.body as Record<string, unknown>;
    const findings = body.findings as Array<Record<string, unknown>>;
    let parsedCount = 0;

    for (const f of findings) {
      const augmented = {
        ...f,
        resolved: false,
        note: '',
        negotiationPosition: f.negotiationPosition ?? 'Review required',
        actionPriority: f.actionPriority ?? 'monitor',
      };

      try {
        MergedFindingSchema.parse(augmented);
        parsedCount++;
      } catch (error: unknown) {
        const zodErr = error as { message: string };
        throw new Error(
          `Finding '${f.title}' failed schema validation: ${zodErr.message}`
        );
      }
    }

    expect(parsedCount).toBe(findings.length);
  });

  it('merged findings span expected categories', async () => {
    const req = createMockReq();
    const res = createMockRes();
    await handler(req, res);

    const body = res.body as Record<string, unknown>;
    const findings = body.findings as Array<{ category: string }>;

    const categories = new Set(findings.map((f) => f.category));
    // Pipeline covers legal, financial, scope, insurance, dates, compliance, labor
    expect(categories.size).toBeGreaterThanOrEqual(5);
  });

  it('risk score and bid signal are computed from findings', async () => {
    const req = createMockReq();
    const res = createMockRes();
    await handler(req, res);

    const body = res.body as Record<string, unknown>;
    expect(typeof body.riskScore).toBe('number');
    expect(body.riskScore as number).toBeGreaterThanOrEqual(0);
    expect(body.riskScore as number).toBeLessThanOrEqual(100);

    expect(body.scoreBreakdown).toBeDefined();
    expect(typeof body.scoreBreakdown).toBe('object');
    expect(body.scoreBreakdown).not.toBeNull();

    const bidSignal = body.bidSignal as { level: string };
    expect(bidSignal).toHaveProperty('level');
    expect(['bid', 'caution', 'no-bid']).toContain(bidSignal.level);
  });

  it('finding IDs are unique and prefixed', async () => {
    const req = createMockReq();
    const res = createMockRes();
    await handler(req, res);

    const body = res.body as Record<string, unknown>;
    const findings = body.findings as Array<{ id: string }>;

    const ids = findings.map((f) => f.id);
    for (const id of ids) {
      expect(id).toMatch(/^f-/);
    }
    // All IDs should be unique
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('no live API calls are made', async () => {
    const req = createMockReq();
    const res = createMockRes();
    await handler(req, res);

    // 16 analysis passes + 1 synthesis = 17 total mock calls
    expect(mockCreate).toHaveBeenCalledTimes(17);
  });
});
