import { lazy, Suspense, useEffect } from "react";
import { useCart } from "@/hooks/use-cart";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import ScrollToTop from "@/components/ScrollToTop";
import AdminRoute from "@/components/AdminRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import { AuthProvider } from "@/hooks/use-auth";
import { CookieConsentProvider } from "@/hooks/use-cookie-consent";
import { HelmetProvider } from "react-helmet-async";

// Critical: only Index is eagerly loaded for fastest FCP
import Index from "./pages/Index";

// Lazy-loaded public pages
const NossaHistoria = lazy(() => import("./pages/NossaHistoria"));
const Loja = lazy(() => import("./pages/Loja"));
const Produto = lazy(() => import("./pages/Produto"));
const Carrinho = lazy(() => import("./pages/Carrinho"));
const Checkout = lazy(() => import("./pages/Checkout"));
const Pagamento = lazy(() => import("./pages/Pagamento"));
const FaleConosco = lazy(() => import("./pages/FaleConosco"));
const Avaliacoes = lazy(() => import("./pages/Avaliacoes"));
const Afiliados = lazy(() => import("./pages/Afiliados"));
const FAQ = lazy(() => import("./pages/FAQ"));
const PoliticaPrivacidade = lazy(() => import("./pages/PoliticaPrivacidade"));
const TermosDeUso = lazy(() => import("./pages/TermosDeUso"));
const AreaDoCliente = lazy(() => import("./pages/AreaDoCliente"));
const Login = lazy(() => import("./pages/Login"));
const Cadastro = lazy(() => import("./pages/Cadastro"));
const MinhaConta = lazy(() => import("./pages/MinhaConta"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const Kit = lazy(() => import("./pages/Kit"));
const AssistentePedido = lazy(() => import("./pages/AssistentePedido"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AcompanharPedido = lazy(() => import("./pages/AcompanharPedido"));
const OrcamentoPublico = lazy(() => import("./pages/OrcamentoPublico"));
const MelhorEnvioCallback = lazy(() => import("./pages/MelhorEnvioCallback"));
const RastrearPedido = lazy(() => import("./pages/RastrearPedido"));

// Lazy-loaded admin pages
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminProdutos = lazy(() => import("./pages/admin/AdminProdutos"));
const AdminCategorias = lazy(() => import("./pages/admin/AdminCategorias"));
const AdminPedidos = lazy(() => import("./pages/admin/AdminPedidos"));
const AdminClientes = lazy(() => import("./pages/admin/AdminClientes"));
const AdminClienteDetalhe = lazy(() => import("./pages/admin/AdminClienteDetalhe"));
const AdminLeads = lazy(() => import("./pages/admin/AdminLeads"));
const AdminCRM = lazy(() => import("./pages/admin/AdminCRM"));
const AdminVendasManuais = lazy(() => import("./pages/admin/AdminVendasManuais"));
const AdminAvaliacoes = lazy(() => import("./pages/admin/AdminAvaliacoes"));
const AdminCupons = lazy(() => import("./pages/admin/AdminCupons"));
const AdminAfiliados = lazy(() => import("./pages/admin/AdminAfiliados"));
const AdminBlog = lazy(() => import("./pages/admin/AdminBlog"));
const AdminRelatorios = lazy(() => import("./pages/admin/AdminRelatorios"));
const AdminDashboardFinanceiro = lazy(() => import("./pages/admin/AdminDashboardFinanceiro"));
const AdminConfiguracoes = lazy(() => import("./pages/admin/AdminConfiguracoes"));
const AdminHeroSlides = lazy(() => import("./pages/admin/AdminHeroSlides"));
const AdminOrcamentos = lazy(() => import("./pages/admin/AdminOrcamentos"));
const AdminKits = lazy(() => import("./pages/admin/AdminKits"));
const AdminPaginas = lazy(() => import("./pages/admin/AdminPaginas"));
const AdminClientesImportantes = lazy(() => import("./pages/admin/AdminClientesImportantes"));
const AdminMapaClientes = lazy(() => import("./pages/admin/AdminMapaClientes"));
const AdminLucro = lazy(() => import("./pages/admin/AdminLucro"));
const AdminProducao = lazy(() => import("./pages/admin/AdminProducao"));
const AdminAcabamentos = lazy(() => import("./pages/admin/AdminAcabamentos"));
const AdminSocialProof = lazy(() => import("./pages/admin/AdminSocialProof"));
const AdminProducaoMonitor = lazy(() => import("./pages/admin/AdminProducaoMonitor"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      gcTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const PageLoader = () => (
  <div className="min-h-screen bg-background">
    <div className="h-16 bg-muted/30 animate-pulse" />
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="h-8 w-64 bg-muted rounded-lg animate-pulse" />
      <div className="h-4 w-96 bg-muted rounded animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-64 bg-muted rounded-2xl animate-pulse" />
        ))}
      </div>
    </div>
  </div>
);

// Load cloud cart on app mount
const CartCloudSync = () => {
  const loadFromCloud = useCart((s) => s.loadFromCloud);
  useEffect(() => { loadFromCloud(); }, [loadFromCloud]);
  return null;
};

// Inner App component to handle location-based transitions
const AppContent = () => {
  const location = useLocation();
  
  return (
    <Suspense fallback={<PageLoader />}>
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="flex-1 flex flex-col min-h-screen"
        >
          <Routes>
            {/* Public */}
            <Route path="/" element={<Index />} />
            <Route path="/nossa-historia" element={<NossaHistoria />} />
            <Route path="/loja" element={<Loja />} />
            <Route path="/kit/:slug" element={<Kit />} />
            <Route path="/loja/:slug" element={<Produto />} />
            <Route path="/carrinho" element={<Carrinho />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/pagamento/:orderId" element={<Pagamento />} />
            <Route path="/fale-conosco" element={<FaleConosco />} />
            <Route path="/avaliacoes" element={<Avaliacoes />} />
            <Route path="/afiliados" element={<Afiliados />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/politica-de-privacidade" element={<PoliticaPrivacidade />} />
            <Route path="/termos-de-uso" element={<TermosDeUso />} />
            <Route path="/area-do-cliente" element={<AreaDoCliente />} />
            <Route path="/login" element={<Login />} />
            <Route path="/cadastro" element={<Cadastro />} />
            <Route path="/minha-conta" element={<MinhaConta />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            <Route path="/assistente" element={<AssistentePedido />} />
            <Route path="/acompanhar/:orderId" element={<AcompanharPedido />} />
            <Route path="/rastrear" element={<RastrearPedido />} />
            <Route path="/orcamento/:quoteId" element={<OrcamentoPublico />} />
            <Route path="/melhor-envio/callback" element={<MelhorEnvioCallback />} />

            {/* Admin — protected by AdminRoute guard */}
            <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/admin/produtos" element={<AdminRoute><AdminProdutos /></AdminRoute>} />
            <Route path="/admin/categorias" element={<AdminRoute><AdminCategorias /></AdminRoute>} />
            <Route path="/admin/pedidos" element={<AdminRoute><AdminPedidos /></AdminRoute>} />
            <Route path="/admin/clientes" element={<AdminRoute><AdminClientes /></AdminRoute>} />
            <Route path="/admin/clientes/:id" element={<AdminRoute><AdminClienteDetalhe /></AdminRoute>} />
            <Route path="/admin/leads" element={<AdminRoute><AdminLeads /></AdminRoute>} />
            <Route path="/admin/crm" element={<AdminRoute><AdminCRM /></AdminRoute>} />
            <Route path="/admin/vendas-manuais" element={<AdminRoute><AdminVendasManuais /></AdminRoute>} />
            <Route path="/admin/avaliacoes" element={<AdminRoute><AdminAvaliacoes /></AdminRoute>} />
            <Route path="/admin/cupons" element={<AdminRoute><AdminCupons /></AdminRoute>} />
            <Route path="/admin/afiliados" element={<AdminRoute><AdminAfiliados /></AdminRoute>} />
            <Route path="/admin/blog" element={<AdminRoute><AdminBlog /></AdminRoute>} />
            <Route path="/admin/relatorios" element={<AdminRoute><AdminRelatorios /></AdminRoute>} />
            <Route path="/admin/financeiro" element={<AdminRoute><AdminDashboardFinanceiro /></AdminRoute>} />
            <Route path="/admin/configuracoes" element={<AdminRoute><AdminConfiguracoes /></AdminRoute>} />
            <Route path="/admin/hero-slides" element={<AdminRoute><AdminHeroSlides /></AdminRoute>} />
            <Route path="/admin/orcamentos" element={<AdminRoute><AdminOrcamentos /></AdminRoute>} />
            <Route path="/admin/kits" element={<AdminRoute><AdminKits /></AdminRoute>} />
            <Route path="/admin/paginas" element={<AdminRoute><AdminPaginas /></AdminRoute>} />
            <Route path="/admin/clientes-importantes" element={<AdminRoute><AdminClientesImportantes /></AdminRoute>} />
            <Route path="/admin/mapa-clientes" element={<AdminRoute><AdminMapaClientes /></AdminRoute>} />
            <Route path="/admin/lucro" element={<AdminRoute><AdminLucro /></AdminRoute>} />
            <Route path="/admin/producao" element={<AdminRoute><AdminProducao /></AdminRoute>} />
            <Route path="/admin/acabamentos" element={<AdminRoute><AdminAcabamentos /></AdminRoute>} />
            <Route path="/admin/social-proof" element={<AdminRoute><AdminSocialProof /></AdminRoute>} />
            <Route path="/admin/producao/monitor" element={<AdminRoute><AdminProducaoMonitor /></AdminRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
    </Suspense>
  );
};

const App = () => (
  <ErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <HelmetProvider>
    <CookieConsentProvider>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <CartCloudSync />
          <AppContent />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
    </CookieConsentProvider>
    </HelmetProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
