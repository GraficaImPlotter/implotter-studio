-- Migration: Add encrypted password fields for certificate storage
-- Date: 2026-09-14
-- Note: Only runs if nfe_config table exists

DO $$
BEGIN
  -- Only add columns if table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'nfe_config') THEN
    -- Add columns for encrypted password storage
    ALTER TABLE public.nfe_config
    ADD COLUMN IF NOT EXISTS certificado_a1_password_iv TEXT,
    ADD COLUMN IF NOT EXISTS certificado_a1_password_auth_tag TEXT;

    -- Update comment to reflect encryption (if column exists)
    COMMENT ON COLUMN public.nfe_config.certificado_a1_password IS 'Encrypted certificate password (AES-256-GCM)';
    COMMENT ON COLUMN public.nfe_config.certificado_a1_password_iv IS 'Initialization vector for password encryption';
    COMMENT ON COLUMN public.nfe_config.certificado_a1_password_auth_tag IS 'Authentication tag for password encryption';
  END IF;
END $$;

SELECT 'Migration skipped or applied - nfe_config may not exist yet' as status;
