
-- Global finishings table
CREATE TABLE public.finishings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.finishings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage finishings" ON public.finishings FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Public can view active finishings" ON public.finishings FOR SELECT USING (is_active = true);

-- Link table: which finishings are available per product
CREATE TABLE public.product_finishings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  finishing_id uuid NOT NULL REFERENCES public.finishings(id) ON DELETE CASCADE,
  price_override numeric DEFAULT NULL,
  UNIQUE (product_id, finishing_id)
);

ALTER TABLE public.product_finishings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage product_finishings" ON public.product_finishings FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Public can view product_finishings" ON public.product_finishings FOR SELECT USING (true);
