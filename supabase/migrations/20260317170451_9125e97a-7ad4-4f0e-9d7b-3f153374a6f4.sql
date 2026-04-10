ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS shipping_weight numeric DEFAULT 0.3,
ADD COLUMN IF NOT EXISTS shipping_height numeric DEFAULT 2,
ADD COLUMN IF NOT EXISTS shipping_width numeric DEFAULT 11,
ADD COLUMN IF NOT EXISTS shipping_length numeric DEFAULT 16;