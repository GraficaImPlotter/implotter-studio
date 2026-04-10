
-- Fix the security definer view issue by using security_invoker
DROP VIEW IF EXISTS public.products_public;

CREATE OR REPLACE VIEW public.products_public 
WITH (security_invoker = true) AS
SELECT
  id, name, slug, short_description, full_description, specifications,
  price, sale_price, pricing_type, sale_unit, price_per_sqm,
  min_width, max_width, min_height, max_height, min_area, max_area,
  catalog_node_id, category_id, subcategory_id,
  is_active, is_featured, estimated_days, video_url, keywords,
  meta_title, meta_description, product_code, color_mode, default_quantity,
  sort_order, created_at, updated_at
FROM public.products
WHERE is_active = true;

GRANT SELECT ON public.products_public TO anon, authenticated;
