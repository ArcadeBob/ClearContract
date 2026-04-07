import type { Contract } from '../types/contract';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export interface AnalyzeOptions {
  keepCurrentContract?: boolean;
  removeBid?: boolean;
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1];
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export async function analyzeContract(
  file: File,
  accessToken: string,
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

  const body: Record<string, string | boolean> = {};
  if (options?.keepCurrentContract) {
    body.keepCurrentContract = true;
    body.pdfBase64 = 'AA=='; // Minimal valid base64; server uses Storage when keepCurrentContract=true
    body.fileName = file.name;
  } else {
    body.pdfBase64 = await readFileAsBase64(file);
    body.fileName = file.name;
  }
  if (contractId) {
    body.contractId = contractId;
  }
  if (bidFile) {
    body.bidPdfBase64 = await readFileAsBase64(bidFile);
    body.bidFileName = bidFile.name;
  }
  if (options?.removeBid) {
    body.removeBid = true;
  }

  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
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
