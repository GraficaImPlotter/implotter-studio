-- ============================================================
-- Fix Public Access (401 Errors for Guests)
-- ============================================================

-- Ensure the anon and authenticated roles can read the core shop tables
GRANT SELECT ON public.catalog_nodes TO anon, authenticated;
GRANT SELECT ON public.products TO anon, authenticated;
GRANT SELECT ON public.product_images TO anon, authenticated;
GRANT SELECT ON public.kits TO anon, authenticated;
GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT SELECT ON public.banners TO anon, authenticated;
GRANT SELECT ON public.hero_slides TO anon, authenticated;
GRANT SELECT ON public.products_public TO anon, authenticated;

-- Ensure RLS policies exist for anon users on catalog_nodes
DROP POLICY IF EXISTS "Public can view active catalog_nodes" ON public.catalog_nodes;
CREATE POLICY "Public can view active catalog_nodes" 
  ON public.catalog_nodes FOR SELECT 
  USING (is_active = true);

-- Ensure RLS policies exist for anon users on products
DROP POLICY IF EXISTS "Public can view active products" ON public.products;
CREATE POLICY "Public can view active products" 
  ON public.products FOR SELECT 
  USING (is_active = true);

-- Ensure RLS policies exist for anon users on product_images
DROP POLICY IF EXISTS "Public can view product_images" ON public.product_images;
CREATE POLICY "Public can view product_images" 
  ON public.product_images FOR SELECT 
  USING (true); -- Publicly viewable images linked to products

-- Ensure RLS policies exist for anon users on kits
DROP POLICY IF EXISTS "Public can view active kits" ON public.kits;
CREATE POLICY "Public can view active kits" 
  ON public.kits FOR SELECT 
  USING (is_active = true);

-- Ensure RLS policies exist for anon users on site_settings (specific ones)
DROP POLICY IF EXISTS "Public can view site_settings" ON public.site_settings;
CREATE POLICY "Public can view site_settings" 
  ON public.site_settings FOR SELECT 
  USING (true);

-- Ensure RLS policies exist for anon users on banners
DROP POLICY IF EXISTS "Public can view banners" ON public.banners;
CREATE POLICY "Public can view banners" 
  ON public.banners FOR SELECT 
  USING (is_active = true);
