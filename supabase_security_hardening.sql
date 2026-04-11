-- ==========================================
-- SCRIPT DE HARDENING DE SEGURANÇA - SUPABASE
-- GRÁFICA IMPLOTTER
-- ==========================================
-- Instruções: Copie este código e execute no SQL Editor do seu painel Supabase.

-- 1. Habilitar RLS em todas as tabelas críticas (caso não estejam)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- 2. POLÍTICA: SITE_SETTINGS (Proteção de Dados Sensíveis da Empresa)
-- Permite que qualquer pessoa leia configurações públicas.
-- Bloqueia dados sensíveis (CPF, CNPJ, Margem) para não-admins.
DROP POLICY IF EXISTS "Public can read site settings" ON public.site_settings;
CREATE POLICY "Public can read site settings" ON public.site_settings
FOR SELECT USING (
  key NOT IN ('cpf_responsavel', 'cnpj', 'profit_margin_default') 
  OR (
    auth.uid() IN (
      SELECT user_id FROM public.user_roles WHERE role = 'admin'
    )
  )
);

DROP POLICY IF EXISTS "Admins can manage site settings" ON public.site_settings;
CREATE POLICY "Admins can manage site settings" ON public.site_settings
FOR ALL USING (
  auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
);

-- 3. POLÍTICA: PEDIDOS (ORDERS)
-- Usuários autenticados veem apenas os SEUS pedidos.
-- Admins veem TUDO.
DROP POLICY IF EXISTS "Admins see all orders" ON public.orders;
CREATE POLICY "Admins see all orders" ON public.orders
FOR SELECT USING (
  auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
);

DROP POLICY IF EXISTS "Users see own orders" ON public.orders;
CREATE POLICY "Users see own orders" ON public.orders
FOR SELECT USING (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Anyone can insert orders" ON public.orders;
CREATE POLICY "Anyone can insert orders" ON public.orders 
FOR INSERT WITH CHECK (
  (customer_id IS NULL) OR (auth.uid() = customer_id)
);

-- 4. POLÍTICA: LEADS (DADOS DE CONTATO)
-- Apenas Administradores podem visualizar a lista de leads.
DROP POLICY IF EXISTS "Admins can view leads" ON public.leads;
CREATE POLICY "Admins can view leads" ON public.leads
FOR SELECT USING (
  auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
);

DROP POLICY IF EXISTS "Anyone can insert leads" ON public.leads;
CREATE POLICY "Anyone can insert leads" ON public.leads 
FOR INSERT WITH CHECK (name IS NOT NULL AND email IS NOT NULL);

-- 5. POLÍTICA: USER_ROLES (PROTEÇÃO CONTRA ESCALAÇÃO)
-- Usuários comuns não podem visualizar quem são os outros administradores.
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles 
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Only admins can manage roles" ON public.user_roles;
CREATE POLICY "Only admins can manage roles" ON public.user_roles
FOR ALL USING (
  auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
);

-- 6. POLÍTICA: PRODUTOS E CATEGORIAS
-- Qualquer um pode visualizar, mas só admin altera.
DROP POLICY IF EXISTS "Public can view products" ON public.products;
CREATE POLICY "Public can view products" ON public.products FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
CREATE POLICY "Admins can manage products" ON public.products
FOR ALL USING (
  auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
);

DROP POLICY IF EXISTS "Public can view categories" ON public.categories;
CREATE POLICY "Public can view categories" ON public.categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "Admins can manage categories" ON public.categories
FOR ALL USING (
  auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
);

-- 7. POLÍTICA: CUPONS E MARKETING
-- Apenas admins veem a lista e gerenciam.
DROP POLICY IF EXISTS "Admins can manage marketing" ON public.coupons;
CREATE POLICY "Admins can manage marketing" ON public.coupons
FOR ALL USING (
  auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
);

-- Permite que usuários validem cupons durante o checkout 
-- (Pode ser refinado se necessário)
DROP POLICY IF EXISTS "Anyone can validate coupon" ON public.coupons;
CREATE POLICY "Anyone can validate coupon" ON public.coupons FOR SELECT USING (is_active = true);

-- ==========================================
-- 8. CORREÇÕES DO SECURITY ADVISOR (SUPABASE)
-- ==========================================

-- A. Fix: Security Definer Views (Produtos e Reviews)
-- Alterando para SECURITY INVOKER para que respeitem o RLS de quem consulta.
ALTER VIEW IF EXISTS public.products_public SET (security_invoker = on);
ALTER VIEW IF EXISTS public.reviews_public SET (security_invoker = on);

-- B. Fix: Function Search Path (Proteção contra Hijacking)
-- Define um caminho de busca fixo para funções de trigger.
ALTER FUNCTION public.handle_updated_at() SET search_path = public;

-- C. Verificação de RLS em tabelas de sistema (opcional mas recomendado)
ALTER TABLE IF EXISTS public.user_roles FORCE ROW LEVEL SECURITY;
