-- Fix: Replace open INSERT policy on order_items with scoped one
DROP POLICY IF EXISTS "Anyone can insert order items" ON public.order_items;
DROP POLICY IF EXISTS "Customers can insert own order items" ON public.order_items;

CREATE POLICY "Customers can insert own order items" ON public.order_items
FOR INSERT TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_items.order_id
      AND (orders.customer_id = auth.uid() OR orders.customer_id IS NULL)
  )
);