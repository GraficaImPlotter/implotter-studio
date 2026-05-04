-- Add missing columns to orders if they do not exist
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS pix_receipt_url text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS invoice_url text;

-- Create documents bucket if it does not exist and ensure it is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Grant permissions for authenticated users on documents bucket
-- We use a single policy for simplicity if needed, or separate ones
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
CREATE POLICY "Authenticated users can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

DROP POLICY IF EXISTS "Authenticated users can view documents" ON storage.objects;
CREATE POLICY "Authenticated users can view documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'documents');

DROP POLICY IF EXISTS "Authenticated users can update documents" ON storage.objects;
CREATE POLICY "Authenticated users can update documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'documents');

DROP POLICY IF EXISTS "Authenticated users can delete documents" ON storage.objects;
CREATE POLICY "Authenticated users can delete documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'documents');
