import { describe, it, expect } from 'vitest';
import {
  estimateTokens,
  validateTokenBudget,
  TOKEN_CAP_PER_MODULE,
  MAX_MODULES_PER_PASS,
} from '../tokenBudget';
import type { KnowledgeModule } from '../types';

function makeMockModule(overrides: Partial<KnowledgeModule> = {}): KnowledgeModule {
  const content = overrides.content ?? 'x'.repeat(100);
  return {
    id: 'test-mod',
    domain: 'regulatory',
    title: 'Test Module',
    effectiveDate: '2024-01-01',
    reviewByDate: '2025-01-01',
    expirationDate: '2025-01-01',
    content,
    tokenEstimate: Math.ceil(content.length / 4),
    ...overrides,
  };
}

describe('estimateTokens', () => {
  it('returns 1 for 4 characters', () => {
    expect(estimateTokens('1234')).toBe(1);
  });

  it('returns 2 for 5 characters (rounds up)', () => {
    expect(estimateTokens('12345')).toBe(2);
  });

  it('returns 0 for empty string', () => {
    expect(estimateTokens('')).toBe(0);
  });
});

describe('validateTokenBudget', () => {
  it('does not throw for valid modules', () => {
    const mod = makeMockModule();
    expect(() => validateTokenBudget([mod])).not.toThrow();
  });

  it('throws when a module exceeds token cap', () => {
    const mod = makeMockModule({
      content: 'x'.repeat(TOKEN_CAP_PER_MODULE * 4 + 4),
    });
    expect(() => validateTokenBudget([mod])).toThrow('exceeds token cap');
  });

  it('throws when too many modules are passed', () => {
    const modules = Array.from({ length: MAX_MODULES_PER_PASS + 1 }, (_, i) =>
      makeMockModule({ id: `test-mod-${i}` })
    );
    expect(() => validateTokenBudget(modules)).toThrow(
      `max is ${MAX_MODULES_PER_PASS}`
    );
  });
});
