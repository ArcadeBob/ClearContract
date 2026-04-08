-- Create the contract-pdfs bucket as private
INSERT INTO storage.buckets (id, name, public)
VALUES ('contract-pdfs', 'contract-pdfs', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Users can upload their own PDFs (path: {user_id}/{contract_id}/{role}.pdf)
CREATE POLICY "Users can upload own PDFs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'contract-pdfs'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can read their own PDFs
CREATE POLICY "Users can read own PDFs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'contract-pdfs'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can update (upsert) their own PDFs
CREATE POLICY "Users can update own PDFs"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'contract-pdfs'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can delete their own PDFs
CREATE POLICY "Users can delete own PDFs"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'contract-pdfs'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
