import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, Package, Clock, User, Hash, Printer, Scissors, 
  CheckCircle2, Truck, Palette, Tag, Layers, ChevronRight, ChevronLeft,
  Calendar, Info, AlertTriangle
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { generateOrderLabel } from "@/lib/production-label";
import { ORDER_STATUS_LABELS } from "@/lib/order-status";
import { KanbanBoard, KanbanColumn } from "@/components/admin/KanbanBoard";
import { Database } from "@/integrations/supabase/types";

type OrderStatus = Database["public"]["Enums"]["order_status"];

interface OrderWithItems {
  id: string;
  order_number: number;
  customer_name: string;
  customer_phone: string | null;
  status: OrderStatus;
  created_at: string;
  notes: string | null;
  total: number;
  order_items: { 
    product_name: string; 
    quantity: number; 
    item_width: number | null; 
    item_height: number | null; 
    item_area: number | null; 
    instructions: string | null; 
    pricing_type: string | null 
  }[];
}

const PRODUCTION_COLUMNS: KanbanColumn[] = [
  { id: "fila", title: "Fila de Produção", icon: Layers, statusKeys: ["aprovado_producao"], className: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  { id: "arte", title: "Arte & Conferência", icon: Palette, statusKeys: ["aguardando_arte", "arte_em_conferencia"], className: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  { id: "impressao", title: "Em Impressão", icon: Printer, statusKeys: ["em_producao"], className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  { id: "acabamento", title: "Em Acabamento", icon: Scissors, statusKeys: ["em_acabamento"], className: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
  { id: "pronto", title: "Pronto para Envio", icon: CheckCircle2, statusKeys: ["pronto_envio"], className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  { id: "entregue", title: "Finalizado", icon: Truck, statusKeys: ["finalizado"], className: "bg-muted text-muted-foreground border-border/50" },
];

const ALL_PROD_STATUSES: OrderStatus[] = PRODUCTION_COLUMNS.flatMap(c => c.statusKeys as OrderStatus[]);

export default function AdminProducao() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["production-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, customer_name, customer_phone, status, created_at, notes, total, order_items(product_name, quantity, item_width, item_height, item_area, instructions, pricing_type)")
        .in("status", ALL_PROD_STATUSES)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as OrderWithItems[];
    },
    refetchInterval: 30000,
  });

  const moveMutation = useMutation({
    mutationFn: async ({ orderId, newStatus }: { orderId: string; newStatus: OrderStatus }) => {
      const { error } = await supabase.from("orders").update({ status: newStatus }).eq("id", orderId);
      if (error) throw error;
      await supabase.from("order_status_history").insert({ order_id: orderId, status: newStatus, notes: "Movido no Kanban de Produção" }).catch(() => {});
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["production-orders"] });
      toast({ title: "Status atualizado!" });
    },
    onError: (err: any) => toast({ title: "Erro ao mover", description: err.message, variant: "destructive" }),
  });

  const filtered = orders.filter(o => 
    search === "" || 
    o.customer_name.toLowerCase().includes(search.toLowerCase()) || 
    o.order_number.toString().includes(search)
  );

  const renderOrderCard = (order: OrderWithItems) => {
    const daysAgo = differenceInDays(new Date(), new Date(order.created_at));
    const isLate = daysAgo > 3;

    return (
      <div className="bg-card border border-white/5 rounded-2xl p-4 shadow-xl hover:border-primary/20 transition-all group overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 grayscale group-hover:grayscale-0 transition-all">
             <div className="w-8 h-8 rounded-lg bg-highlight/10 flex items-center justify-center text-highlight font-black text-[10px] border border-highlight/20">
                #{order.order_number.toString().slice(-3)}
             </div>
             <span className="font-display font-black text-xs tracking-tight">PEDIDO {order.order_number}</span>
          </div>
          {isLate && (
            <div className="w-6 h-6 rounded-full bg-destructive/10 flex items-center justify-center text-destructive animate-pulse">
               <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          )}
        </div>

        <div className="space-y-3 mb-4">
          <div className="flex items-center gap-2 text-muted-foreground">
             <User className="w-3 h-3 text-primary" />
             <span className="text-[11px] font-bold truncate max-w-[180px] text-foreground">{order.customer_name}</span>
          </div>
          <div className="space-y-1.5">
             {order.order_items.map((item, idx) => (
               <div key={idx} className="flex items-center gap-2 bg-secondary/30 px-2 py-1.5 rounded-lg border border-white/5">
                  <Package className="w-3 h-3 text-muted-foreground" />
                  <span className="text-[10px] font-bold truncate flex-1">{item.product_name}</span>
                  <span className="text-[10px] bg-background px-1.5 py-0.5 rounded font-black">x{item.quantity}</span>
               </div>
             ))}
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-border/50">
           <div className="flex flex-col">
              <span className="text-[9px] font-black text-muted-foreground uppercase opacity-60">Entrada</span>
              <div className="flex items-center gap-1 text-[10px] font-bold">
                 <Calendar className="w-3 h-3 opacity-50" />
                 {format(new Date(order.created_at), "dd/MM", { locale: ptBR })}
                 {daysAgo > 0 && <span className={isLate ? "text-destructive" : "text-muted-foreground"}>({daysAgo}d)</span>}
              </div>
           </div>

           <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg hover:bg-highlight/10 hover:text-highlight" onClick={() => generateOrderLabel(order as any, order.order_items as any)}>
                 <Tag className="w-3.5 h-3.5" />
              </Button>
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-7 w-7 rounded-lg hover:bg-highlight/10 hover:text-highlight" 
                onClick={() => {
                  const itemsSummary = order.order_items.map(it => `${it.product_name} (x${it.quantity})`).join(", ");
                  toast({
                    title: `Pedido #${order.order_number}`,
                    description: `Itens: ${itemsSummary}${order.notes ? `\n\nObs: ${order.notes}` : ""}`,
                  });
                }}
              >
                 <Info className="w-3.5 h-3.5" />
              </Button>
           </div>
        </div>
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl font-black text-foreground tracking-tighter uppercase mb-1">
              Produção <span className="text-highlight">Board</span>
            </h1>
            <p className="text-muted-foreground text-sm font-medium">Controle tátil de fluxo de oficina e acabamentos</p>
          </div>
          <div className="relative w-full md:w-80 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-highlight transition-colors" />
            <Input 
              placeholder="Localizar pedido ou cliente..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              className="pl-10 h-12 bg-card border-white/5 rounded-2xl focus:ring-2 focus:ring-highlight/20 transition-all font-medium" 
            />
          </div>
        </div>

        <KanbanBoard
          columns={PRODUCTION_COLUMNS}
          items={filtered}
          renderCard={renderOrderCard}
          onMove={async (id, status) => { await moveMutation.mutateAsync({ orderId: id, newStatus: status as OrderStatus }); }}
          getItemStatus={(o) => o.status}
          getItemId={(o) => o.id}
          isLoading={isLoading}
        />
      </div>
    </AdminLayout>
  );
}
