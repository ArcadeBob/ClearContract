import type { Finding, ContractDate } from '../types/contract';

export interface AnalysisResult {
  client: string;
  contractType: 'Prime Contract' | 'Subcontract' | 'Purchase Order' | 'Change Order';
  riskScore: number;
  findings: Finding[];
  dates: ContractDate[];
  passResults: Array<{ passName: string; status: 'success' | 'failed'; error?: string }>;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      // Strip the data:...;base64, prefix
      const base64 = dataUrl.split(',')[1];
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export async function analyzeContract(file: File): Promise<AnalysisResult> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 10MB.`);
  }

  if (file.type !== 'application/pdf') {
    throw new Error('Only PDF files are supported.');
  }

  const pdfBase64 = await readFileAsBase64(file);

  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pdfBase64, fileName: file.name }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(body.error || `Analysis failed (HTTP ${response.status})`);
  }

  return response.json();
}
