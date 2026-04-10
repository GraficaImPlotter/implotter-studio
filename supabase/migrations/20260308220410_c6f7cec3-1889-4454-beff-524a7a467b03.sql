ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS cost_production numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cost_supplier numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cost_material numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cost_art numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cost_extra numeric DEFAULT 0;