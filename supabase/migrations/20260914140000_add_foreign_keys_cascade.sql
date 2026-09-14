-- Migration: Add Foreign Keys with CASCADE for data integrity
-- Date: 2026-09-14
-- Note: Only creates FKs if columns/tables exist

DO $$
BEGIN
  -- Order items -> Orders (CASCADE delete)
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'order_id') THEN
    ALTER TABLE public.order_items
    ADD CONSTRAINT fk_order_items_orders
    FOREIGN KEY (order_id) REFERENCES public.orders(id)
    ON DELETE CASCADE;
  END IF;

  -- Order items -> Products
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'product_id') THEN
    ALTER TABLE public.order_items
    ADD CONSTRAINT fk_order_items_products
    FOREIGN KEY (product_id) REFERENCES public.products(id)
    ON DELETE SET NULL;
  END IF;

  -- Product images -> Products (CASCADE delete)
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'product_images' AND column_name = 'product_id') THEN
    ALTER TABLE public.product_images
    ADD CONSTRAINT fk_product_images_products
    FOREIGN KEY (product_id) REFERENCES public.products(id)
    ON DELETE CASCADE;
  END IF;

  -- Categories -> Catalog Nodes
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'catalog_node_id') THEN
    ALTER TABLE public.categories
    ADD CONSTRAINT fk_categories_catalog_nodes
    FOREIGN KEY (catalog_node_id) REFERENCES public.catalog_nodes(id)
    ON DELETE SET NULL;
  END IF;

  -- Reviews -> Products
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'product_id') THEN
    ALTER TABLE public.reviews
    ADD CONSTRAINT fk_reviews_products
    FOREIGN KEY (product_id) REFERENCES public.products(id)
    ON DELETE CASCADE;
  END IF;
END $$;

SELECT 'Foreign key migration completed (some may be skipped if columns dont exist)' as status;