DROP POLICY IF EXISTS "Public can view safe settings" ON public.site_settings;

CREATE POLICY "Public can view safe settings" ON public.site_settings
FOR SELECT
USING (
  key = ANY (ARRAY[
    'company_name', 'business_hours', 'phone', 'whatsapp', 'address', 
    'instagram', 'facebook', 'pix_key', 'pix_city', 'pix_receiver_name', 
    'min_order_value', 'free_shipping_value', 'profit_margin_default',
    'hero_badge_text', 'hero_title', 'hero_subtitle',
    'hero_button_text', 'hero_button_link', 'hero_button2_text', 'hero_button2_link',
    'hero_stat_1_value', 'hero_stat_1_label',
    'hero_stat_2_value', 'hero_stat_2_label',
    'hero_stat_3_value', 'hero_stat_3_label'
  ]::text[])
);