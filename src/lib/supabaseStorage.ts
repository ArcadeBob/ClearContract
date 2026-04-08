import { SupabaseClient } from '@supabase/supabase-js';

const BUCKET = 'contract-pdfs';

/**
 * Build the storage path for a PDF.
 * Convention: {user_id}/{contract_id}/{role}.pdf
 * role is 'contract' or 'bid'
 */
export function storagePath(userId: string, contractId: string, role: 'contract' | 'bid'): string {
  return `${userId}/${contractId}/${role}.pdf`;
}

/**
 * Upload a PDF buffer to Supabase Storage.
 * Upserts (overwrites if exists) to handle re-analyze.
 */
export async function uploadPdf(
  supabase: SupabaseClient,
  userId: string,
  contractId: string,
  role: 'contract' | 'bid',
  pdfBuffer: Buffer
): Promise<void> {
  const path = storagePath(userId, contractId, role);
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    });
  if (error) {
    console.error(`[storage] Upload failed for ${path}: ${error.message}`);
    // Non-critical: analysis proceeds even if storage fails
    // The only impact is "keep current" won't be available on re-analyze
  }
}

/**
 * Download a PDF buffer from Supabase Storage.
 * Returns null if file doesn't exist (pre-v3.0 contracts).
 */
export async function downloadPdf(
  supabase: SupabaseClient,
  userId: string,
  contractId: string,
  role: 'contract' | 'bid'
): Promise<Buffer | null> {
  const path = storagePath(userId, contractId, role);
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .download(path);
  if (error || !data) {
    return null;
  }
  // data is a Blob; convert to Buffer
  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Delete all PDFs for a contract (contract + bid).
 * Called when contract is deleted.
 */
export async function deleteContractPdfs(
  supabase: SupabaseClient,
  userId: string,
  contractId: string
): Promise<void> {
  const paths = [
    storagePath(userId, contractId, 'contract'),
    storagePath(userId, contractId, 'bid'),
  ];
  const { error } = await supabase.storage
    .from(BUCKET)
    .remove(paths);
  if (error) {
    console.error(`[storage] Delete failed for contract ${contractId}: ${error.message}`);
  }
}

/**
 * Check if a PDF exists in storage.
 */
export async function pdfExists(
  supabase: SupabaseClient,
  userId: string,
  contractId: string,
  role: 'contract' | 'bid'
): Promise<boolean> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list(`${userId}/${contractId}`, { search: `${role}.pdf` });
  if (error || !data) return false;
  return data.some(f => f.name === `${role}.pdf`);
}
