
-- Social proof messages table (admin-managed)
CREATE TABLE public.social_proof_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  city text,
  message text NOT NULL DEFAULT 'acabou de fazer um pedido',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.social_proof_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage social proof" ON public.social_proof_messages FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Public can view active social proof" ON public.social_proof_messages FOR SELECT USING (is_active = true);

-- Melhor Envio OAuth tokens table
CREATE TABLE public.melhor_envio_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.melhor_envio_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can manage tokens" ON public.melhor_envio_tokens FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Add tracking_code to orders for Melhor Envio tracking
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_code text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_service text;
