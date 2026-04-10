-- Loyalty points system
CREATE TABLE public.loyalty_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points integer NOT NULL DEFAULT 0,
  type text NOT NULL DEFAULT 'earn', -- earn, redeem, expire
  description text,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own points" ON public.loyalty_points
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage points" ON public.loyalty_points
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow system inserts (for earning points on order completion)
CREATE POLICY "System can insert points" ON public.loyalty_points
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND type = 'earn');

-- Loyalty balance view for quick lookups
CREATE OR REPLACE VIEW public.loyalty_balances AS
SELECT 
  user_id,
  SUM(CASE WHEN type = 'earn' THEN points ELSE -points END) AS balance
FROM public.loyalty_points
GROUP BY user_id;
