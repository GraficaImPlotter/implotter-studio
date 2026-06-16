-- =========================================================================
-- CORREÇÃO DE POLÍTICAS DE RLS PARA ACABAMENTOS (FINISHINGS & PRODUCT_FINISHINGS)
-- E OUTRAS TABELAS QUE USAM A FUNÇÃO ANTIGA HAS_ROLE()
-- =========================================================================
-- Instruções: Copie este script e execute no "SQL Editor" do seu painel Supabase.
-- Isso resolve o erro de recursão e bloqueio ao cadastrar, editar e excluir acabamentos.

-- 1. TABELA: public.finishings
DROP POLICY IF EXISTS "Admins can manage finishings" ON public.finishings;
CREATE POLICY "Admins can manage finishings" ON public.finishings 
FOR ALL USING (
  public.is_admin()
);

-- 2. TABELA: public.product_finishings
DROP POLICY IF EXISTS "Admins can manage product_finishings" ON public.product_finishings;
CREATE POLICY "Admins can manage product_finishings" ON public.product_finishings 
FOR ALL USING (
  public.is_admin()
);

-- 3. TABELA: public.faq_items
DROP POLICY IF EXISTS "Admins can manage faqs" ON public.faq_items;
CREATE POLICY "Admins can manage faqs" ON public.faq_items 
FOR ALL USING (
  public.is_admin()
);

-- 4. TABELA: public.product_images
DROP POLICY IF EXISTS "Admins can manage product images" ON public.product_images;
CREATE POLICY "Admins can manage product images" ON public.product_images 
FOR ALL USING (
  public.is_admin()
);

-- 5. TABELA: public.catalog_nodes
DROP POLICY IF EXISTS "Admins can manage catalog_nodes" ON public.catalog_nodes;
CREATE POLICY "Admins can manage catalog_nodes" ON public.catalog_nodes 
FOR ALL USING (
  public.is_admin()
);

-- 6. TABELA: public.banners
DROP POLICY IF EXISTS "Admins can manage banners" ON public.banners;
CREATE POLICY "Admins can manage banners" ON public.banners 
FOR ALL USING (
  public.is_admin()
);

-- 7. TABELA: public.seo_pages
DROP POLICY IF EXISTS "Admins can manage seo pages" ON public.seo_pages;
CREATE POLICY "Admins can manage seo pages" ON public.seo_pages 
FOR ALL USING (
  public.is_admin()
);

-- 8. TABELA: public.crm_notes
DROP POLICY IF EXISTS "Admins can manage crm notes" ON public.crm_notes;
CREATE POLICY "Admins can manage crm notes" ON public.crm_notes 
FOR ALL USING (
  public.is_admin()
);
