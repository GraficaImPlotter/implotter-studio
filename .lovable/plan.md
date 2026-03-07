

## Plano de Implementação — Gráfica ImPlotter

Este é um projeto grande. Vou implementar tudo de uma vez, criando ~25 arquivos novos.

---

### Arquivos a Criar

**Dados e Configuração**
- `src/data/mockData.ts` — Categorias, produtos, pedidos, clientes mock (dados de gráfica)
- `src/contexts/AuthContext.tsx` — Context de autenticação simulado (visitante/cliente/admin)
- `src/contexts/CartContext.tsx` — Context do carrinho de compras
- `src/integrations/supabase/client.ts` — Cliente Supabase preparado (placeholder)

**Layout**
- `src/components/Navbar.tsx` — Navbar global responsiva, muda por role (visitante/cliente/admin)
- `src/components/Footer.tsx` — Footer simples

**Páginas Públicas**
- `src/pages/Home.tsx` — Hero banner com logo, seção sobre, destaques de serviços, CTAs
- `src/pages/Servicos.tsx` — Layout e-commerce: sidebar de categorias + grid de produtos + busca
- `src/pages/ServicoDetalhe.tsx` — Detalhes do produto com variações (papel, tamanho, acabamento)
- `src/pages/Contato.tsx` — Formulário limpo (nome, email, mensagem)

**Autenticação**
- `src/pages/Login.tsx` — Tela de login preparada para Supabase
- `src/pages/Cadastro.tsx` — Tela de cadastro

**Área do Cliente**
- `src/pages/PainelPedidos.tsx` — Pedidos do cliente com status e histórico

**Admin**
- `src/pages/admin/Dashboard.tsx` — Cards resumo + gráfico recharts
- `src/pages/admin/Categorias.tsx` — CRUD de categorias (tabela + dialog)
- `src/pages/admin/Produtos.tsx` — CRUD de produtos vinculados a categorias
- `src/pages/admin/Pedidos.tsx` — Tabela de pedidos com mudança de status (Kanban simplificado)
- `src/components/admin/AdminLayout.tsx` — Layout com sidebar admin

**Arquivos Modificados**
- `src/App.tsx` — Todas as rotas + providers de Auth e Cart
- `src/index.css` — Cores customizadas (azul #1a5f8f, vermelho #d42027)

---

### Mock Data (Categorias e Produtos)
- **Categorias**: Cartões de Visita, Banners & Faixas, Adesivos, Flyers & Panfletos, Crachás & Convites, Papelaria Corporativa
- **~12 produtos** distribuídos com preços, descrições e variações
- **~8 pedidos** mock em diferentes status
- **Clientes** fictícios

### Design
- Paleta: azul escuro (`#1a5f8f`) como primary, vermelho (`#d42027`) como accent/destructive
- Logo do usuário (`logo_2025.png`) no Navbar e Home
- Shadcn UI components (Card, Table, Dialog, Sheet, Tabs, Badge, etc.)
- Responsivo com menu hambúrguer no mobile

### Navbar Dinâmica
- **Visitante**: Home, Serviços, Contato, Login
- **Cliente**: Home, Serviços, Meus Pedidos, Sair
- **Admin**: Home, Serviços, Painel Admin, Sair
- Toggle de role no topo para demonstração (dev only)

### Fluxo de Filtro na Loja
- Sidebar lista categorias do mockData
- Clique filtra grid de produtos
- Barra de busca filtra por nome/descrição
- Ambos os filtros combinam

