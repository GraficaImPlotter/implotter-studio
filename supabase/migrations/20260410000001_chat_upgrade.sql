-- Migração para Upgrade do Chat: Arquivos e Limpeza
-- Data: 2026-04-10

-- 1. Adicionar colunas de mídia se não existirem
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'chat_messages' AND COLUMN_NAME = 'file_url') THEN
        ALTER TABLE public.chat_messages ADD COLUMN file_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'chat_messages' AND COLUMN_NAME = 'file_type') THEN
        ALTER TABLE public.chat_messages ADD COLUMN file_type TEXT;
    END IF;
END $$;

-- 2. Adicionar política para permitir que o usuário limpe seu próprio histórico (DELETE)
DROP POLICY IF EXISTS "Users can delete their own chat messages" ON public.chat_messages;
CREATE POLICY "Users can delete their own chat messages" 
    ON public.chat_messages 
    FOR DELETE 
    USING (auth.uid() = user_id);

-- 3. Configuração do Storage para Anexos do Chat
-- Nota: Isso tenta criar o bucket se as permissões do SQL Editor permitirem
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat-attachments', 'chat-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Políticas de Storage
-- Permitir que usuários autenticados façam upload
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
CREATE POLICY "Allow authenticated uploads" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'chat-attachments');

-- Permitir leitura pública dos anexos
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
CREATE POLICY "Allow public read access" 
ON storage.objects FOR SELECT 
TO public 
USING (bucket_id = 'chat-attachments');
