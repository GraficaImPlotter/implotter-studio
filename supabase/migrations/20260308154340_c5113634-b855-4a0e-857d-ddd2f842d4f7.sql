
CREATE TYPE public.quote_status AS ENUM ('rascunho', 'enviado', 'aceito', 'recusado', 'vencido');

CREATE SEQUENCE public.quotes_quote_number_seq START 1;

CREATE TABLE public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number integer NOT NULL DEFAULT nextval('public.quotes_quote_number_seq'),
  customer_id uuid,
  customer_name text NOT NULL,
  customer_email text,
  customer_phone text,
  status public.quote_status NOT NULL DEFAULT 'rascunho',
  subtotal numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  notes text,
  internal_notes text,
  valid_until date,
  sent_at timestamp with time zone,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage quotes" ON public.quotes FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  description text,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  subtotal numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage quote_items" ON public.quote_items FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_quotes_status ON public.quotes(status);
CREATE INDEX idx_quotes_customer ON public.quotes(customer_name);
CREATE INDEX idx_quote_items_quote ON public.quote_items(quote_id);
