import { loadCompanyProfile } from '../knowledge/profileLoader';
import { AnalysisResultSchema, type AnalysisResult } from '../schemas/analysisResult';

export type { AnalysisResult };

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
    throw new Error(
      `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 10MB.`
    );
  }

  if (file.type !== 'application/pdf') {
    throw new Error('Only PDF files are supported.');
  }

  const pdfBase64 = await readFileAsBase64(file);

  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      pdfBase64,
      fileName: file.name,
      companyProfile: loadCompanyProfile(),
    }),
  });

  if (!response.ok) {
    let errorMessage: string;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await response.json().catch(() => null);
      errorMessage = body?.error || `Analysis failed (HTTP ${response.status})`;
    } else {
      const text = await response.text().catch(() => '');
      errorMessage = text.includes('<!DOCTYPE')
        ? `Server returned HTML instead of JSON (HTTP ${response.status}). Is the API server running?`
        : `Analysis failed (HTTP ${response.status}): ${text.slice(0, 200)}`;
    }
    throw new Error(errorMessage);
  }

  const json = await response.json();
  const parsed = AnalysisResultSchema.safeParse(json);
  if (!parsed.success) {
    console.error('API response validation failed:', parsed.error.issues);
    throw new Error('Analysis returned invalid data. Please try again.');
  }
  return parsed.data;
}
