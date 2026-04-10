-- ============================================================
-- FINAL PUBLIC PERMISSIONS FIX (SHOP & SEARCH)
-- ============================================================

-- Ensure the anon and authenticated roles have explicit access to all public shop tables
GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT ON public.catalog_nodes TO anon, authenticated;
GRANT SELECT ON public.products TO anon, authenticated;
GRANT SELECT ON public.product_images TO anon, authenticated;
GRANT SELECT ON public.kits TO anon, authenticated;
GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT SELECT ON public.banners TO anon, authenticated;
GRANT SELECT ON public.hero_slides TO anon, authenticated;
GRANT SELECT ON public.products_public TO anon, authenticated;

-- Force RLS policies to be as permissive as possible for SELECT on these tables
ALTER TABLE public.catalog_nodes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public select catalog_nodes" ON public.catalog_nodes;
CREATE POLICY "Public select catalog_nodes" ON public.catalog_nodes FOR SELECT USING (is_active = true OR is_active IS NULL);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public select products" ON public.products;
CREATE POLICY "Public select products" ON public.products FOR SELECT USING (is_active = true OR is_active IS NULL);

ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public select product_images" ON public.product_images;
CREATE POLICY "Public select product_images" ON public.product_images FOR SELECT USING (true);

ALTER TABLE public.kits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public select kits" ON public.kits;
CREATE POLICY "Public select kits" ON public.kits FOR SELECT USING (is_active = true OR is_active IS NULL);

-- Final check on the view owner (sometimes needed for security_invoker = false views)
-- ALTER VIEW public.products_public OWNER TO postgres;
