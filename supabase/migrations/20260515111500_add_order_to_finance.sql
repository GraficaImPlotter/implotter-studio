-- Migration: Add Order association to Finance tables
-- Description: Adds order_id to incoming_invoices and expenses.

-- 1. Add order_id to incoming_invoices
ALTER TABLE public.incoming_invoices 
ADD COLUMN IF NOT EXISTS order_id UUID;

-- 2. Add order_id to expenses
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS order_id UUID;

-- 3. Add foreign key if possible (optional, depending if we use orders or sales_manual)
-- Since both exist, we'll keep it flexible as UUID for now without a strict FK if it can refer to both.
-- However, if we want to refer specifically to 'orders' table:
-- ALTER TABLE public.incoming_invoices ADD CONSTRAINT fk_invoice_order FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;
-- ALTER TABLE public.expenses ADD CONSTRAINT fk_expense_order FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;
