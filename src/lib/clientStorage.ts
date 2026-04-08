import { supabase } from './supabase';

const BUCKET = 'contract-pdfs';

/**
 * Upload a PDF file to Supabase Storage from the client.
 * Uses a temp path since the contract ID doesn't exist yet.
 * Returns the storage path for the server to use.
 */
export async function uploadPdfFromClient(
  file: File,
  userId: string,
  role: 'contract' | 'bid',
): Promise<string> {
  const path = `${userId}/uploads/${Date.now()}_${role}.pdf`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      contentType: 'application/pdf',
      upsert: true,
    });

  if (error) {
    throw new Error(`Failed to upload ${role} PDF: ${error.message}`);
  }

  return path;
}
