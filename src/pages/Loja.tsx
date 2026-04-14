import { useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams, Link, useLocation } from "react-router-dom";
import PublicLayout from "@/components/layout/PublicLayout";
import SEOHead from "@/components/SEOHead";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/hooks/use-cart";
import { useToast } from "@/hooks/use-toast";
import {
  ShoppingCart, Search, ArrowRight, ChevronRight, ChevronDown,
  Home, Ruler, FolderOpen, Menu, Package, BoxIcon, Clock, Star,
  Sparkles, Flame, Tag,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import DynamicBadges from "@/components/product/DynamicBadges";
import { ProductCardSkeletonGrid } from "@/components/product/ProductCardSkeleton";
import PageHero from "@/components/layout/PageHero";
import StoreProductCard from "@/components/product/StoreProductCard";

interface CatalogNode {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
}

/* ─── Sidebar tree node ─── */
const TreeNode = ({
  node, allNodes, expanded, toggleExpand, selectedId, onSelect, depth = 0,
}: {
  node: CatalogNode; allNodes: CatalogNode[]; expanded: Set<string>;
  toggleExpand: (id: string) => void; selectedId: string | null;
  onSelect: (node: CatalogNode) => void; depth?: number;
}) => {
  const children = allNodes.filter(n => n.parent_id === node.id).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const hasChildren = children.length > 0;
  const isExpanded = expanded.has(node.id);
  const isActive = selectedId === node.id;

  return (
    <div>
      <button
        onClick={() => { if (hasChildren) { toggleExpand(node.id); } else { onSelect(node); } }}
        className={`w-full flex items-center gap-2 text-left text-[13px] transition-all duration-200 rounded-lg px-3 py-2 group
          ${isActive
            ? "bg-primary/10 text-primary font-semibold border-l-2 border-primary"
            : "text-foreground/70 hover:bg-muted hover:text-foreground"
          }`}
        style={{ paddingLeft: `${depth * 14 + 12}px` }}
      >
        {hasChildren ? (
          <span className="w-4 h-4 flex-shrink-0 flex items-center justify-center transition-transform duration-200">
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </span>
        ) : (
          <span className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
          </span>
        )}
        <span className="truncate">{node.name}</span>
        {hasChildren && (
          <span className="ml-auto text-[10px] text-muted-foreground">{children.length}</span>
        )}
      </button>
      <AnimatePresence>
        {isExpanded && hasChildren && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            {children.map(child => (
              <TreeNode key={child.id} node={child} allNodes={allNodes} expanded={expanded} toggleExpand={toggleExpand} selectedId={selectedId} onSelect={onSelect} depth={depth + 1} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ─── Sidebar content ─── */
const SidebarContent = ({
  roots, allNodes, expanded, toggleExpand, selectedId, onSelect,
}: {
  roots: CatalogNode[]; allNodes: CatalogNode[]; expanded: Set<string>;
  toggleExpand: (id: string) => void; selectedId: string | null;
  onSelect: (node: CatalogNode) => void;
}) => (
  <div className="space-y-1">
    <div className="px-3 pb-3 mb-1 border-b border-border">
      <h2 className="font-display font-bold text-foreground text-sm flex items-center gap-2">
        <FolderOpen className="w-4 h-4 text-primary" />
        Categorias
      </h2>
    </div>
    {roots.length === 0 ? (
      <p className="text-xs text-muted-foreground px-3 py-4">Nenhuma categoria cadastrada.</p>
    ) : (
      roots.map(node => (
        <TreeNode key={node.id} node={node} allNodes={allNodes} expanded={expanded} toggleExpand={toggleExpand} selectedId={selectedId} onSelect={onSelect} />
      ))
    )}
  </div>
);

/* ─── Section header ─── */
const SectionHeader = ({ icon: Icon, title, accent }: { icon: React.ElementType; title: string; accent?: string }) => (
  <div className="flex items-center gap-3 mb-6">
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border-gradient-premium carbon-fiber-bg ${accent || "text-primary shadow-glow-sm"}`}>
      <Icon className="w-5 h-5" />
    </div>
    <h2 className="font-display text-lg md:text-xl font-bold text-foreground tracking-tight">{title}</h2>
    <div className="flex-1 h-px bg-gradient-to-r from-border via-border/40 to-transparent" />
  </div>
);

const COLOR_MODE_ORDER: Record<string, number> = { "1x0": 0, "1x1": 1, "4x0": 2, "4x1": 3, "4x4": 4 };

const sortByColorMode = (products: any[]) => {
  return [...products].sort((a, b) => {
    const orderA = COLOR_MODE_ORDER[a.color_mode] ?? 99;
    const orderB = COLOR_MODE_ORDER[b.color_mode] ?? 99;
    if (orderA !== orderB) return orderA - orderB;
    return a.name.localeCompare(b.name, "pt-BR");
  });
};

/* ─── Main page ─── */
const Loja = () => {
  const { toast } = useToast();
  const { addItem } = useCart();
  const [searchParams, setSearchParams] = useSearchParams();
  const [allNodes, setAllNodes] = useState<CatalogNode[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [kits, setKits] = useState<any[]>([]);
  const [filterColor, setFilterColor] = useState("");
  const [filterQty, setFilterQty] = useState("");
  const [filterPrice, setFilterPrice] = useState("");
  const [filterUnit, setFilterUnit] = useState("");
  const [filterPromo, setFilterPromo] = useState("");

  const selectedNodeId = searchParams.get("node") || null;
  const sortBy = searchParams.get("sort") || "relevancia";

  // Sync search param from header
  useEffect(() => {
    const s = searchParams.get("search");
    if (s && s !== search) setSearch(s);
  }, [searchParams]);

  const getNodePath = useCallback((nodeId: string): CatalogNode[] => {
    const path: CatalogNode[] = [];
    let cur = allNodes.find(n => n.id === nodeId);
    while (cur) { path.unshift(cur); cur = cur.parent_id ? allNodes.find(n => n.id === cur!.parent_id) : undefined; }
    return path;
  }, [allNodes]);

  const breadcrumb = useMemo(() => selectedNodeId ? getNodePath(selectedNodeId) : [], [selectedNodeId, getNodePath]);
  const roots = useMemo(() => allNodes.filter(n => !n.parent_id).sort((a, b) => a.name.localeCompare(b.name, "pt-BR")), [allNodes]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: nodes } = await supabase.from("catalog_nodes").select("*").eq("is_active", true).order("name");
    const nodesList = (nodes ?? []) as CatalogNode[];
    setAllNodes(nodesList);

    const PUBLIC_PRODUCT_COLS = "id, name, slug, short_description, price, sale_price, pricing_type, sale_unit, price_per_sqm, catalog_node_id, category_id, is_active, is_featured, estimated_days, color_mode, default_quantity, sort_order, created_at, updated_at, product_images(image_url, sort_order)";
    let q = supabase.from("products").select(PUBLIC_PRODUCT_COLS).eq("is_active", true);
    
    const nodeId = new URLSearchParams(window.location.search).get("node");
    if (nodeId) {
      // Get recursive children IDs
      const getDescendants = (id: string): string[] => {
        const children = nodesList.filter(n => n.parent_id === id);
        let ids = children.map(c => c.id);
        children.forEach(c => {
          ids = [...ids, ...getDescendants(c.id)];
        });
        return ids;
      };
      
      const allCategoryIds = [nodeId, ...getDescendants(nodeId)];
      q = q.in("catalog_node_id", allCategoryIds);
    }

    const searchTerm = search.trim() || new URLSearchParams(window.location.search).get("search")?.trim();
    if (searchTerm) q = q.ilike("name", `%${searchTerm}%`);

    const sort = new URLSearchParams(window.location.search).get("sort") || "relevancia";
    if (sort === "menor-preco") q = q.order("price", { ascending: true });
    else if (sort === "maior-preco") q = q.order("price", { ascending: false });
    else if (sort === "recentes") q = q.order("created_at", { ascending: false });
    else q = q.order("name");

    try {
      const { data, error } = await q;
      if (error) {
        console.error("Erro ao buscar produtos:", error);
        setProducts([]);
      } else {
        setProducts(sortByColorMode(data ?? []));
      }
    } catch (err) {
      console.error("Erro inesperado:", err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    supabase.from("products").select("id, name, slug, price, sale_price, pricing_type, price_per_sqm, color_mode, is_featured, sort_order, created_at, product_images(image_url, sort_order)").eq("is_active", true).order("created_at", { ascending: false }).then(({ data }) => setAllProducts(sortByColorMode(data ?? [])));
  }, []);

  useEffect(() => { load(); }, [selectedNodeId, sortBy, load]);

  useEffect(() => {
    supabase.from("kits").select("*").eq("is_active", true).order("sort_order").order("name").then(({ data }) => setKits(data ?? []));
  }, []);

  // Scroll to hash anchor (e.g. #kits)
  const location = useLocation();
  useEffect(() => {
    if (location.hash) {
      const el = document.querySelector(location.hash);
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 300);
      }
    }
  }, [location.hash, kits]);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); load(); };

  const selectNode = (node: CatalogNode) => {
    const p = new URLSearchParams(searchParams);
    if (selectedNodeId === node.id) p.delete("node"); else p.set("node", node.id);
    setSearchParams(p);
    setMobileMenuOpen(false);
  };

  const navigateToBreadcrumb = (nodeId: string | null) => {
    const p = new URLSearchParams(searchParams);
    if (!nodeId) p.delete("node"); else p.set("node", nodeId);
    setSearchParams(p);
  };

  const toggleExpand = (id: string) => {
    setExpanded(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };

  useEffect(() => {
    if (!selectedNodeId || allNodes.length === 0) return;
    const path = getNodePath(selectedNodeId);
    setExpanded(prev => { const next = new Set(prev); path.forEach(n => next.add(n.id)); return next; });
  }, [selectedNodeId, allNodes, getNodePath]);

  const handleAddToCart = (p: any) => {
    if (p.pricing_type === "per_sqm") { window.location.href = `/loja/${p.slug}`; return; }
    const img = p.product_images?.sort((a: any, b: any) => a.sort_order - b.sort_order)[0]?.image_url;
    addItem({ productId: p.id, name: p.name, price: Number(p.sale_price || p.price), quantity: 1, image: img });
    toast({ 
      title: "✨ Adicionado com Sucesso!", 
      description: `${p.name} já está no seu carrinho premium.`,
      className: "glass-card-premium border-primary/40 text-foreground"
    });
  };

  const getProductImage = (p: any) => {
    const imgs = p.product_images?.sort((a: any, b: any) => a.sort_order - b.sort_order);
    return imgs?.[0]?.image_url || "/placeholder.svg";
  };

  const selectedNodeName = selectedNodeId ? allNodes.find(n => n.id === selectedNodeId)?.name : null;

  // Apply client-side filters
  const applyFilters = useCallback((list: any[]) => {
    let f = list;
    if (filterColor) f = f.filter(p => p.color_mode === filterColor);
    if (filterQty) f = f.filter(p => String(p.default_quantity) === filterQty);
    if (filterUnit) f = f.filter(p => p.pricing_type === filterUnit);
    if (filterPromo === "promo") f = f.filter(p => p.sale_price && Number(p.sale_price) < Number(p.price));
    if (filterPromo === "featured") f = f.filter(p => p.is_featured);
    if (filterPrice) {
      f = f.filter(p => {
        const val = Number(p.sale_price || p.price);
        if (filterPrice === "<50") return val <= 50;
        if (filterPrice === "50-100") return val > 50 && val <= 100;
        if (filterPrice === ">100") return val > 100;
        return true;
      });
    }
    return f;
  }, [filterColor, filterQty, filterUnit, filterPromo, filterPrice]);

  const filteredProducts = useMemo(() => applyFilters(products), [products, applyFilters]);
  const filteredAll = useMemo(() => applyFilters(allProducts), [allProducts, applyFilters]);

  const featuredProducts = useMemo(() => filteredAll.filter(p => p.is_featured).slice(0, 8), [filteredAll]);
  const promoProducts = useMemo(() => filteredAll.filter(p => p.sale_price && Number(p.sale_price) < Number(p.price)).slice(0, 8), [filteredAll]);
  const recentProducts = useMemo(() => filteredAll.slice(0, 12), [filteredAll]);

  // Get unique quantities for filter
  const availableQtys = useMemo(() => {
    const qtys = new Set<string>();
    allProducts.forEach(p => { if (p.default_quantity) qtys.add(String(p.default_quantity)); });
    return Array.from(qtys).sort((a, b) => Number(a) - Number(b));
  }, [allProducts]);

  const sidebarTree = <SidebarContent roots={roots} allNodes={allNodes} expanded={expanded} toggleExpand={toggleExpand} selectedId={selectedNodeId} onSelect={selectNode} />;
  const showHome = !selectedNodeId && !search.trim();

  return (
    <PublicLayout>
      <SEOHead 
        title={selectedNodeName ? `${selectedNodeName} | Catálogo` : "Loja de Impressos | Banners, Adesivos e Cartões"} 
        description={selectedNodeName ? `Confira nossa linha de ${selectedNodeName}. Qualidade profissional e entrega rápida.` : "Explore nosso catálogo completo de materiais gráficos: banners em lona, adesivos vinil, cartões de visita premium e panfletos promocionais."} 
        canonical="/loja" 
      />
      <PageHero title={selectedNodeName || "Nossa Loja"} badge="Catálogo de Produtos">
        <div className="max-w-2xl mx-auto">
          <p className="text-white/70 text-sm md:text-base mb-8">
            Explore nossa seleção premium de materiais gráficos com a melhor qualidade do Brasil.
          </p>
          <form onSubmit={handleSearch} className="flex gap-2 max-w-xl mx-auto">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <Input
                placeholder="O que você deseja imprimir hoje?"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-12 h-12 md:h-14 text-base bg-white/10 border-white/20 text-white rounded-xl shadow-sm focus:shadow-md transition-shadow backdrop-blur-md placeholder:text-white/30"
              />
            </div>
            <Button type="submit" variant="highlight" className="h-12 md:h-14 px-8 rounded-xl text-sm font-bold shadow-glow hover:shadow-glow-strong active:scale-95 transition-all">
              <Search className="w-5 h-5 md:mr-2" />
              <span className="hidden md:inline text-base">Buscar</span>
            </Button>
          </form>

          {/* Filters Bar Premium */}
            <div className="flex flex-wrap gap-4 justify-center mt-8 p-4 bg-white/5 backdrop-blur-xl rounded-[2rem] border border-white/10 shadow-2xl">
              {/* Color Filter Segmented */}
              <div className="flex flex-wrap gap-1 bg-black/40 p-1.5 rounded-2xl border border-white/5 shadow-inner">
                <button 
                  onClick={() => setFilterColor("")}
                  className={`px-4 py-2 rounded-xl text-[11px] font-bold tracking-tight transition-all uppercase ${!filterColor ? "bg-primary text-primary-foreground shadow-glow-sm" : "text-white/40 hover:text-white/70"}`}
                >
                  Todas Cores
                </button>
                {["1x0", "1x1", "4x0", "4x1", "4x4"].map(c => (
                  <button 
                    key={c}
                    onClick={() => setFilterColor(c)}
                    className={`px-4 py-2 rounded-xl text-[11px] font-bold tracking-tight transition-all uppercase ${filterColor === c ? "bg-primary text-primary-foreground shadow-glow-sm" : "text-white/40 hover:text-white/70"}`}
                  >
                    {c}
                  </button>
                ))}
              </div>

              {/* Qty Filter Segmented (if small number of options) */}
              {availableQtys.length > 1 && availableQtys.length <= 6 && (
                <div className="flex flex-wrap gap-1 bg-black/40 p-1.5 rounded-2xl border border-white/5 shadow-inner">
                  <button 
                    onClick={() => setFilterQty("")}
                    className={`px-4 py-2 rounded-xl text-[11px] font-bold tracking-tight transition-all uppercase ${!filterQty ? "bg-primary text-primary-foreground shadow-glow-sm" : "text-white/40 hover:text-white/70"}`}
                  >
                    Todas Qtds
                  </button>
                  {availableQtys.map(q => (
                    <button 
                      key={q}
                      onClick={() => setFilterQty(q)}
                      className={`px-4 py-2 rounded-xl text-[11px] font-bold tracking-tight transition-all uppercase ${filterQty === q ? "bg-primary text-primary-foreground shadow-glow-sm" : "text-white/40 hover:text-white/70"}`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}

            {/* Fallback for large number of qtys */}
            {availableQtys.length > 6 && (
              <select
                value={filterQty}
                onChange={e => setFilterQty(e.target.value)}
                className="h-12 rounded-2xl border border-white/10 bg-black/40 px-4 text-xs text-white shadow-inner appearance-none cursor-pointer hover:bg-black/60 transition-all outline-none"
              >
                <option value="" className="bg-neutral-900">📦 Todas Qtds</option>
                {availableQtys.map(q => (
                  <option key={q} value={q} className="bg-neutral-900">{q} unidades</option>
                ))}
              </select>
            )}

            <select value={filterPrice} onChange={e => setFilterPrice(e.target.value)} className="h-12 rounded-2xl border border-white/10 bg-black/40 px-4 text-xs text-white shadow-inner appearance-none cursor-pointer hover:bg-black/60 transition-all outline-none">
              <option value="" className="bg-neutral-900">💵 Preço: Todos</option>
              <option value="<50" className="bg-neutral-900">Faixa: Até R$ 50</option>
              <option value="50-100" className="bg-neutral-900">Faixa: R$ 50 a R$ 100</option>
              <option value=">100" className="bg-neutral-900">Faixa: Acima de R$ 100</option>
            </select>

            <select value={filterUnit} onChange={e => setFilterUnit(e.target.value)} className="h-12 rounded-2xl border border-white/10 bg-black/40 px-4 text-xs text-white shadow-inner appearance-none cursor-pointer hover:bg-black/60 transition-all outline-none">
              <option value="" className="bg-neutral-900">📏 Formato: Todos</option>
              <option value="per_unit" className="bg-neutral-900">Por Unidade/Pacote</option>
              <option value="per_sqm" className="bg-neutral-900">Por Metro Quadrado</option>
            </select>

            <select value={filterPromo} onChange={e => setFilterPromo(e.target.value)} className="h-12 rounded-2xl border border-white/10 bg-black/40 px-4 text-xs text-white shadow-inner appearance-none cursor-pointer hover:bg-black/60 transition-all outline-none">
              <option value="" className="bg-neutral-900">🌟 Ofertas: Todas</option>
              <option value="promo" className="bg-neutral-900">🔥 Apenas Promoções</option>
              <option value="featured" className="bg-neutral-900">⭐ Destaques</option>
            </select>

            <select
              value={sortBy}
              onChange={e => { const p = new URLSearchParams(searchParams); p.set("sort", e.target.value); setSearchParams(p); }}
              className="h-12 rounded-2xl border border-white/10 bg-black/40 px-4 text-xs text-white shadow-inner appearance-none cursor-pointer hover:bg-black/60 transition-all outline-none"
            >
              <option value="relevancia" className="bg-neutral-900">🔀 Ordenar: A-Z</option>
              <option value="menor-preco" className="bg-neutral-900">⬇️ Menor preço</option>
              <option value="maior-preco" className="bg-neutral-900">⬆️ Maior preço</option>
              <option value="recentes" className="bg-neutral-900">⭐ Mais recentes</option>
            </select>
            
            <div className="md:hidden">
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="rounded-xl gap-2 bg-white/10 border-white/20 text-white h-[44px] px-6">
                    <Menu className="w-4 h-4" /> Categorias
                  </Button>
                </SheetTrigger>
                  </Sheet>
                </div>
              </div>
            </div>
          </PageHero>

      {/* Breadcrumb */}
      {(selectedNodeId || search.trim()) && (
        <section className="border-b border-border bg-muted/30">
          <div className="container mx-auto px-4 py-2.5">
            <nav className="flex items-center gap-1.5 text-sm flex-wrap">
              <Link to="/" className="text-muted-foreground hover:text-primary transition-colors"><Home className="w-3.5 h-3.5" /></Link>
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
              <button onClick={() => { setSearch(""); navigateToBreadcrumb(null); }} className="text-muted-foreground hover:text-primary transition-colors">Loja</button>
              {breadcrumb.map((node, i) => (
                <span key={node.id} className="flex items-center gap-1.5">
                  <ChevronRight className="w-3 h-3 text-muted-foreground" />
                  {i < breadcrumb.length - 1 ? (
                    <button onClick={() => navigateToBreadcrumb(node.id)} className="text-muted-foreground hover:text-primary transition-colors">{node.name}</button>
                  ) : (
                    <span className="text-foreground font-medium">{node.name}</span>
                  )}
                </span>
              ))}
              {search.trim() && !selectedNodeId && (
                <>
                  <ChevronRight className="w-3 h-3 text-muted-foreground" />
                  <span className="text-foreground font-medium">Busca: "{search}"</span>
                </>
              )}
            </nav>
          </div>
        </section>
      )}

      {/* Main layout */}
      <section className="py-6 md:py-8">
        <div className="container mx-auto px-4">
          <div className="flex gap-6">
            {/* Desktop sidebar */}
            <aside className="hidden md:block w-64 flex-shrink-0">
              <div className="sticky top-24 glass-card-premium rounded-2xl border border-border p-4 max-h-[calc(100vh-120px)] overflow-y-auto shadow-xl">
                {sidebarTree}
              </div>
            </aside>

            {/* Main content */}
            <main className="flex-1 min-w-0">
              {/* Category Title */}
              {selectedNodeId && (
                <div className="flex items-center justify-between mb-5 pb-4 border-b border-border">
                  <div>
                    <h2 className="font-display text-xl font-bold text-foreground">{selectedNodeName}</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">{filteredProducts.length} produto{filteredProducts.length !== 1 ? "s" : ""}</p>
                  </div>
                </div>
              )}

              {showHome && loading && (
                <div className="space-y-12">
                  {[1, 2].map(s => (
                    <div key={s}>
                      <div className="flex items-center gap-3 mb-5">
                        <div className="w-9 h-9 rounded-lg bg-muted animate-pulse" />
                        <div className="h-6 w-48 bg-muted rounded animate-pulse" />
                        <div className="flex-1 h-px bg-border" />
                      </div>
                      <ProductCardSkeletonGrid count={4} />
                    </div>
                  ))}
                </div>
              )}

              {showHome && !loading && (
                <div className="space-y-12">
                  {/* Best sellers */}
                  {featuredProducts.length > 0 && (
                    <div>
                      <SectionHeader icon={Flame} title="Produtos Mais Vendidos" accent="bg-warning/10 text-warning" />
                      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                        {featuredProducts.map((p, i) => (
                          <StoreProductCard key={p.id} p={p} index={i} getImage={getProductImage} onAdd={handleAddToCart} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Promos */}
                  {promoProducts.length > 0 && (
                    <div>
                      <SectionHeader icon={Tag} title="Promoções" accent="bg-destructive/10 text-destructive" />
                      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                        {promoProducts.map((p, i) => (
                          <StoreProductCard key={p.id} p={p} index={i} getImage={getProductImage} onAdd={handleAddToCart} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Kits */}
                  {kits.length > 0 && (
                    <div id="kits">
                      <SectionHeader icon={BoxIcon} title="Kits Promocionais" accent="bg-primary/10 text-primary" />
                      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {kits.map((kit, i) => {
                          const hasDsc = kit.normal_price > kit.promo_price;
                          const pct = hasDsc ? Math.round((1 - kit.promo_price / kit.normal_price) * 100) : 0;
                      return (
                        <motion.div
                          key={kit.id}
                          initial={{ opacity: 0, y: 30, scale: 0.95 }}
                          whileInView={{ opacity: 1, y: 0, scale: 1 }}
                          viewport={{ once: true }}
                          transition={{ 
                            delay: i * 0.1, 
                            duration: 0.6,
                            ease: [0.22, 1, 0.36, 1] 
                          }}
                          whileHover={{ y: -10, transition: { duration: 0.3 } }}
                          className="glass-card-premium rounded-2xl overflow-hidden group hover:shadow-glow hover:border-primary/40 transition-all duration-300 flex flex-col border-gradient-premium product-card-glow"
                        >
                              <Link to={`/kit/${kit.slug}`} className="block relative">
                                <div className="aspect-[4/3] overflow-hidden bg-muted">
                                  <img src={kit.image_url || "/placeholder.svg"} alt={kit.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                                </div>
                                <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5">
                                  <span className="bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm">KIT</span>
                                  {hasDsc && <span className="bg-destructive text-destructive-foreground text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm">{pct}% OFF</span>}
                                </div>
                              </Link>
                              <div className="p-4 flex flex-col flex-1">
                                <Link to={`/kit/${kit.slug}`}><h3 className="font-display font-bold text-foreground text-sm mb-1 group-hover:text-primary transition-colors line-clamp-2">{kit.name}</h3></Link>
                                {kit.description && <p className="text-[11px] text-muted-foreground mb-2 line-clamp-2">{kit.description}</p>}
                                <div className="mt-auto space-y-3">
                                  <div>
                                    {hasDsc && <span className="text-[11px] line-through text-muted-foreground block">R$ {Number(kit.normal_price).toFixed(2)}</span>}
                                    <span className="font-display font-bold text-xl text-foreground">R$ {Number(kit.promo_price).toFixed(2)}</span>
                                  </div>
                                  <div className="flex gap-2">
                                    <Link to={`/kit/${kit.slug}`} className="flex-1">
                                      <Button variant="outline" size="sm" className="w-full rounded-lg text-xs h-9">Ver kit</Button>
                                    </Link>
                                    <Link to={`/kit/${kit.slug}`}>
                                      <Button variant="highlight" size="sm" className="rounded-lg text-xs h-9 px-3"><ArrowRight className="w-3.5 h-3.5" /></Button>
                                    </Link>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Novidades */}
                  {recentProducts.length > 0 && (
                    <div>
                      <SectionHeader icon={Sparkles} title="Novidades" accent="bg-primary/10 text-primary" />
                      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                        {recentProducts.map((p, i) => (
                          <StoreProductCard key={p.id} p={p} index={i} getImage={getProductImage} onAdd={handleAddToCart} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Fallback */}
                  {allProducts.length === 0 && kits.length === 0 && (
                    <div className="text-center py-20">
                      <FolderOpen className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
                      <h2 className="font-display text-xl font-bold text-foreground mb-2">Loja em construção</h2>
                      <p className="text-muted-foreground text-sm max-w-md mx-auto">Em breve teremos produtos disponíveis. Fique de olho!</p>
                    </div>
                  )}
                </div>
              )}

              {/* Loading */}
              {loading && (selectedNodeId || search.trim()) && (
                <ProductCardSkeletonGrid count={8} />
              )}

              {/* Empty */}
              {!loading && (selectedNodeId || search.trim()) && filteredProducts.length === 0 && (
                <div className="text-center py-20 px-6 glass-card-premium rounded-[3rem] border-dashed border-2 border-border/50 max-w-2xl mx-auto shadow-2xl">
                  <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Search className="w-10 h-10 text-primary animate-pulse" />
                  </div>
                  <h3 className="font-display text-2xl font-black text-foreground mb-3">Nenhum produto encontrado</h3>
                  <p className="text-muted-foreground text-sm mb-10 max-w-md mx-auto leading-relaxed">
                    Não encontramos exatamente o que você buscou ("{search}"), mas nossa equipe pode desenvolver um projeto personalizado para você agora mesmo.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button 
                      variant="highlight" 
                      className="rounded-2xl h-14 px-8 font-black uppercase text-xs tracking-widest shadow-glow hover:shadow-glow-strong transition-all"
                      onClick={() => window.dispatchEvent(new CustomEvent("open-chat"))}
                    >
                      <Sparkles className="w-4 h-4 mr-2" /> Falar com Especialista
                    </Button>
                    <Button 
                      variant="outline" 
                      className="rounded-2xl h-14 px-8 font-bold text-xs uppercase tracking-widest border-border hover:bg-muted transition-all"
                      onClick={() => { setSearch(""); navigateToBreadcrumb(null); }}
                    >
                      Ver Tudo
                    </Button>
                  </div>
                </div>
              )}

              {/* Products grid */}
              {!loading && filteredProducts.length > 0 && (selectedNodeId || search.trim()) && (
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                  {filteredProducts.map((p, i) => (
                    <StoreProductCard key={p.id} p={p} index={i} getImage={getProductImage} onAdd={handleAddToCart} />
                  ))}
                </div>
              )}
            </main>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
};

export default Loja;
