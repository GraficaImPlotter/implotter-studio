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
  Search, Plus, LayoutDashboard, Database
} from "lucide-react";
import { cn } from "@/lib/utils";

export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
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

  const runCommand = React.useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, []);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <div className="flex items-center px-4 border-b border-border/50">
         <Search className="w-4 h-4 text-muted-foreground mr-2 shrink-0" />
         <CommandInput 
          placeholder="Busque por pedido, cliente ou ação rápida..." 
          className="h-14 border-0 focus:ring-0 text-sm"
         />
      </div>
      <CommandList className="scrollbar-thin scrollbar-thumb-white/5 bg-card/50 backdrop-blur-xl">
        <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">Nenhum resultado encontrado.</CommandEmpty>
        
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
          <CommandItem onSelect={() => runCommand(() => navigate("/admin/crm"))} className="rounded-xl px-4 h-11 aria-selected:bg-primary/10">
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
