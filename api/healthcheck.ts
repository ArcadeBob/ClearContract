import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.status(200).json({ status: 'ok', hasZod: typeof z !== 'undefined' });
}
