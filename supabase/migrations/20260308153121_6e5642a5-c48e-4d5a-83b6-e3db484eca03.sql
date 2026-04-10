
-- Subcategories table
CREATE TABLE public.subcategories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage subcategories" ON public.subcategories FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Public can view active subcategories" ON public.subcategories FOR SELECT USING (is_active = true);

-- Junction: category <-> subcategory (many-to-many)
CREATE TABLE public.category_subcategories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  subcategory_id uuid NOT NULL REFERENCES public.subcategories(id) ON DELETE CASCADE,
  UNIQUE(category_id, subcategory_id)
);

ALTER TABLE public.category_subcategories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage category_subcategories" ON public.category_subcategories FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Public can view category_subcategories" ON public.category_subcategories FOR SELECT USING (true);

-- Pricing type enum
CREATE TYPE public.pricing_type AS ENUM ('fixed', 'per_sqm');

-- Sale unit enum
CREATE TYPE public.sale_unit AS ENUM ('unit', 'pack', 'sqm');

-- Add new columns to products
ALTER TABLE public.products
  ADD COLUMN subcategory_id uuid REFERENCES public.subcategories(id) ON DELETE SET NULL,
  ADD COLUMN pricing_type public.pricing_type NOT NULL DEFAULT 'fixed',
  ADD COLUMN sale_unit public.sale_unit NOT NULL DEFAULT 'unit',
  ADD COLUMN price_per_sqm numeric DEFAULT 0,
  ADD COLUMN min_width numeric,
  ADD COLUMN max_width numeric,
  ADD COLUMN min_height numeric,
  ADD COLUMN max_height numeric,
  ADD COLUMN min_area numeric,
  ADD COLUMN max_area numeric;

-- Add dimension fields to order_items for per-sqm products
ALTER TABLE public.order_items
  ADD COLUMN item_width numeric,
  ADD COLUMN item_height numeric,
  ADD COLUMN item_area numeric,
  ADD COLUMN price_per_sqm numeric,
  ADD COLUMN pricing_type text;
