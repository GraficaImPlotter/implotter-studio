-- Policies for documents bucket
CREATE POLICY "Admins have full access to documents" 
ON storage.objects 
FOR ALL 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can upload their own order documents" 
ON storage.objects 
FOR INSERT 
TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = 'orders' AND
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE id::text = (storage.foldername(name))[2] 
    AND customer_id = auth.uid()
  )
);