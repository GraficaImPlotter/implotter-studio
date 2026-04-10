
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS product_code text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS color_mode text DEFAULT '4x0',
  ADD COLUMN IF NOT EXISTS default_quantity integer DEFAULT 1;
