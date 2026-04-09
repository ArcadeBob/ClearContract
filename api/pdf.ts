import Anthropic from '@anthropic-ai/sdk';
import { toFile } from '@anthropic-ai/sdk';
import { extractText } from 'unpdf';

const BETAS = ['files-api-2025-04-14'];

/**
 * Upload a PDF to the Anthropic Files API, with fallback to text extraction
 * for problematic documents.
 */
export async function preparePdfForAnalysis(
  pdfBuffer: Buffer,
  fileName: string,
  client: Anthropic
): Promise<{ fileId: string; usedFallback: boolean }> {
  // Always try native PDF upload first (preserves formatting, tables, structure)
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

  // Fallback: extract text and upload as .txt
  console.log(`[pdf] Using text extraction fallback (${(pdfBuffer.length / 1024).toFixed(0)}KB)`);
  const extractStart = Date.now();
  const { text } = await extractText(new Uint8Array(pdfBuffer), {
    mergePages: true,
  });
  const textContent = Array.isArray(text) ? text.join('\n') : String(text);
  console.log(`[pdf] Text extraction took ${((Date.now() - extractStart) / 1000).toFixed(1)}s, ${textContent.length} chars`);

  if (textContent.trim().length < 100) {
    throw new Error(
      'Could not extract sufficient text from this PDF. It may be a scanned/image-based document.'
    );
  }

  const textBuffer = Buffer.from(textContent, 'utf-8');
  const textFileName = (fileName || 'contract').replace(/\.pdf$/i, '') + '.txt';

  const file = await client.beta.files.upload({
    file: await toFile(textBuffer, textFileName, { type: 'text/plain' }),
    betas: BETAS,
  });
  return { fileId: file.id, usedFallback: true };
}
