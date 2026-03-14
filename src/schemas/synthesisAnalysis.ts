import { z } from 'zod';

export const SynthesisFindingSchema = z.object({
  title: z.string().describe('Compound risk title, e.g., "Cash Flow Squeeze"'),
  description: z
    .string()
    .describe(
      'Executive-summary explanation of how the constituent findings interact to create amplified risk'
    ),
  recommendation: z
    .string()
    .describe(
      'Actionable recommendation for addressing the compound risk'
    ),
  constituentFindings: z
    .array(z.string())
    .describe(
      'Titles of the individual findings that combine to create this compound risk'
    ),
});

export const SynthesisPassResultSchema = z.object({
  findings: z
    .array(SynthesisFindingSchema)
    .describe(
      'Compound risk findings identified from cross-pass analysis. Return empty array if no compound risks detected.'
    ),
});

export type SynthesisPassResult = z.infer<typeof SynthesisPassResultSchema>;
