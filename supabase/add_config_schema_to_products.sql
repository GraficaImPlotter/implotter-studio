-- Add configuration_schema column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS configuration_schema JSONB DEFAULT '[]'::jsonb;

-- Add helper comment about the schema structure
COMMENT ON COLUMN products.configuration_schema IS 'Stores dynamic attribute structure: [{"id": "uuid", "label": "Material", "type": "select", "options": [{"name": "Couchê", "price_adj": 0}]}, {"id": "uuid", "label": "Ilhós", "type": "counter", "unit_price": 0.50}]';
