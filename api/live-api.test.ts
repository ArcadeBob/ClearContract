// @vitest-environment node
/**
 * Live API test -- validates real API response shape against Zod schemas.
 * Run manually: npm run test:live
 * NEVER run in CI -- requires ANTHROPIC_API_KEY and costs real API credits.
 *
 * Set TEST_PDF_PATH env var to point to a PDF file, or the test uses
 * a minimal inline base64 PDF.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { MergedFindingSchema } from '../src/schemas/finding.js';

// Minimal valid PDF (1 page, ~200 bytes) for fallback when TEST_PDF_PATH not set
const MINIMAL_PDF_BASE64 = Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n206\n%%EOF'
).toString('base64');

let pdfBase64: string;

describe('live API test', { timeout: 120_000 }, () => {
  beforeAll(() => {
    // Validate API key is available
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error(
        'ANTHROPIC_API_KEY must be set to run live API tests. ' +
          'Run: ANTHROPIC_API_KEY=sk-... npm run test:live'
      );
    }

    // Load PDF from TEST_PDF_PATH or use minimal fallback
    const pdfPath = process.env.TEST_PDF_PATH;
    if (pdfPath) {
      pdfBase64 = readFileSync(pdfPath).toString('base64');
    } else {
      pdfBase64 = MINIMAL_PDF_BASE64;
    }
  });

  it('handler returns 200 with valid response structure', async () => {
    // Dynamic import to avoid module-level side effects
    const { default: handler } = await import('./analyze.js');
    const { createMockReq, createMockRes } = await import(
      './test-fixtures/pass-responses.js'
    );

    const req = createMockReq({ body: { pdfBase64 } });
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);

    const body = res.body as Record<string, unknown>;
    expect(body).toHaveProperty('client');
    expect(body).toHaveProperty('contractType');
    expect(body).toHaveProperty('riskScore');
    expect(body).toHaveProperty('findings');
    expect(body).toHaveProperty('dates');

    expect(typeof body.client).toBe('string');
    expect(typeof body.contractType).toBe('string');
    expect(typeof body.riskScore).toBe('number');
    expect(body.riskScore as number).toBeGreaterThanOrEqual(0);
    expect(body.riskScore as number).toBeLessThanOrEqual(100);
    expect(Array.isArray(body.findings)).toBe(true);
    expect(Array.isArray(body.dates)).toBe(true);
  });

  it('every finding validates against MergedFindingSchema', async () => {
    const { default: handler } = await import('./analyze.js');
    const { createMockReq, createMockRes } = await import(
      './test-fixtures/pass-responses.js'
    );

    const req = createMockReq({ body: { pdfBase64 } });
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);

    const body = res.body as Record<string, unknown>;
    const findings = body.findings as Array<Record<string, unknown>>;

    expect(findings.length).toBeGreaterThan(0);

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
      } catch (error: unknown) {
        const zodErr = error as { message: string };
        throw new Error(
          `Finding '${f.title}' failed schema validation: ${zodErr.message}`
        );
      }
    }
  });
});
