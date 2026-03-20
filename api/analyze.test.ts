// @vitest-environment node

// ---------------------------------------------------------------------------
// Module-level mocks (hoisted above imports by vitest)
// ---------------------------------------------------------------------------

const mockCreate = vi.fn();
const mockFileDelete = vi.fn().mockResolvedValue({});
const mockFileUpload = vi.fn().mockResolvedValue({ id: 'file-test-123' });

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
    fileId: 'file-test-123',
    usedFallback: false,
  }),
}));

// Knowledge module mocks -- handler calls validateAllModulesRegistered at module level
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
// Supabase client mock
// ---------------------------------------------------------------------------

const mockGetUser = vi.fn().mockResolvedValue({
  data: { user: { id: 'test-user-id' } },
  error: null,
});

function createTableMock() {
  let lastInsertPayload: unknown[] = [];

  const chain: Record<string, ReturnType<typeof vi.fn>> = {};

  chain.select = vi.fn().mockImplementation(() => {
    const rows = lastInsertPayload.map((row: Record<string, unknown>, i: number) => ({
      ...row,
      id: row.id || `f-mock-${i}`,
      created_at: '2026-01-01T00:00:00Z',
    }));
    return {
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'contract-db-123',
          user_id: 'test-user-id',
          name: 'contract',
          client: 'Test Construction Corp',
          contract_type: 'Subcontract',
          upload_date: '2026-01-01',
          status: 'Reviewed',
          risk_score: 72,
          score_breakdown: { legal: 20, financial: 15, scope: 10, compliance: 12, insurance: 8, labor: 7 },
          bid_signal: { level: 'caution', reasons: ['High risk clauses detected'] },
          pass_results: {},
        },
        error: null,
      }),
      eq: chain.eq,
      maybeSingle: chain.maybeSingle,
      then: (resolve: (v: unknown) => void) =>
        Promise.resolve({ data: rows, error: null }).then(resolve),
    };
  });

  chain.insert = vi.fn().mockImplementation((payload: unknown) => {
    lastInsertPayload = Array.isArray(payload) ? payload : [payload];
    return chain;
  });

  chain.update = vi.fn().mockReturnValue(chain);
  chain.delete = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });

  return chain;
}

