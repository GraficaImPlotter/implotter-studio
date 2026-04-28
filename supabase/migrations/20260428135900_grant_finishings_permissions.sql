
-- Grant SELECT permissions on finishing tables for public access
GRANT SELECT ON public.finishings TO anon, authenticated;
GRANT SELECT ON public.product_finishings TO anon, authenticated;
GRANT SELECT ON public.faq_items TO anon, authenticated;

-- Ensure RLS is active and correct
ALTER TABLE public.finishings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view active finishings" ON public.finishings;
CREATE POLICY "Public can view active finishings" ON public.finishings FOR SELECT USING (is_active = true OR is_active IS NULL);

ALTER TABLE public.product_finishings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view product_finishings" ON public.product_finishings;
CREATE POLICY "Public can view product_finishings" ON public.product_finishings FOR SELECT USING (true);

ALTER TABLE public.faq_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view active faqs" ON public.faq_items;
CREATE POLICY "Public can view active faqs" ON public.faq_items FOR SELECT USING (is_active = true OR is_active IS NULL);
