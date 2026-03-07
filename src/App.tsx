import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Home from "@/pages/Home";
import Servicos from "@/pages/Servicos";
import ServicoDetalhe from "@/pages/ServicoDetalhe";
import Contato from "@/pages/Contato";
import Login from "@/pages/Login";
import Cadastro from "@/pages/Cadastro";
import PainelPedidos from "@/pages/PainelPedidos";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminDashboard from "@/pages/admin/Dashboard";
import AdminCategorias from "@/pages/admin/Categorias";
import AdminProdutos from "@/pages/admin/Produtos";
import AdminPedidos from "@/pages/admin/Pedidos";
import AdminBanners from "@/pages/admin/Banners";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <CartProvider>
            <div className="min-h-screen flex flex-col">
              <Navbar />
              <main className="flex-1">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/servicos" element={<Servicos />} />
                  <Route path="/servicos/:id" element={<ServicoDetalhe />} />
                  <Route path="/contato" element={<Contato />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/cadastro" element={<Cadastro />} />
                  <Route path="/painel/pedidos" element={<PainelPedidos />} />
                  <Route path="/admin" element={<AdminLayout />}>
                    <Route index element={<AdminDashboard />} />
                    <Route path="banners" element={<AdminBanners />} />
                    <Route path="categorias" element={<AdminCategorias />} />
                    <Route path="produtos" element={<AdminProdutos />} />
                    <Route path="pedidos" element={<AdminPedidos />} />
                  </Route>
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
              <Footer />
            </div>
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
