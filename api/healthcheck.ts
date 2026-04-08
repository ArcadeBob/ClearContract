import type { VercelRequest, VercelResponse } from '@vercel/node';

// npm packages only - no local imports
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import Anthropic from '@anthropic-ai/sdk';
import { fetch as undiciFetch, Agent } from 'undici';
import { randomUUID } from 'crypto';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.status(200).json({ status: 'npm imports ok' });
}
