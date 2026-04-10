
-- Fix: Remove customer INSERT policy on order_status_history (audit trail should be admin-only writes)
DROP POLICY IF EXISTS "Customers can insert own order history" ON public.order_status_history;
