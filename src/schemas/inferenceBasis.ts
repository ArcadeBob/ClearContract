import { z } from 'zod';

/**
 * Discriminator for inference-based finding provenance.
 *
 * - `'contract-quoted'`: Finding quotes exact contract text as basis.
 * - `'model-prior'`: Finding based on model general knowledge only — DROPPED at merge.
 * - `'knowledge-module:{id}'`: Finding grounded in a registered knowledge module.
 *   The `{id}` must match /^[a-z0-9-]+$/ (kebab-case). Clamped to Medium at merge.
 *
 * See .planning/phases/56-architecture-foundation/56-CONTEXT.md ARCH-02.
 */
export const InferenceBasisSchema = z.union([
  z.literal('contract-quoted'),
  z.literal('model-prior'),
  z.string().regex(/^knowledge-module:[a-z0-9-]+$/, {
    message: 'knowledge-module basis must match "knowledge-module:{id}" with id in kebab-case',
  }),
]);

export type InferenceBasis = z.infer<typeof InferenceBasisSchema>;
