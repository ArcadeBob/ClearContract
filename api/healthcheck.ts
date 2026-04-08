import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const checks: Record<string, string> = {};

  const modules = [
    ['@supabase/supabase-js', '@supabase/supabase-js'],
    ['@anthropic-ai/sdk', '@anthropic-ai/sdk'],
    ['zod', 'zod'],
    ['zod-to-json-schema', 'zod-to-json-schema'],
    ['undici', 'undici'],
    ['../src/schemas/analysis', '../src/schemas/analysis'],
    ['../src/knowledge/types', '../src/knowledge/types'],
    ['../src/knowledge/index', '../src/knowledge/index'],
    ['../src/knowledge/registry', '../src/knowledge/registry'],
    ['../src/utils/bidSignal', '../src/utils/bidSignal'],
    ['../src/utils/errors', '../src/utils/errors'],
    ['../src/lib/mappers', '../src/lib/mappers'],
    ['../src/lib/supabaseStorage', '../src/lib/supabaseStorage'],
    ['../src/constants/limits', '../src/constants/limits'],
    ['../src/schemas/synthesisAnalysis', '../src/schemas/synthesisAnalysis'],
    ['./pdf', './pdf'],
    ['./merge', './merge'],
    ['./conflicts', './conflicts'],
    ['./passes', './passes'],
    ['./cost', './cost'],
    ['./rateLimit', './rateLimit'],
    ['./types', './types'],
  ];

  for (const [name, path] of modules) {
    try {
      await import(path);
      checks[name] = 'ok';
    } catch (e: unknown) {
      checks[name] = e instanceof Error ? e.message.slice(0, 150) : String(e);
    }
  }

  return res.status(200).json({ checks });
}
