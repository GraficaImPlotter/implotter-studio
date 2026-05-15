import { useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import {
  SidebarProvider,
  SidebarTrigger,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { NavLink } from "@/components/NavLink";
import {
  LayoutDashboard,
  Package,
  FolderOpen,
  ShoppingCart,
  Users,
  UserPlus,
  MessageSquare,
  Star,
  Tag,
  Link2,
  Settings,
  FileText,
  BarChart3,
  DollarSign,
  Search,
  ArrowLeft,
  Image,
  ClipboardList,
  BoxIcon,
  FileEdit,
  MapPin,
  TrendingUp,
  Factory,
  Layers,
  MessageSquareMore,
  Sparkles,
  Command,
  FileSignature,
} from "lucide-react";
import logo from "@/assets/logo.png";
import { NotificationHub } from "@/components/admin/NotificationHub";
import { CommandPalette } from "@/components/admin/CommandPalette";
import { cn } from "@/lib/utils";

const menuGroups = [
  {
    label: "Geral",
    items: [{ title: "Dashboard", url: "/admin", icon: LayoutDashboard }],
  },
  {
    label: "Loja & Produtos",
    items: [
      {
        title: "Gestão de Produtos e Fotos",
        url: "/admin/produtos",
        icon: Package,
      },
      { title: "Acabamentos", url: "/admin/acabamentos", icon: Layers },
      { title: "Kits", url: "/admin/kits", icon: BoxIcon },
      {
        title: "Categorias (Círculos Home)",
        url: "/admin/categorias",
        icon: FolderOpen,
      },
      { title: "Cupons", url: "/admin/cupons", icon: Tag },
    ],
  },
  {
    label: "Vendas & Clientes",
    items: [
      { title: "Pedidos", url: "/admin/pedidos", icon: ShoppingCart },
      { title: "Orçamentos", url: "/admin/orcamentos", icon: ClipboardList },
      {
        title: "Vendas Manuais",
        url: "/admin/vendas-manuais",
        icon: DollarSign,
      },
      { title: "Clientes", url: "/admin/clientes", icon: Users },
      { title: "CRM", url: "/admin/crm", icon: MessageSquare },
      { title: "Leads", url: "/admin/leads", icon: UserPlus },
      {
        title: "Prospecção Inteligente",
        url: "/admin/prospeccao",
        icon: Sparkles,
      },
      { title: "Mapa de Clientes", url: "/admin/mapa-clientes", icon: MapPin },
    ],
  },
  {
    label: "Operacional",
    items: [
      { title: "Produção", url: "/admin/producao", icon: Factory },
      { title: "Avaliações", url: "/admin/avaliacoes", icon: Star },
      {
        title: "Prova Social",
        url: "/admin/social-proof",
        icon: MessageSquareMore,
      },
      {
        title: "Banners (Carousel Home)",
        url: "/admin/hero-slides",
        icon: Image,
      },
      { title: "Páginas", url: "/admin/paginas", icon: FileEdit },
    ],
  },
  {
    label: "Gestão & Dados",
    items: [
      {
        title: "Financeiro (Resumo)",
        url: "/admin/financeiro",
        icon: BarChart3,
      },
      { title: "Contas a Pagar", url: "/admin/contas-pagar", icon: DollarSign },
      { title: "Lucro & Margem", url: "/admin/lucro", icon: TrendingUp },
      { title: "Relatórios", url: "/admin/relatorios", icon: TrendingUp },
      { title: "Configurações", url: "/admin/configuracoes", icon: Settings },
      { title: "NF-e", url: "/admin/nfe", icon: FileSignature },
    ],
  },
];

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate("/login");
    }
  }, [user, loading, isAdmin, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-4 border-highlight border-t-transparent rounded-full animate-spin shadow-glow" />
      </div>
    );
  }

  if (!user || !isAdmin) return null;

  return (
    <SidebarProvider>
      <CommandPalette />
      <div className="min-h-screen flex w-full bg-background overflow-x-hidden">
        <Sidebar collapsible="icon" className="shadow-2xl z-50">
          <SidebarContent className="bg-card border-r border-border/50">
            <div className="p-6 border-b border-border/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-highlight to-highlight-glow p-0.5 shadow-glow">
                  <div className="w-full h-full bg-card rounded-[14px] flex items-center justify-center">
                    <img src={logo} alt="ImPlotter" className="h-5" />
                  </div>
                </div>
                <div className="group-data-[collapsible=icon]:hidden animate-in fade-in duration-300">
                  <h2 className="font-display font-black text-foreground text-sm uppercase tracking-tighter">
                    Admin <span className="text-highlight">Suite</span>
                  </h2>
                  <p className="text-muted-foreground text-[9px] font-bold uppercase tracking-widest opacity-60">
                    Control Center
                  </p>
                </div>
              </div>
            </div>

            <div className="px-2 scrollbar-thin scrollbar-thumb-white/5 py-4">
              {menuGroups.map((group) => (
                <SidebarGroup key={group.label} className="mb-2">
                  <SidebarGroupLabel className="text-muted-foreground text-[9px] uppercase font-black tracking-[0.2em] px-4 mt-2 mb-2 group-data-[collapsible=icon]:hidden opacity-40">
                    {group.label}
                  </SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu className="gap-1">
                      {group.items.map((item) => (
                        <SidebarMenuItem key={item.url}>
                          <SidebarMenuButton asChild>
                            <NavLink
                              to={item.url}
                              end={item.url === "/admin"}
                              className={cn(
                                "text-muted-foreground hover:text-foreground hover:bg-white/[0.03] transition-all duration-300 py-3 h-auto group border border-transparent",
                                location.pathname === item.url &&
                                  "border-white/5 shadow-inner",
                              )}
                              activeClassName="bg-highlight/10 text-highlight font-bold border-highlight/20 shadow-glow-sm"
                            >
                              <item.icon className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110 ml-0.5" />
                              <span className="text-xs group-data-[collapsible=icon]:hidden">
                                {item.title}
                              </span>
                              {item.title === "Produção" && (
                                <Sparkles className="w-3 h-3 text-highlight animate-pulse group-data-[collapsible=icon]:hidden" />
                              )}
                            </NavLink>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              ))}
            </div>

            <div className="mt-auto p-4 border-t border-border/30 group-data-[collapsible=icon]:p-2">
              <Link
                to="/"
                className="flex items-center gap-3 text-xs text-muted-foreground hover:text-highlight transition-all px-4 py-3 rounded-2xl hover:bg-white/[0.03] font-bold uppercase tracking-widest"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="group-data-[collapsible=icon]:hidden">
                  Sair do Painel
                </span>
              </Link>
            </div>
          </SidebarContent>
        </Sidebar>

        <div className="flex-1 flex flex-col relative">
          <header className="h-20 flex items-center justify-between border-b border-border/50 px-8 bg-card/[0.01] backdrop-blur-3xl sticky top-0 z-40 transition-all duration-300">
            <div className="flex items-center gap-6">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-all p-2 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/5" />
              <div className="h-6 w-px bg-white/5 hidden lg:block" />
              <div className="hidden lg:flex flex-col">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60 leading-none mb-1">
                  Status do Workspace
                </p>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-success animate-pulse shadow-glow shadow-success/40" />
                  <span className="text-xs font-bold text-foreground">
                    Sistemas Operacionais Normais
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 flex-1 max-w-xl px-8 group">
              <button
                onClick={() =>
                  window.dispatchEvent(
                    new KeyboardEvent("keydown", { key: "k", ctrlKey: true }),
                  )
                }
                className="w-full flex items-center gap-3 bg-white/[0.03] border-white/5 border rounded-2xl py-3 px-5 text-sm transition-all hover:bg-white/[0.06] hover:border-highlight/30 group/search"
              >
                <Search className="w-4 h-4 text-muted-foreground group-focus-within:text-highlight transition-colors" />
                <span className="text-muted-foreground/50 text-[13px] font-medium mr-auto">
                  Pesquisar tudo no sistema...
                </span>
                <div className="flex items-center gap-1 opacity-40 group-hover/search:opacity-100 transition-opacity">
                  <Command className="w-3 h-3" />
                  <span className="text-[10px] font-bold">K</span>
                </div>
              </button>
            </div>

            <div className="flex items-center gap-4">
              <div className="h-8 w-px bg-white/5 mx-2" />
              <NotificationHub />
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-highlight/20 to-transparent border border-highlight/30 flex items-center justify-center text-highlight font-black text-xs hover:scale-105 transition-transform cursor-pointer">
                {user?.email
                  ? user.email.split("@")[0].slice(0, 2).toUpperCase()
                  : "AD"}
              </div>
            </div>
          </header>

          <main className="flex-1 p-4 md:p-8 overflow-auto scrollbar-thin scrollbar-thumb-white/5 scroll-smooth relative z-10 transition-all duration-500">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminLayout;
