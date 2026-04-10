-- Migração para Chat Humano via Telegram
-- Data: 2026-04-10

CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('client', 'admin')),
    content TEXT NOT NULL,
    telegram_message_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
-- O usuário pode ver apenas suas próprias mensagens
CREATE POLICY "Users can view their own chat messages" 
    ON public.chat_messages 
    FOR SELECT 
    USING (auth.uid() = user_id);

-- O usuário pode inserir suas próprias mensagens (como 'client')
CREATE POLICY "Users can insert their own chat messages" 
    ON public.chat_messages 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id AND sender_type = 'client');

-- O Admin (ou o sistema via service_role) pode gerenciar todas
-- Nota: O backend usará a service_role/private key para inserir respostas do admin

-- Habilitar Realtime para esta tabela
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON public.chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at);
