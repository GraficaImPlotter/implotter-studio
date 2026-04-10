import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
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
  LayoutDashboard, Package, FolderOpen, ShoppingCart, Users, UserPlus,
  MessageSquare, Star, Tag, Link2, Settings, FileText, BarChart3, DollarSign, Search,
  ArrowLeft, Image, ClipboardList, BoxIcon, FileEdit, MapPin, TrendingUp, Factory, Layers, MessageSquareMore,
} from "lucide-react";
import logo from "@/assets/logo.png";

const menuGroups = [
  {
    label: "Geral",
    items: [
      { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
    ]
  },
  {
    label: "Loja & Produtos",
    items: [
      { title: "Produtos", url: "/admin/produtos", icon: Package },
      { title: "Acabamentos", url: "/admin/acabamentos", icon: Layers },
      { title: "Kits", url: "/admin/kits", icon: BoxIcon },
      { title: "Catálogo", url: "/admin/categorias", icon: FolderOpen },
      { title: "Cupons", url: "/admin/cupons", icon: Tag },
    ]
  },
  {
    label: "Vendas & Clientes",
    items: [
      { title: "Pedidos", url: "/admin/pedidos", icon: ShoppingCart },
      { title: "Orçamentos", url: "/admin/orcamentos", icon: ClipboardList },
      { title: "Vendas Manuais", url: "/admin/vendas-manuais", icon: DollarSign },
      { title: "Clientes", url: "/admin/clientes", icon: Users },
      { title: "CRM", url: "/admin/crm", icon: MessageSquare },
      { title: "Leads", url: "/admin/leads", icon: UserPlus },
      { title: "Mapa de Clientes", url: "/admin/mapa-clientes", icon: MapPin },
      { title: "Clientes Importantes", url: "/admin/clientes-importantes", icon: Users },
    ]
  },
  {
    label: "Operacional",
    items: [
      { title: "Produção", url: "/admin/producao", icon: Factory },
      { title: "Avaliações", url: "/admin/avaliacoes", icon: Star },
      { title: "Prova Social", url: "/admin/social-proof", icon: MessageSquareMore },
      { title: "Hero / Impressora", url: "/admin/hero-slides", icon: Image },
    ]
  },
  {
    label: "Conteúdo",
    items: [
      { title: "Blog", url: "/admin/blog", icon: FileText },
      { title: "Páginas", url: "/admin/paginas", icon: FileEdit },
      { title: "Afiliados", url: "/admin/afiliados", icon: Link2 },
    ]
  },
  {
    label: "Gestão & Dados",
    items: [
      { title: "Financeiro", url: "/admin/financeiro", icon: DollarSign },
      { title: "Lucro & Margem", url: "/admin/lucro", icon: TrendingUp },
      { title: "Relatórios", url: "/admin/relatorios", icon: BarChart3 },
      { title: "Configurações", url: "/admin/configuracoes", icon: Settings },
    ]
  },
];

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate("/login");
    }
  }, [user, loading, isAdmin, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-highlight border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !isAdmin) return null;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <Sidebar collapsible="icon">
          <SidebarContent className="bg-card border-r border-border">
            <div className="p-5 border-b border-border">
              <div className="flex items-center gap-3">
                <img src={logo} alt="ImPlotter" className="h-8" />
                <div>
                  <h2 className="font-display font-bold text-foreground text-sm">Admin Panel</h2>
                  <p className="text-muted-foreground text-[10px]">Gráfica ImPlotter</p>
                </div>
              </div>
            </div>
            {menuGroups.map((group) => (
              <SidebarGroup key={group.label}>
                <SidebarGroupLabel className="text-muted-foreground text-[10px] uppercase tracking-wider font-semibold px-5 mt-4 mb-2">{group.label}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) => (
                      <SidebarMenuItem key={item.url}>
                        <SidebarMenuButton asChild>
                          <NavLink
                            to={item.url}
                            end={item.url === "/admin"}
                            className="text-muted-foreground hover:text-foreground hover:bg-secondary mx-2 rounded-xl transition-all duration-200 py-2.5 h-auto group"
                            activeClassName="bg-highlight/10 text-highlight font-semibold border-gradient-premium shadow-sm"
                          >
                            <item.icon className="mr-3 h-4 w-4 group-hover:scale-110 transition-transform" />
                            <span className="text-sm">{item.title}</span>
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}

            {/* Back to site */}
            <div className="mt-auto p-4 border-t border-border">
              <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-highlight transition-colors px-3 py-2 rounded-xl hover:bg-secondary">
                <ArrowLeft className="w-4 h-4" /> Voltar ao site
              </Link>
            </div>
          </SidebarContent>
        </Sidebar>

        <div className="flex-1 flex flex-col">
          <header className="h-16 flex items-center justify-between border-b border-border px-6 bg-card/50 backdrop-blur-md sticky top-0 z-10 shadow-sm border-gradient-premium rounded-b-xl border-x-0 border-t-0">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors" />
              <div className="h-4 w-px bg-border mx-2 hidden md:block" />
              <span className="text-sm text-muted-foreground font-medium hidden md:block">Painel Administrativo</span>
            </div>
            
            <div className="flex items-center gap-4 flex-1 max-w-md mx-4">
              <div className="relative w-full group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-highlight transition-colors" />
                <input 
                  type="text" 
                  placeholder="Pesquisar pedidos, produtos..." 
                  className="w-full bg-secondary/50 border-border border rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-highlight/50 transition-all placeholder:text-muted-foreground/50"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link to="/admin/configuracoes" className="p-2 text-muted-foreground hover:text-foreground hover:text-highlight transition-colors rounded-lg hover:bg-secondary" title="Configurações">
                <Settings className="w-5 h-5" />
              </Link>
            </div>
          </header>
          <main className="flex-1 p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminLayout;
