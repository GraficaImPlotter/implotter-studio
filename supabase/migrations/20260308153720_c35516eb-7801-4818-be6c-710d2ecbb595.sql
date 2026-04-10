
-- Hierarchical catalog nodes table (tree structure)
CREATE TABLE public.catalog_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES public.catalog_nodes(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_catalog_nodes_parent ON public.catalog_nodes(parent_id);
CREATE INDEX idx_catalog_nodes_slug ON public.catalog_nodes(slug);

ALTER TABLE public.catalog_nodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage catalog_nodes" ON public.catalog_nodes FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Public can view active catalog_nodes" ON public.catalog_nodes FOR SELECT USING (is_active = true);

-- Add catalog_node_id to products (links product to a leaf node in the tree)
ALTER TABLE public.products ADD COLUMN catalog_node_id uuid REFERENCES public.catalog_nodes(id) ON DELETE SET NULL;
CREATE INDEX idx_products_catalog_node ON public.products(catalog_node_id);
