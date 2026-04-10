-- Performance Optimization Indexes for ImPlotter
-- Purpose: Speed up common queries in the storefront and admin panel

-- Products table indexes
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_catalog_node_id ON products(catalog_node_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active_is_featured ON products(is_active, is_featured);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);

-- Catalog Nodes (Categories/Structure)
CREATE INDEX IF NOT EXISTS idx_catalog_nodes_slug ON catalog_nodes(slug);
CREATE INDEX IF NOT EXISTS idx_catalog_nodes_parent_id ON catalog_nodes(parent_id);

-- Finishings (Used in calculation and product pages)
CREATE INDEX IF NOT EXISTS idx_finishings_is_active ON finishings(is_active);

-- Junction tables
CREATE INDEX IF NOT EXISTS idx_product_finishings_product_id ON product_finishings(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);

-- Orders (For admin performance)
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
