
-- Remove anon direct access to products table (cost columns exposed)
DROP POLICY IF EXISTS "Public can view active products via anon" ON public.products;

REVOKE SELECT ON public.products FROM anon;

-- Grant anon SELECT on products_public view instead
GRANT SELECT ON public.products_public TO anon;
