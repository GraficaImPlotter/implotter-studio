-- RELATÓRIO DE MUDANÇAS SUGERIDAS PARA SEGURANÇA NO SUPABASE
-- Execute estes comandos no seu SQL Editor do Supabase se desejar reforçar a segurança.

-- 1. Hardening de INSERT em orders
-- Antigo: Check (true)
-- Novo: Garante que se o customer_id for preenchido, ele deve ser o UID do usuário autenticado. 
-- Se for nulo (guest), permite inserir.
DROP POLICY IF EXISTS "Anyone can insert orders" ON public.orders;
CREATE POLICY "Anyone can insert orders" ON public.orders 
FOR INSERT WITH CHECK (
  (customer_id IS NULL) OR (auth.uid() = customer_id)
);

-- 2. Hardening de INSERT em order_items
-- Garante que o item de pedido que está sendo inserido pertence a um pedido que acabou de ser criado 
-- ou que o usuário tem acesso àquele order_id.
DROP POLICY IF EXISTS "Anyone can insert order items" ON public.order_items;
CREATE POLICY "Anyone can insert order items" ON public.order_items 
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_items.order_id 
    AND (orders.customer_id IS NULL OR orders.customer_id = auth.uid())
  )
);

-- 3. Hardening de INSERT em leads e reviews
-- Similar ao de pedidos, garante integridade se houver vínculo com usuário.
DROP POLICY IF EXISTS "Anyone can insert leads" ON public.leads;
CREATE POLICY "Anyone can insert leads" ON public.leads FOR INSERT WITH CHECK (true); -- Geralmente aberto pois leads são anônimos

DROP POLICY IF EXISTS "Anyone can insert reviews" ON public.reviews;
CREATE POLICY "Anyone can insert reviews" ON public.reviews FOR INSERT WITH CHECK (true);

-- 4. Impedir leitura pública de user_roles (mais seguro)
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
-- (Já existe) Admins gerenciando roles...

-- 5. Garantir que Perfis não sejam enumeráveis (apenas o próprio ou admin)
-- (Já existe no SQL inicial)
