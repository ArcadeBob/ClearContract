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

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

let originalApiKey: string | undefined;

beforeEach(() => {
  originalApiKey = process.env.ANTHROPIC_API_KEY;
  process.env.ANTHROPIC_API_KEY = 'test-api-key-123';
  mockCreate.mockReset();
  mockFileDelete.mockReset().mockResolvedValue({});

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
});
