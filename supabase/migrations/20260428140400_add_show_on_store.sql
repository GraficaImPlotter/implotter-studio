
-- Add show_on_store column to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS show_on_store BOOLEAN DEFAULT true;

-- Update existing products to be shown on store by default
UPDATE public.products SET show_on_store = true WHERE show_on_store IS NULL;
