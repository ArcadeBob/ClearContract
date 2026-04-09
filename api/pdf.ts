import Anthropic from '@anthropic-ai/sdk';
import { toFile } from '@anthropic-ai/sdk';
import { extractText } from 'unpdf';

const BETAS = ['files-api-2025-04-14'];
const PAGE_COUNT_THRESHOLD = 100;
// PDFs over 3MB are too slow via Files API (upload + model processing
// can exceed 270s timeout). Text extraction is much faster for large files.
const FILE_SIZE_THRESHOLD = 3 * 1024 * 1024; // 3MB
// Truncate extracted text to 100k chars to keep Claude's processing time
// within serverless timeout limits. 100k chars ≈ 25k tokens.
const MAX_TEXT_CHARS = 100_000;

/**
 * Upload a PDF to the Anthropic Files API, with fallback to text extraction
 * for large/problematic documents.
 */
export async function preparePdfForAnalysis(
  pdfBuffer: Buffer,
  fileName: string,
  client: Anthropic
): Promise<{ fileId: string; usedFallback: boolean }> {
  const pdfString = pdfBuffer.toString('latin1');
  const pageMatches = pdfString.match(/\/Type\s*\/Page[^s]/g);
  const estimatedPages = pageMatches ? pageMatches.length : 0;

  if (estimatedPages <= PAGE_COUNT_THRESHOLD && pdfBuffer.length <= FILE_SIZE_THRESHOLD) {
    try {
      const file = await client.beta.files.upload({
        file: await toFile(pdfBuffer, fileName || 'contract.pdf', {
          type: 'application/pdf',
        }),
        betas: BETAS,
      });
      return { fileId: file.id, usedFallback: false };
    } catch (uploadError) {
      console.error(
        'Native PDF upload failed, falling back to text extraction:',
        uploadError instanceof Error ? uploadError.message : uploadError
      );
    }
  }

  console.log(`[pdf] Using text extraction fallback (${(pdfBuffer.length / 1024).toFixed(0)}KB, ~${estimatedPages} pages)`);
  const extractStart = Date.now();
  const { text } = await extractText(new Uint8Array(pdfBuffer), {
    mergePages: true,
  });
  let textContent = Array.isArray(text) ? text.join('\n') : String(text);
  console.log(`[pdf] Text extraction took ${((Date.now() - extractStart) / 1000).toFixed(1)}s, ${textContent.length} chars`);

  if (textContent.trim().length < 100) {
    throw new Error(
      'Could not extract sufficient text from this PDF. It may be a scanned/image-based document.'
    );
  }

  // Truncate to prevent timeouts on very large documents
  if (textContent.length > MAX_TEXT_CHARS) {
    console.log(`[pdf] Truncating from ${textContent.length} to ${MAX_TEXT_CHARS} chars`);
    textContent = textContent.slice(0, MAX_TEXT_CHARS);
  }

  const textBuffer = Buffer.from(textContent, 'utf-8');
  const textFileName = (fileName || 'contract').replace(/\.pdf$/i, '') + '.txt';

  const file = await client.beta.files.upload({
    file: await toFile(textBuffer, textFileName, { type: 'text/plain' }),
    betas: BETAS,
  });
  return { fileId: file.id, usedFallback: true };
}
