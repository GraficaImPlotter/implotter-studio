
-- Adicionar coluna markup na tabela categorias
ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS markup numeric DEFAULT 2.0;

-- Adicionar colunas na tabela produtos
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS unit_cost numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS preco_minimo numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS tipo_calculo text DEFAULT 'unitario';

-- Migrar custos existentes
UPDATE public.products 
SET unit_cost = 
  COALESCE(cost_production, 0) + 
  COALESCE(cost_supplier, 0) + 
  COALESCE(cost_material, 0) + 
  COALESCE(cost_art, 0) + 
  COALESCE(cost_extra, 0)
WHERE unit_cost = 0;

-- Comentários para ajudar no futuro
COMMENT ON COLUMN public.categories.markup IS 'Fator multiplicador para o preço de venda';
COMMENT ON COLUMN public.products.unit_cost IS 'Custo unitário base do produto';
COMMENT ON COLUMN public.products.preco_minimo IS 'Menor preço arredondado considerando todas as variações';
COMMENT ON COLUMN public.products.tipo_calculo IS 'Pode ser: unitario ou area';
