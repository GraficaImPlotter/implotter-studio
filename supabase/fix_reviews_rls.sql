
-- Check if the reviews_public view exists, if not create it
-- This view should only show approved reviews to the public
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_views WHERE viewname = 'reviews_public') THEN
        CREATE VIEW public.reviews_public AS
        SELECT id, product_id, customer_name, rating, comment, created_at, is_approved
        FROM public.reviews
        WHERE is_approved = true;
    END IF;
END $$;

-- Enable RLS on reviews table if not enabled
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to read approved reviews
CREATE POLICY "Allow public read of approved reviews" ON public.reviews
    FOR SELECT
    USING (is_approved = true);

-- If using a view, ensure permissions are granted
GRANT SELECT ON public.reviews_public TO anon;
GRANT SELECT ON public.reviews_public TO authenticated;

-- Ensure the original table also has proper permissions for the view to work
GRANT SELECT (id, product_id, customer_name, rating, comment, created_at, is_approved) 
ON public.reviews TO anon;

GRANT SELECT (id, product_id, customer_name, rating, comment, created_at, is_approved) 
ON public.reviews TO authenticated;

COMMENT ON VIEW public.reviews_public IS 'Publicly accessible approved reviews for the storefront.';
