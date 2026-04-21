import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { 
  Users, ShoppingCart, Settings, Package, 
  MessageSquare, UserPlus, Factory, BarChart3,
  Search, Plus, LayoutDashboard, Database, Loader2,
  Calendar, Hash, Tag, Calculator
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeSearchInput } from "@/lib/sanitize-search";
import { format } from "date-fns";

export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [results, setResults] = React.useState<{
    orders: any[];
    profiles: any[];
    products: any[];
  }>({ orders: [], profiles: [], products: [] });
  const navigate = useNavigate();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    }
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  React.useEffect(() => {
    if (!query || query.length < 2) {
      setResults({ orders: [], profiles: [], products: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      const safeQuery = sanitizeSearchInput(query);
      
      try {
        const [ordersRes, profilesRes, productsRes] = await Promise.all([
          supabase.from("orders").select("id, order_number, customer_name, total, created_at").or(`customer_name.ilike.%${safeQuery}%,order_number.astext.ilike.%${safeQuery}%`).limit(5),
          supabase.from("profiles").select("id, full_name, email").ilike("full_name", `%${safeQuery}%`).limit(5),
          supabase.from("products").select("id, name, price").ilike("name", `%${safeQuery}%`).eq("is_active", true).limit(5)
        ]);

        setResults({
          orders: ordersRes.data || [],
          profiles: profilesRes.data || [],
          products: productsRes.data || []
        });
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const runCommand = React.useCallback((command: () => void) => {
    setOpen(false);
    setQuery("");
    command();
  }, []);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <div className="flex items-center px-4 border-b border-border/50 relative">
         {loading ? (
           <Loader2 className="w-4 h-4 text-primary animate-spin mr-2 shrink-0" />
         ) : (
           <Search className="w-4 h-4 text-muted-foreground mr-2 shrink-0" />
         )}
         <CommandInput 
          placeholder="Busque por pedido, cliente ou ação rápida..." 
          className="h-14 border-0 focus:ring-0 text-sm w-full"
          value={query}
          onValueChange={setQuery}
         />
      </div>
      <CommandList className="scrollbar-thin scrollbar-thumb-white/5 bg-card/50 backdrop-blur-xl">
        <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
          {loading ? "Buscando resultados..." : "Nenhum resultado encontrado."}
        </CommandEmpty>

        {/* Dynamic Search Results */}
        {(results.orders.length > 0 || results.profiles.length > 0 || results.products.length > 0) && (
          <>
            {results.orders.length > 0 && (
              <CommandGroup heading="Pedidos Encontrados" className="px-2 pb-2">
                {results.orders.map((o) => (
                  <CommandItem key={o.id} onSelect={() => runCommand(() => navigate(`/admin/pedidos`))} className="rounded-xl px-4 h-14 aria-selected:bg-primary/10 flex items-center justify-between">
                    <div className="flex items-center">
                      <Hash className="mr-3 h-4 w-4 text-highlight" />
                      <div className="flex flex-col">
                        <span className="font-bold text-sm tracking-tight">#{o.order_number} - {o.customer_name}</span>
                        <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest flex items-center gap-2">
                          <Calendar className="w-3 h-3" /> {format(new Date(o.created_at), "dd/MM/yy")} | R$ {Number(o.total).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {results.profiles.length > 0 && (
              <CommandGroup heading="Clientes Encontrados" className="px-2 pb-2">
                {results.profiles.map((p) => (
                  <CommandItem key={p.id} onSelect={() => runCommand(() => navigate(`/admin/cliente/${p.id}`))} className="rounded-xl px-4 h-12 aria-selected:bg-primary/10 flex items-center">
                    <Users className="mr-3 h-4 w-4 text-primary" />
                    <div className="flex flex-col">
                      <span className="font-bold text-sm">{p.full_name || "Cliente sem nome"}</span>
                      <span className="text-[10px] text-muted-foreground">{p.email}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {results.products.length > 0 && (
              <CommandGroup heading="Produtos Encontrados" className="px-2 pb-2">
                {results.products.map((p) => (
                  <CommandItem key={p.id} onSelect={() => runCommand(() => navigate(`/admin/produtos`))} className="rounded-xl px-4 h-12 aria-selected:bg-primary/10 flex items-center justify-between">
                    <div className="flex items-center">
                      <Tag className="mr-3 h-4 w-4 text-amber-500" />
                      <span className="font-bold text-sm">{p.name}</span>
                    </div>
                    <span className="text-[10px] font-black text-highlight">R$ {Number(p.price).toFixed(2)}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            <CommandSeparator className="bg-border/30 my-2" />
          </>
        )}
        
        <CommandGroup heading="Navegação Rápida" className="px-2 pb-2">
          <CommandItem onSelect={() => runCommand(() => navigate("/admin"))} className="rounded-xl px-4 h-11 aria-selected:bg-primary/10">
            <LayoutDashboard className="mr-3 h-4 w-4 text-highlight" />
            <span className="font-semibold text-sm">Dashboard</span>
            <CommandShortcut>D</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/admin/pedidos"))} className="rounded-xl px-4 h-11 aria-selected:bg-primary/10">
            <ShoppingCart className="mr-3 h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">Pedidos</span>
            <CommandShortcut>P</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/admin/carrinhos-abandonados"))} className="rounded-xl px-4 h-11 aria-selected:bg-primary/10">
            <ShoppingCart className="mr-3 h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">Carrinhos Abandonados</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/admin/calculadora"))} className="rounded-xl px-4 h-11 aria-selected:bg-success/10">
            <Calculator className="mr-3 h-4 w-4 text-success" />
            <span className="font-semibold text-sm">Calculadora de Preços</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/admin/crm"))} className="rounded-xl px-4 h-11 aria-selected:bg-highlight-glow">
            <MessageSquare className="mr-3 h-4 w-4 text-highlight-glow" />
            <span className="font-semibold text-sm">CRM Pipeline</span>
            <CommandShortcut>C</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/admin/produtos"))} className="rounded-xl px-4 h-11 aria-selected:bg-primary/10">
            <Package className="mr-3 h-4 w-4 text-amber-500" />
            <span className="font-semibold text-sm">Produtos</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator className="bg-border/30" />

        <CommandGroup heading="Ações Rápidas" className="px-2 pb-2 mt-2">
          <CommandItem onSelect={() => runCommand(() => navigate("/admin/vendas-manuais"))} className="rounded-xl px-4 h-11 aria-selected:bg-success/10">
            <Plus className="mr-3 h-4 w-4 text-success" />
            <span className="font-semibold text-sm">Nova Venda Manual</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/admin/leads"))} className="rounded-xl px-4 h-11 aria-selected:bg-primary/10">
            <UserPlus className="mr-3 h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">Gerenciar Leads</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/admin/producao"))} className="rounded-xl px-4 h-11 aria-selected:bg-highlight/10">
            <Factory className="mr-3 h-4 w-4 text-highlight" />
            <span className="font-semibold text-sm">Painel de Produção</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator className="bg-border/30" />

        <CommandGroup heading="Configurações & Sistema" className="px-2 pb-2 mt-2">
          <CommandItem onSelect={() => runCommand(() => navigate("/admin/configuracoes"))} className="rounded-xl px-4 h-11 aria-selected:bg-secondary">
            <Settings className="mr-3 h-4 w-4 text-muted-foreground" />
            <span className="font-semibold text-sm">Preferências do Sistema</span>
            <CommandShortcut>S</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/admin/relatorios"))} className="rounded-xl px-4 h-11 aria-selected:bg-secondary">
            <BarChart3 className="mr-3 h-4 w-4 text-muted-foreground" />
            <span className="font-semibold text-sm">Relatórios Avançados</span>
          </CommandItem>
          <CommandItem className="rounded-xl px-4 h-11 opacity-50 cursor-not-allowed">
            <Database className="mr-3 h-4 w-4 text-muted-foreground" />
            <span className="font-semibold text-sm">Logs de Segurança</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
      
      <div className="p-3 border-t border-border/50 bg-secondary/30">
         <p className="text-[10px] text-center text-muted-foreground font-black uppercase tracking-[0.2em]">
            Pressione <kbd className="font-sans px-1.5 py-0.5 rounded border border-border bg-card">esc</kbd> para fechar
         </p>
      </div>
    </CommandDialog>
  );
}
