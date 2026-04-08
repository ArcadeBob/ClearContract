import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    // Test each import that api/analyze.ts uses
    const checks: Record<string, string> = {};

    try { require('@supabase/supabase-js'); checks['@supabase/supabase-js'] = 'ok'; } catch (e: any) { checks['@supabase/supabase-js'] = e.message; }
    try { require('@anthropic-ai/sdk'); checks['@anthropic-ai/sdk'] = 'ok'; } catch (e: any) { checks['@anthropic-ai/sdk'] = e.message; }
    try { require('zod'); checks['zod'] = 'ok'; } catch (e: any) { checks['zod'] = e.message; }
    try { require('zod-to-json-schema'); checks['zod-to-json-schema'] = 'ok'; } catch (e: any) { checks['zod-to-json-schema'] = e.message; }
    try { require('undici'); checks['undici'] = 'ok'; } catch (e: any) { checks['undici'] = e.message; }

    return res.status(200).json({ status: 'ok', checks });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
}
