
-- Add due_date and total_cost to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS total_cost DECIMAL(10,2) DEFAULT 0;

-- Update order_items to include unit_cost if not exists
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS unit_cost DECIMAL(10,2) DEFAULT 0;
