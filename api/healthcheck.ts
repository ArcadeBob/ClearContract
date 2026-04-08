import type { VercelRequest, VercelResponse } from '@vercel/node';
import { MAX_FILE_SIZE } from '../src/constants/limits.js';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.status(200).json({ status: 'ok', maxSize: MAX_FILE_SIZE });
}
