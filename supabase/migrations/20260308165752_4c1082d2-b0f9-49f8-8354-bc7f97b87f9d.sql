
-- Add pix_receiver_name to the allowed public keys since PIX payment page needs it
DROP POLICY IF EXISTS "Public can view safe settings" ON public.site_settings;
CREATE POLICY "Public can view safe settings"
  ON public.site_settings FOR SELECT
  USING (key = ANY(ARRAY[
    'company_name', 'business_hours', 'phone', 'whatsapp', 'address',
    'instagram', 'facebook', 'pix_key', 'pix_city', 'pix_receiver_name',
    'min_order_value', 'free_shipping_value'
  ]));
