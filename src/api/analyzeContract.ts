import type { Contract } from '../types/contract';
import { MAX_FILE_SIZE } from '../constants/limits';
import { uploadPdfFromClient } from '../lib/clientStorage';

export interface AnalyzeOptions {
  keepCurrentContract?: boolean;
  removeBid?: boolean;
}

export async function analyzeContract(
  file: File,
  accessToken: string,
  userId: string,
  contractId?: string,
  bidFile?: File,
  options?: AnalyzeOptions,
): Promise<Contract> {
  if (!options?.keepCurrentContract) {
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(
        `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 10MB.`
      );
    }

    if (file.type !== 'application/pdf') {
      throw new Error('Only PDF files are supported.');
    }
  }

  // Build the request body — storage paths instead of base64
  const body: Record<string, string | boolean> = {
    fileName: file.name,
  };

  if (options?.keepCurrentContract) {
    body.keepCurrentContract = true;
  } else {
    // Upload PDF to Supabase Storage from client, send path to server
    body.storagePath = await uploadPdfFromClient(file, userId, 'contract');
  }

  if (contractId) {
    body.contractId = contractId;
  }

  if (bidFile) {
    body.bidStoragePath = await uploadPdfFromClient(bidFile, userId, 'bid');
    body.bidFileName = bidFile.name;
  }

  if (options?.removeBid) {
    body.removeBid = true;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 310_000);

  let response: Response;
  try {
    response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('Analysis timed out. The server may still be processing — check your contracts list shortly.');
    }
    throw err;
  }
  clearTimeout(timeoutId);

  if (!response.ok) {
    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('Retry-After') || '3600', 10);
      const minutes = Math.ceil(retryAfter / 60);
      const error = new Error(`Rate limit exceeded. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`);
      (error as Error & { retryAfterSeconds: number }).retryAfterSeconds = retryAfter;
      throw error;
    }

    let errorMessage: string;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const responseBody = await response.json().catch(() => null);
      errorMessage = responseBody?.error || `Analysis failed (HTTP ${response.status})`;
    } else {
      const text = await response.text().catch(() => '');
      errorMessage = text.includes('<!DOCTYPE')
        ? `Server returned HTML instead of JSON (HTTP ${response.status}). Is the API server running?`
        : `Analysis failed (HTTP ${response.status}): ${text.slice(0, 200)}`;
    }
    throw new Error(errorMessage);
  }

  const json = await response.json();
  return json as Contract;
}
