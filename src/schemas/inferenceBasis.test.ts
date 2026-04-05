import { describe, it, expect } from 'vitest';
import { InferenceBasisSchema } from './inferenceBasis';

describe('InferenceBasisSchema', () => {
  describe('accepts valid values', () => {
    it.each([
      'contract-quoted',
      'model-prior',
      'knowledge-module:ca-title24',
      'knowledge-module:div08-scope',
      'knowledge-module:aama-submittal-standards-2024',
    ])('accepts %s', (input) => {
      expect(InferenceBasisSchema.safeParse(input).success).toBe(true);
    });
  });

  describe('rejects invalid values', () => {
    it.each([
      ['empty knowledge-module id', 'knowledge-module:'],
      ['uppercase id', 'knowledge-module:FOO_BAR'],
      ['spaces in id', 'knowledge-module:has spaces'],
      ['arbitrary string', 'random-string'],
      ['empty string', ''],
    ])('rejects %s (%s)', (_label, input) => {
      expect(InferenceBasisSchema.safeParse(input).success).toBe(false);
    });

    it.each([
      ['undefined', undefined],
      ['null', null],
      ['number', 123],
      ['object', {}],
    ] as const)('rejects %s', (_label, input) => {
      expect(InferenceBasisSchema.safeParse(input).success).toBe(false);
    });
  });
});
