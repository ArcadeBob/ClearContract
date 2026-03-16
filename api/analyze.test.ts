// @vitest-environment node
import { describe, it, expect } from 'vitest';

describe('API test environment', () => {
  it('runs in node environment without jsdom globals', () => {
    expect(typeof globalThis.window).toBe('undefined');
    expect(typeof globalThis.document).toBe('undefined');
  });
});
