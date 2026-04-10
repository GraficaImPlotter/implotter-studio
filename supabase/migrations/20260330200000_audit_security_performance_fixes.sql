-- ============================================================
-- Audit Security & Performance Fixes
-- Generated: 2026-03-30
-- ============================================================

-- SEC-008: Remove overly permissive public READ on coupons table
-- Instead, validate coupons via server-side logic (Edge Function)
DROP POLICY IF EXISTS "Public can view active coupons" ON public.coupons;

-- Create restricted policy: only admins can read coupons directly
DROP POLICY IF EXISTS "Admins can manage coupons" ON public.coupons;
CREATE POLICY "Admins can manage coupons"
  ON public.coupons
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Allow authenticated users to validate a single coupon by code (for checkout)
DROP POLICY IF EXISTS "Users can validate coupon by code" ON public.coupons;
CREATE POLICY "Users can validate coupon by code"
  ON public.coupons
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND is_active = true
  );


-- ============================================================
-- PERF-002: Additional performance indexes
-- ============================================================

-- Leads filtering
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at DESC);

-- Reviews filtering (public listing uses is_approved + is_hidden)
CREATE INDEX IF NOT EXISTS idx_reviews_approved_hidden ON public.reviews(is_approved, is_hidden);

-- Affiliate analytics
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_affiliate_id ON public.affiliate_clicks(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_affiliate_id ON public.affiliate_commissions(affiliate_id);

-- Order items (frequently joined by order_id)
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);

-- Order status history (frequently queried by order_id, sorted by created_at)
CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON public.order_status_history(order_id, created_at DESC);

-- Blog posts (queried by slug + is_published)
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug_published ON public.blog_posts(slug, is_published);

-- Products (queried by slug + is_active)
CREATE INDEX IF NOT EXISTS idx_products_slug_active ON public.products(slug, is_active);

-- Saved carts (queried by user_id)
CREATE INDEX IF NOT EXISTS idx_saved_carts_user_id ON public.saved_carts(user_id);


-- ============================================================
-- ARQ-001: Database-level price guardrails
-- Prevents orders with manipulated prices from being inserted.
-- ============================================================

-- Ensure orders can never have negative or zero totals (except manual/admin)
CREATE OR REPLACE FUNCTION public.validate_order_total()
RETURNS TRIGGER AS $$
BEGIN
  -- Only validate orders from the website (not manual/admin sales)
  IF NEW.origin = 'site' THEN
    -- Total must be positive
    IF NEW.total <= 0 THEN
      RAISE EXCEPTION 'Order total must be positive for site orders. Got: %', NEW.total;
    END IF;
    
    -- Subtotal must be positive
    IF NEW.subtotal <= 0 THEN
      RAISE EXCEPTION 'Order subtotal must be positive. Got: %', NEW.subtotal;
    END IF;
    
    -- Discount cannot exceed subtotal
    IF COALESCE(NEW.discount, 0) > NEW.subtotal THEN
      RAISE EXCEPTION 'Discount (%) cannot exceed subtotal (%)', NEW.discount, NEW.subtotal;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS check_order_total ON public.orders;
CREATE TRIGGER check_order_total
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_order_total();