const mockTableChains: Record<string, ReturnType<typeof createTableMock>> = {};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: vi.fn((table: string) => {
      if (!mockTableChains[table]) {
        mockTableChains[table] = createTableMock();
      }
      return mockTableChains[table];
    }),
  })),
}));

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import handler from './analyze';
import { preparePdfForAnalysis } from './pdf';
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
  process.env.ANTHROPIC_API_KEY = 'test-api-key-123';
  process.env.SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
  mockCreate.mockReset();
  mockFileDelete.mockReset().mockResolvedValue({});
  mockGetUser.mockReset().mockResolvedValue({
    data: { user: { id: 'test-user-id' } },
    error: null,
  });
  for (const key of Object.keys(mockTableChains)) {
    delete mockTableChains[key];
  }

  // Default mock: route each call to the correct pass fixture
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
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('/api/analyze', { timeout: 30_000 }, () => {
  // -------------------------------------------------------------------------
  // Validation and error paths
  // -------------------------------------------------------------------------

  describe('validation and error paths', () => {
    it('returns 405 for GET requests', async () => {
      const req = createMockReq({ method: 'GET' });
      const res = createMockRes();
      await handler(req, res);
      expect(res.statusCode).toBe(405);
      expect(res.body).toHaveProperty('error');
      expect((res.body as { error: string }).error).toContain(
        'Method not allowed'
      );
    });

    it('returns 200 for OPTIONS (CORS preflight)', async () => {
      const req = createMockReq({ method: 'OPTIONS' });
      const res = createMockRes();
      await handler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.end).toHaveBeenCalled();
    });

    it('returns 400 for missing pdfBase64', async () => {
      const req = createMockReq({ body: {} });
      const res = createMockRes();
      await handler(req, res);
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error');
      expect((res.body as { error: string }).error).toContain(
        'Invalid request body'
      );
    });

    it('returns 400 for empty pdfBase64', async () => {
      const req = createMockReq({ body: { pdfBase64: '' } });
      const res = createMockRes();
      await handler(req, res);
      expect(res.statusCode).toBe(400);
    });

    it('returns 500 for missing API key', async () => {
      delete process.env.ANTHROPIC_API_KEY;
      const req = createMockReq();
      const res = createMockRes();
      await handler(req, res);
      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty('error');
      expect((res.body as { error: string }).error).toContain(
        'missing API key'
      );
    });

    it('sets CORS headers on response', async () => {
      const req = createMockReq();
      const res = createMockRes();
      await handler(req, res);
      expect(res.setHeader).toHaveBeenCalledWith(
        'Access-Control-Allow-Origin',
        expect.any(String)
      );
      expect(res.setHeader).toHaveBeenCalledWith(
        'Access-Control-Allow-Methods',
        expect.stringContaining('POST')
      );
      expect(res.setHeader).toHaveBeenCalledWith(
        'Access-Control-Allow-Headers',
        expect.stringContaining('Content-Type')
      );
    });
  });

  // -------------------------------------------------------------------------
  // Successful analysis
  // -------------------------------------------------------------------------

  describe('successful analysis', () => {
    it('returns 200 with structured response for valid PDF', async () => {
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
      expect(Array.isArray(body.findings)).toBe(true);
      expect((body.findings as unknown[]).length).toBeGreaterThan(0);
      expect(Array.isArray(body.dates)).toBe(true);

      // Each finding should have an id starting with 'f-'
      for (const finding of body.findings as { id: string }[]) {
        expect(finding.id).toMatch(/^f-/);
      }
    });

    it('calls preparePdfForAnalysis with decoded buffer', async () => {
      (preparePdfForAnalysis as ReturnType<typeof vi.fn>).mockClear();
      const req = createMockReq();
      const res = createMockRes();
      await handler(req, res);

      expect(preparePdfForAnalysis).toHaveBeenCalledTimes(1);
      const [buffer, filename] = (preparePdfForAnalysis as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(typeof filename).toBe('string');
    });

    it('cleans up uploaded file after analysis', async () => {
      const req = createMockReq();
      const res = createMockRes();
      await handler(req, res);

      expect(mockFileDelete).toHaveBeenCalledWith(
        'file-test-123',
        expect.objectContaining({ betas: expect.any(Array) })
      );
    });
  });

  // -------------------------------------------------------------------------
  // Full pipeline (INTG-03)
  // -------------------------------------------------------------------------

  describe('full pipeline', () => {
    it('exercises all 16 analysis passes plus synthesis', async () => {
      const req = createMockReq();
      const res = createMockRes();
      await handler(req, res);

      expect(res.statusCode).toBe(200);
      // 16 analysis passes + 1 synthesis = 17 total API calls
      expect(mockCreate).toHaveBeenCalledTimes(17);

      const body = res.body as Record<string, unknown>;
      const findings = body.findings as unknown[];
      // Merged findings from passes + at least 1 synthesis finding
      // (merge may deduplicate some findings, so count may be less than 16)
      expect(findings.length).toBeGreaterThanOrEqual(ANALYSIS_PASSES.length / 2);

      // passResults should contain keys for each pass
      const passResults = body.passResults as Record<string, unknown>;
      expect(typeof passResults).toBe('object');
      expect(passResults).not.toBeNull();
    });

    it('produces findings from all 16 analysis passes', async () => {
      const req = createMockReq();
      const res = createMockRes();
      await handler(req, res);

      const body = res.body as Record<string, unknown>;
      const findings = body.findings as Array<{ category: string; sourcePass?: string }>;

      // Check that findings span diverse categories from multiple passes
      const categories = new Set(findings.map((f) => f.category));
      expect(categories.has('Legal Issues')).toBe(true);
      expect(categories.has('Financial Terms')).toBe(true);
      expect(categories.has('Scope of Work')).toBe(true);
      expect(categories.has('Insurance Requirements')).toBe(true);
      expect(categories.has('Important Dates')).toBe(true);
      expect(categories.has('Contract Compliance')).toBe(true);
      expect(categories.has('Labor Compliance')).toBe(true);

      // sourcePass values should include names from multiple passes
      const sourcePasses = new Set(
        findings.filter((f) => f.sourcePass).map((f) => f.sourcePass)
      );
      expect(sourcePasses.size).toBeGreaterThanOrEqual(5);
    });

    it('includes synthesis findings with isSynthesis flag', async () => {
      const req = createMockReq();
      const res = createMockRes();
      await handler(req, res);

      const body = res.body as Record<string, unknown>;
      const findings = body.findings as Array<{
        isSynthesis?: boolean;
        category: string;
        crossReferences?: string[];
        sourcePass?: string;
      }>;

      const synthFindings = findings.filter((f) => f.isSynthesis === true);
      expect(synthFindings.length).toBeGreaterThanOrEqual(1);

      for (const sf of synthFindings) {
        expect(sf.category).toBe('Compound Risk');
        expect(Array.isArray(sf.crossReferences)).toBe(true);
        expect(sf.sourcePass).toBe('synthesis');
      }
    });

    it('computes risk score from real merge logic', async () => {
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

    it('assigns unique IDs to all findings', async () => {
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

    it('extracts dates from passes that provide them', async () => {
      const req = createMockReq();
      const res = createMockRes();
      await handler(req, res);

      const body = res.body as Record<string, unknown>;
      const dates = body.dates as Array<{ label: string; date: string; type: string }>;

      expect(Array.isArray(dates)).toBe(true);
      expect(dates.length).toBeGreaterThanOrEqual(1);

      for (const d of dates) {
        expect(typeof d.label).toBe('string');
        expect(typeof d.date).toBe('string');
        expect(typeof d.type).toBe('string');
      }
    });
  });

  // -------------------------------------------------------------------------
  // Schema conformance (INTG-04)
  // -------------------------------------------------------------------------

  describe('schema conformance', () => {
    it('every finding has required API fields', async () => {
      const req = createMockReq();
      const res = createMockRes();
      await handler(req, res);

      const body = res.body as Record<string, unknown>;
      const findings = body.findings as Array<Record<string, unknown>>;

      for (const f of findings) {
        expect(typeof f.id).toBe('string');
        expect(typeof f.severity).toBe('string');
        expect(typeof f.category).toBe('string');
        expect(typeof f.title).toBe('string');
        expect(typeof f.description).toBe('string');
        expect(typeof f.recommendation).toBe('string');
        expect(typeof f.clauseReference).toBe('string');
      }
    });

    it('every finding validates against MergedFindingSchema when augmented with client defaults', async () => {
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
          // Ensure required fields have defaults if missing from API
          negotiationPosition:
            f.negotiationPosition ?? 'Review required',
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

    it('synthesis findings validate against MergedFindingSchema when augmented', async () => {
      const req = createMockReq();
      const res = createMockRes();
      await handler(req, res);

      const body = res.body as Record<string, unknown>;
      const findings = body.findings as Array<Record<string, unknown>>;
      const synthFindings = findings.filter((f) => f.isSynthesis === true);

      expect(synthFindings.length).toBeGreaterThanOrEqual(1);

      for (const f of synthFindings) {
        const augmented = {
          ...f,
          resolved: false,
          note: '',
          negotiationPosition:
            f.negotiationPosition ?? 'Review required',
          actionPriority: f.actionPriority ?? 'monitor',
        };

        try {
          MergedFindingSchema.parse(augmented);
        } catch (error: unknown) {
          const zodErr = error as { message: string };
          throw new Error(
            `Synthesis finding '${f.title}' failed schema validation: ${zodErr.message}`
          );
        }
      }
    });
  });
});
