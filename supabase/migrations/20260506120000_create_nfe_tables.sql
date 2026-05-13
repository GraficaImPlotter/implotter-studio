-- ============================================================================
-- NF-e (Nota Fiscal Eletrônica) - Tabelas para emissão
-- ============================================================================

-- Tabela de configuração do emitente (dados da empresa)
CREATE TABLE IF NOT EXISTS public.nfe_config (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    razao_social text NOT NULL,
    nome_fantasia text,
    cnpj text NOT NULL UNIQUE,
    inscricao_estadual text NOT NULL,
    crt text DEFAULT '3' CHECK (crt IN ('1', '2', '3')),
    telefone text,
    endereco jsonb NOT NULL DEFAULT '{}'::jsonb,
    serie integer DEFAULT 1,
    proximo_numero integer DEFAULT 1,
    certificado_a1_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid REFERENCES auth.users(id),
    updated_by uuid REFERENCES auth.users(id)
);

-- Tabela de NF-e emitidas
CREATE TABLE IF NOT EXISTS public.nfe (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
    access_key text UNIQUE,
    numero integer NOT NULL,
    serie integer NOT NULL DEFAULT 1,
    status text DEFAULT 'gerada' CHECK (status IN ('gerada', 'assinada', 'enviada', 'autorizada', 'rejeitada', 'cancelada')),
    valor_total numeric(10,2) NOT NULL DEFAULT 0,
    xml_gerado text,
    xml_assinado text,
    protocolo text,
    data_autorizacao timestamp with time zone,
    cancel_reason text,
    canceled_at timestamp with time zone,
    sefaz_response jsonb,
    emitente_config jsonb,
    destinatario_data jsonb,
    itens_data jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- RLS (Row Level Security)
ALTER TABLE public.nfe_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfe ENABLE ROW LEVEL SECURITY;

-- Policies para nfe_config (apenas usuários autenticados podem acessar)
CREATE POLICY "Authenticated users can view nfe_config"
    ON public.nfe_config FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert nfe_config"
    ON public.nfe_config FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update nfe_config"
    ON public.nfe_config FOR UPDATE
    TO authenticated
    USING (true);

-- Policies para nfe
CREATE POLICY "Authenticated users can view nfe"
    ON public.nfe FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert nfe"
    ON public.nfe FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update nfe"
    ON public.nfe FOR UPDATE
    TO authenticated
    USING (true);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_nfe_status ON public.nfe(status);
CREATE INDEX IF NOT EXISTS idx_nfe_created_at ON public.nfe(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_nfe_order_id ON public.nfe(order_id);
CREATE INDEX IF NOT EXISTS idx_nfe_access_key ON public.nfe(access_key);

-- Trigger para updated_at em nfe
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_nfe_updated_at BEFORE UPDATE
    ON public.nfe FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_nfe_config_updated_at BEFORE UPDATE
    ON public.nfe_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comentários
COMMENT ON TABLE public.nfe_config IS 'Configurações do emitente para emissão de NF-e';
COMMENT ON TABLE public.nfe IS 'Registro de NF-e emitidas';
COMMENT ON COLUMN public.nfe.status IS 'Status: gerada, assinada, enviada, autorizada, rejeitada, cancelada';
COMMENT ON COLUMN public.nfe.xml_gerado IS 'XML da NF-e gerado (antes da assinatura)';
COMMENT ON COLUMN public.nfe.xml_assinado IS 'XML da NF-e já assinado digitalmente';
COMMENT ON COLUMN public.nfe.sefaz_response IS 'Resposta completa da SEFAZ em JSON';
