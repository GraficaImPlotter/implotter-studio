-- Fix: views with security_invoker=true can't read base tables after anon SELECT was revoked.
-- Change to security_invoker=false (definer mode) - safe because views already exclude sensitive columns.

ALTER VIEW public.products_public SET (security_invoker = false);
ALTER VIEW public.reviews_public SET (security_invoker = false);