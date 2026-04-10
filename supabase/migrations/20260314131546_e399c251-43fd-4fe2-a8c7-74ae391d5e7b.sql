ALTER TABLE public.hero_slides 
  ADD COLUMN starts_at timestamp with time zone DEFAULT NULL,
  ADD COLUMN ends_at timestamp with time zone DEFAULT NULL;