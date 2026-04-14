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
  Home, Ruler, FolderOpen, Menu, Package, BoxIcon, Clock,
  Sparkles, Flame, Tag, Check
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

/* ─── Sidebar Content (New Filter System) ─── */
const SidebarFilters = ({ 
  categories, 
  onSelectCategory, 
  selectedCategoryId,
  filters,
  setFilter
}: { 
  categories: any[]; 
  onSelectCategory: (id: string) => void;
  selectedCategoryId: string | null;
  filters: Record<string, string[]>;
  setFilter: (key: string, val: string) => void;
  availableOptions: Record<string, string[]>;
}) => {
  const [searchCat, setSearchCat] = useState("");
  
  return (
    <div className="space-y-6">
      {/* Search Category */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-foreground font-display">Produto</h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input 
            placeholder="Buscar produto" 
            value={searchCat} 
            onChange={e => setSearchCat(e.target.value)}
            className="pl-9 h-9 text-xs bg-secondary/30 border-border rounded-lg"
          />
        </div>
        <div className="space-y-1 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
          {categories.filter(c => c.name.toLowerCase().includes(searchCat.toLowerCase())).map(c => (
            <button
              key={c.id}
              onClick={() => onSelectCategory(c.id)}
              className={`w-full flex items-center justify-between text-left px-2 py-2 rounded-lg transition-all group
                ${selectedCategoryId === c.id ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-muted text-muted-foreground hover:text-foreground'}`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${selectedCategoryId === c.id ? 'bg-primary border-primary' : 'border-muted-foreground/30'}`}>
                  {selectedCategoryId === c.id && <Check className="w-3 h-3 text-white" strokeWidth={4} />}
                </div>
                <span className="text-[13px]">{c.name}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Attribute Filters (Material, Cor, Formato) */}
      {['Material', 'Cor', 'Formato'].map(attr => (
        <div key={attr} className="space-y-3 pt-6 border-t border-border/50">
          <h3 className="text-sm font-bold text-foreground font-display">{attr}</h3>
          
          <div className="flex flex-wrap gap-2">
            {(availableOptions[attr] || []).length > 0 ? (
              availableOptions[attr].map(val => {
                const isSelected = filters[attr]?.includes(val);
                return (
                  <button
                    key={val}
                    onClick={() => setFilter(attr, val)}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border
                      ${isSelected 
                        ? 'bg-primary border-primary text-white shadow-glow-sm' 
                        : 'bg-secondary/30 border-border text-muted-foreground hover:border-primary/30 hover:text-foreground'}`}
                  >
                    {val}
                  </button>
                );
              })
            ) : (
              <p className="text-[11px] text-muted-foreground italic px-2">Nenhuma opção disponível</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

/* ─── Main page ─── */
const Loja = () => {
  const { toast } = useToast();
  const { addItem } = useCart();
  const [searchParams, setSearchParams] = useSearchParams();
  const [allNodes, setAllNodes] = useState<CatalogNode[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({
    "Material": [],
    "Cor": [],
    "Formato": []
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const selectedNodeId = searchParams.get("node") || null;
  const sortBy = searchParams.get("sort") || "relevancia";

  const load = useCallback(async () => {
    setLoading(true);
    const { data: nodes } = await supabase.from("catalog_nodes").select("*").eq("is_active", true).order("name");
    const nodesList = (nodes ?? []) as CatalogNode[];
    setAllNodes(nodesList);

    const PUBLIC_PRODUCT_COLS = "id, name, slug, short_description, price, sale_price, pricing_type, sale_unit, price_per_sqm, catalog_node_id, category_id, is_active, is_featured, estimated_days, color_mode, default_quantity, sort_order, created_at, updated_at, product_images(image_url, sort_order)";
    let q = supabase.from("products").select(PUBLIC_PRODUCT_COLS).eq("is_active", true);
    
    const nodeId = new URLSearchParams(window.location.search).get("node");
    if (nodeId) {
      const getDescendants = (id: string): string[] => {
        const children = nodesList.filter(n => n.parent_id === id);
        let ids = children.map(c => c.id);
        children.forEach(c => { ids = [...ids, ...getDescendants(c.id)]; });
        return ids;
      };
      const allCategoryIds = [nodeId, ...getDescendants(nodeId)];
      q = q.in("catalog_node_id", allCategoryIds);
    }

    const searchTerm = search.trim();
    if (searchTerm) q = q.ilike("name", `%${searchTerm}%`);

    if (sortBy === "menor-preco") q = q.order("price", { ascending: true });
    else if (sortBy === "maior-preco") q = q.order("price", { ascending: false });
    else q = q.order("name");

    try {
      const { data, error } = await q;
      if (error) {
        console.error("Erro ao buscar produtos:", error);
        setProducts([]);
      } else {
        setProducts(data ?? []);
      }
    } catch (err) {
      console.error("Erro inesperado:", err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [search, sortBy]);

  useEffect(() => { load(); }, [selectedNodeId, sortBy, search, load]);

  const availableFilters = useMemo(() => {
    const opts: Record<string, Set<string>> = { "Material": new Set(), "Cor": new Set(), "Formato": new Set() };
    products.forEach(p => {
      if (Array.isArray(p.configuration_schema)) {
        p.configuration_schema.forEach((attr: any) => {
          if (['Material', 'Cor', 'Formato'].includes(attr.label) && Array.isArray(attr.options)) {
            attr.options.forEach((opt: any) => opts[attr.label].add(opt.name));
          }
        });
      }
    });
    return {
      "Material": Array.from(opts["Material"]).sort(),
      "Cor": Array.from(opts["Cor"]).sort(),
      "Formato": Array.from(opts["Formato"]).sort(),
    };
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      for (const [attr, selectedVals] of Object.entries(activeFilters)) {
        if (selectedVals.length === 0) continue;
        const productHasAttr = p.configuration_schema?.some((schemaAttr: any) => {
          return schemaAttr.label === attr && schemaAttr.options?.some((opt: any) => selectedVals.includes(opt.name));
        });
        if (!productHasAttr) return false;
      }
      return true;
    });
  }, [products, activeFilters]);

  const toggleFilter = (key: string, val: string) => {
    setActiveFilters(prev => {
      const current = prev[key] || [];
      const next = current.includes(val) 
        ? current.filter(v => v !== val)
        : [...current, val];
      return { ...prev, [key]: next };
    });
  };

  const findRootNodeName = useCallback((nodeId: string | null) => {
    if (!nodeId || allNodes.length === 0) return "";
    let current = allNodes.find(n => n.id === nodeId);
    let depth = 0;
    while (current && current.parent_id && depth < 5) {
      const parent = allNodes.find(n => n.id === current?.parent_id);
      if (!parent) break;
      current = parent;
      depth++;
    }
    return current?.name || "";
  }, [allNodes]);

  const selectedNodeName = useMemo(() => selectedNodeId ? allNodes.find(n => n.id === selectedNodeId)?.name : null, [allNodes, selectedNodeId]);

  const navigateToBreadcrumb = (nodeId: string | null) => {
    const p = new URLSearchParams(searchParams);
    if (!nodeId) p.delete("node"); else p.set("node", nodeId);
    setSearchParams(p);
  };

  const roots = useMemo(() => allNodes.filter(n => !n.parent_id).sort((a, b) => a.name.localeCompare(b.name, "pt-BR")), [allNodes]);

  const getProductImage = (p: any) => {
    const imgs = p.product_images?.sort((a: any, b: any) => a.sort_order - b.sort_order);
    return imgs?.[0]?.image_url || "/placeholder.svg";
  };

  return (
    <PublicLayout>
      <SEOHead 
        title={selectedNodeName ? `${selectedNodeName} | Catálogo` : "Loja de Impressos | Gráfica ImPlotter"} 
        description="Explore nosso catálogo completo de materiais gráficos premium." 
      />

      <section className="py-8 md:py-12 bg-white min-h-screen">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex flex-col md:flex-row gap-12">
            
            {/* Sidebar Desktop */}
            <aside className="hidden lg:block w-72 flex-shrink-0">
              <div className="sticky top-24 bg-white rounded-[2rem] border border-border/60 p-8 shadow-sm">
                <SidebarFilters 
                  categories={roots}
                  onSelectCategory={id => navigateToBreadcrumb(id)}
                  selectedCategoryId={selectedNodeId}
                  filters={activeFilters}
                  setFilter={toggleFilter}
                  availableOptions={availableFilters}
                />
              </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1">
              {/* Banner */}
              <div className="relative rounded-[2.5rem] overflow-hidden bg-slate-50 border border-border/40 min-h-[180px] md:min-h-[220px] flex items-center px-8 md:px-12 mb-10 group">
                <div className="relative z-10 max-w-lg">
                  <h1 className="font-display text-3xl md:text-5xl font-black text-foreground mb-4 tracking-tight leading-tight">
                    {selectedNodeName || "Nossa Loja"}
                  </h1>
                  <p className="text-sm md:text-base text-muted-foreground font-medium max-w-md">
                    Impressão premium com acabamento profissional para elevar o nível do seu negócio.
                  </p>
                </div>
                {/* Decoration */}
                <div className="absolute right-0 top-0 bottom-0 w-1/2 hidden lg:block overflow-hidden">
                   <div className="absolute inset-0 bg-gradient-to-l from-slate-100 to-transparent z-10" />
                   {selectedNodeId && allNodes.find(n => n.id === selectedNodeId)?.image_url && (
                      <img 
                        src={allNodes.find(n => n.id === selectedNodeId)!.image_url!} 
                        className="w-full h-full object-contain p-8 rotate-6 scale-110 opacity-80 group-hover:scale-125 transition-transform duration-1000" 
                        alt="" 
                      />
                   )}
                </div>
              </div>

              {/* Stats & Sort Bar */}
              <div className="flex items-center justify-between mb-8 pb-6 border-b border-border/50">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <p className="text-xs md:text-sm text-muted-foreground font-medium">
                      Exibindo <span className="text-foreground font-bold">{filteredProducts.length}</span> produtos
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground font-bold uppercase tracking-widest hidden sm:inline">Ordenar</span>
                    <select
                      value={sortBy}
                      onChange={e => { const p = new URLSearchParams(searchParams); p.set("sort", e.target.value); setSearchParams(p); }}
                      className="bg-secondary/50 border border-border rounded-xl px-4 py-2 text-xs md:text-sm font-bold text-foreground outline-none cursor-pointer focus:ring-2 focus:ring-primary/20 transition-all hover:bg-secondary"
                    >
                      <option value="relevancia">Relevância (A-Z)</option>
                      <option value="menor-preco">Menor preço</option>
                      <option value="maior-preco">Maior preço</option>
                    </select>
                  </div>
              </div>

              {/* Grid */}
              {loading ? (
                <ProductCardSkeletonGrid count={6} />
              ) : products.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                  {filteredProducts.map((p, i) => (
                    <div key={p.id} className="flex h-full">
                      <StoreProductCard 
                        p={p} 
                        index={i} 
                        getImage={getProductImage} 
                        onAdd={(p) => {
                          const img = getProductImage(p);
                          addItem({ productId: p.id, name: p.name, price: Number(p.sale_price || p.price), quantity: 1, image: img });
                          toast({ title: "Adicionado!", description: `${p.name} está no carrinho.` });
                        }} 
                        categoryName={findRootNodeName(p.catalog_node_id)}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-24 px-6 bg-slate-50/50 rounded-[3rem] border-dashed border-2 border-border/50 max-w-2xl mx-auto">
                  <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                    <Search className="w-10 h-10 text-muted-foreground/20" />
                  </div>
                  <h3 className="font-display text-2xl font-bold text-foreground mb-3">Nenhum produto aqui</h3>
                  <p className="text-muted-foreground text-sm mb-8">Tente ajustar seus filtros ou buscar por outro termo.</p>
                  <Button variant="outline" onClick={() => { setSearch(""); navigateToBreadcrumb(null); }} className="rounded-xl px-8 h-12 font-bold">Ver Todo Catálogo</Button>
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
