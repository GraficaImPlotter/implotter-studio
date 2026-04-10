-- ============================================================
-- SQL DE AUDITORIA: Verifica quais tabelas estão SEM RLS
-- Execute no Supabase Dashboard → SQL Editor
-- Qualquer tabela que apareça aqui pode ser lida/modificada
-- por QUALQUER pessoa com a anon key!
-- ============================================================

SELECT 
  schemaname,
  tablename,
  CASE WHEN rowsecurity THEN '✅ RLS Ativo' ELSE '❌ SEM RLS!' END AS rls_status
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY rowsecurity ASC, tablename;

-- ============================================================
-- Se alguma tabela importante aparecer como "❌ SEM RLS!",
-- execute o seguinte para ativar (substitua NOME_DA_TABELA):
--
-- ALTER TABLE public.NOME_DA_TABELA ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.NOME_DA_TABELA FORCE ROW LEVEL SECURITY;
-- ============================================================
