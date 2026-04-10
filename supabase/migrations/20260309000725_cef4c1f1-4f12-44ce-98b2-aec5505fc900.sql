CREATE POLICY "Users can view their own order documents" 
ON storage.objects 
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = 'orders' AND
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE id::text = (storage.foldername(name))[2] 
    AND customer_id = auth.uid()
  )
);