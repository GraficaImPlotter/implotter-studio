-- Add show_on_home column to catalog_nodes
ALTER TABLE catalog_nodes ADD COLUMN IF NOT EXISTS show_on_home BOOLEAN DEFAULT false;

-- Create an index to optimize home page fetching
CREATE INDEX IF NOT EXISTS idx_catalog_nodes_show_on_home ON catalog_nodes (show_on_home) WHERE show_on_home = true;
