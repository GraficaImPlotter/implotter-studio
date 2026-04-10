-- Fix security definer view by using SECURITY INVOKER
DROP VIEW IF EXISTS public.loyalty_balances;
CREATE OR REPLACE VIEW public.loyalty_balances
WITH (security_invoker = true) AS
SELECT 
  user_id,
  SUM(CASE WHEN type = 'earn' THEN points ELSE -points END) AS balance
FROM public.loyalty_points
GROUP BY user_id;
