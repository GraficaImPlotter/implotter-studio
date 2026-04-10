
-- Hero slides table for printer carousel
CREATE TABLE public.hero_slides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  subtitle text,
  media_url text NOT NULL,
  media_type text NOT NULL DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
  link_url text,
  link_text text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.hero_slides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage hero slides" ON public.hero_slides FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Public can view active hero slides" ON public.hero_slides FOR SELECT USING (is_active = true);

-- Storage bucket for hero media
INSERT INTO storage.buckets (id, name, public) VALUES ('hero-media', 'hero-media', true);

CREATE POLICY "Admins can upload hero media" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'hero-media' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update hero media" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'hero-media' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete hero media" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'hero-media' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Public can view hero media" ON storage.objects FOR SELECT USING (bucket_id = 'hero-media');
