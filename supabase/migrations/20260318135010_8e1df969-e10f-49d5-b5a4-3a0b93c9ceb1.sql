
-- Revoke direct anon SELECT on reviews table to prevent review_token exposure
-- Public reads should go through reviews_public view which excludes review_token
REVOKE SELECT ON public.reviews FROM anon;

-- Drop and recreate the public policy to only apply to authenticated users
DROP POLICY IF EXISTS "Public can view approved reviews" ON public.reviews;

CREATE POLICY "Authenticated can view approved reviews"
  ON public.reviews
  FOR SELECT
  TO authenticated
  USING (is_approved = true AND is_hidden = false);
