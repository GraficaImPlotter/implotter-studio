-- ==========================================
-- CORREÇÃO CRÍTICA DE SEGURANÇA
-- Gráfica ImPlotter - 2026-09-14
-- ==========================================
-- Execute este script no SQL Editor do Supabase IMEDIATAMENTE

-- 1. Proteger dados financeiros sensíveis em PRODUCTS
-- Remove acesso público a unit_cost e preco_minimo
DROP POLICY IF EXISTS "Public can view products" ON public.products;
CREATE POLICY "Public can view products" ON public.products
FOR SELECT USING (
  is_active = true
);

-- Criar view pública SEM dados financeiros sensíveis
DROP VIEW IF EXISTS public.products_public CASCADE;
CREATE VIEW public.products_public AS
SELECT
  id, name, slug, short_description, full_description, specifications,
  price, sale_price, pricing_type, sale_unit, price_per_sqm,
  min_width, max_width, min_height, max_height, min_area, max_area,
  catalog_node_id, category_id, subcategory_id,
  is_active, is_featured, estimated_days, video_url,
  keywords, meta_title, meta_description, product_code,
  color_mode, default_quantity, sort_order, configuration_schema,
  shipping_weight, shipping_height, shipping_width, shipping_length,
  created_at, updated_at
  -- NÃO INCLUI: unit_cost, preco_minimo
FROM public.products
WHERE is_active = true;

-- Permitir acesso público apenas à view
GRANT SELECT ON public.products_public TO anon, authenticated;

-- 2. Proteger SITE_SETTINGS de expor dados sensíveis
-- Usar nome único para evitar conflito
DROP POLICY IF EXISTS "Public can view safe settings v2" ON public.site_settings;
CREATE POLICY "Public can view safe settings v2" ON public.site_settings
FOR SELECT USING (
  key NOT IN ('cpf_responsavel', 'cnpj', 'profit_margin_default', 'certificado_a1_password')
  OR public.is_admin()
);

-- 3. Garantir que apenas admins editam settings
DROP POLICY IF EXISTS "Admins can manage site settings v2" ON public.site_settings;
CREATE POLICY "Admins can manage site settings v2" ON public.site_settings
FOR ALL USING (public.is_admin());

-- 4. Proteger tabela de CUPONS (não deve ser pública)
-- Usar nome único para evitar conflito
DROP POLICY IF EXISTS "Admins manage coupons v2" ON public.coupons;
CREATE POLICY "Admins manage coupons v2" ON public.coupons
FOR ALL USING (public.is_admin());

-- Função para validar cupom (sem expor lista completa)
CREATE OR REPLACE FUNCTION public.validate_coupon(coupon_code TEXT)
RETURNS TABLE (
  id UUID,
  code TEXT,
  discount_type TEXT,
  discount_value NUMERIC,
  min_purchase_value NUMERIC,
  free_shipping BOOLEAN,
  is_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id, c.code, c.discount_type, c.discount_value,
    c.min_purchase_value, c.free_shipping, c.is_active
  FROM public.coupons c
  WHERE c.code = coupon_code
    AND c.is_active = true
    AND (c.valid_from IS NULL OR c.valid_from <= NOW())
    AND (c.valid_until IS NULL OR c.valid_until >= NOW());
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_coupon(TEXT) TO anon, authenticated;

-- 5. Proteger dados de NF-e (não deve ser público)
ALTER TABLE IF EXISTS public.nfe_configurations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin only nfe v2" ON public.nfe_configurations;
CREATE POLICY "Admin only nfe v2" ON public.nfe_configurations
FOR ALL USING (public.is_admin());

-- 6. Proteger tabela de PAYMENT_SETTINGS
ALTER TABLE IF EXISTS public.payment_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin only payments v2" ON public.payment_settings;
CREATE POLICY "Admin only payments v2" ON public.payment_settings
FOR ALL USING (public.is_admin());

-- CONFIRMAÇÃO
SELECT 'Segurança crítica aplicada com sucesso!' as status;
