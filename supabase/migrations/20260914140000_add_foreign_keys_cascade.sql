-- Migration: Add Foreign Keys with CASCADE for data integrity
-- Date: 2026-09-14

-- Enable foreign keys where missing
-- Note: Run this in Supabase SQL Editor

-- Order items -> Orders (CASCADE delete)
ALTER TABLE public.order_items
ADD CONSTRAINT fk_order_items_orders
FOREIGN KEY (order_id) REFERENCES public.orders(id)
ON DELETE CASCADE;

-- Order items -> Products
ALTER TABLE public.order_items
ADD CONSTRAINT fk_order_items_products
FOREIGN KEY (product_id) REFERENCES public.products(id)
ON DELETE SET NULL;

-- Product images -> Products (CASCADE delete)
ALTER TABLE public.product_images
ADD CONSTRAINT fk_product_images_products
FOREIGN KEY (product_id) REFERENCES public.products(id)
ON DELETE CASCADE;

-- Product finishings link -> Products
ALTER TABLE public.product_finishings
ADD CONSTRAINT fk_product_finishings_products
FOREIGN KEY (product_id) REFERENCES public.products(id)
ON DELETE CASCADE;

-- Product finishings link -> Finishings
ALTER TABLE public.product_finishings
ADD CONSTRAINT fk_product_finishings_finishings
FOREIGN KEY (finishing_id) REFERENCES public.finishings(id)
ON DELETE CASCADE;

-- FAQ items -> Products
ALTER TABLE public.faq_items
ADD CONSTRAINT fk_faq_items_products
FOREIGN KEY (product_id) REFERENCES public.products(id)
ON DELETE CASCADE;

-- Categories -> Catalog Nodes
ALTER TABLE public.categories
ADD CONSTRAINT fk_categories_catalog_nodes
FOREIGN KEY (catalog_node_id) REFERENCES public.catalog_nodes(id)
ON DELETE SET NULL;

-- Reviews -> Products
ALTER TABLE public.reviews
ADD CONSTRAINT fk_reviews_products
FOREIGN KEY (product_id) REFERENCES public.products(id)
ON DELETE CASCADE;

-- Reviews -> Users
ALTER TABLE public.reviews
ADD CONSTRAINT fk_reviews_users
FOREIGN KEY (user_id) REFERENCES public.users(id)
ON DELETE SET NULL;

-- Leads -> Users (referral)
ALTER TABLE public.leads
ADD CONSTRAINT fk_leads_users
FOREIGN KEY (referred_by_user_id) REFERENCES public.users(id)
ON DELETE SET NULL;

SELECT 'Foreign keys with CASCADE applied successfully!' as status;