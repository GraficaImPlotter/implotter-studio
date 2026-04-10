import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { generateOrderLabel } from "@/lib/production-label";
import type { LabelOrder, LabelItem } from "@/lib/production-label";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ChevronRight, ChevronLeft, Search, Package, Clock, User, Hash,
  Layers, Printer, Scissors, CheckCircle2, Truck, Palette, Tag,
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type OrderStatus = Database["public"]["Enums"]["order_status"];

interface OrderWithItems {
  id: string;
  order_number: number;
  customer_name: string;
  status: OrderStatus;
  created_at: string;
  notes: string | null;
  total: number;
  order_items: { product_name: string; quantity: number; item_width: number | null; item_height: number | null; item_area: number | null; instructions: string | null; pricing_type: string | null }[];
}

const PRODUCTION_STAGES: { key: string; label: string; statuses: OrderStatus[]; icon: React.ElementType; color: string }[] = [
  { key: "fila", label: "Fila de Produção", statuses: ["aprovado_producao"], icon: Layers, color: "bg-blue-500/10 text-blue-400 border-blue-500/30" },
  { key: "arte", label: "Arte em Análise", statuses: ["aguardando_arte", "arte_em_conferencia"], icon: Palette, color: "bg-purple-500/10 text-purple-400 border-purple-500/30" },
  { key: "impressao", label: "Em Impressão", statuses: ["em_producao"], icon: Printer, color: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
  { key: "acabamento", label: "Em Acabamento", statuses: ["em_acabamento"], icon: Scissors, color: "bg-orange-500/10 text-orange-400 border-orange-500/30" },
  { key: "pronto", label: "Pronto", statuses: ["pronto_envio"], icon: CheckCircle2, color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
  { key: "entregue", label: "Entregue", statuses: ["finalizado"], icon: Truck, color: "bg-muted text-muted-foreground border-border" },
];

const ALL_PROD_STATUSES: OrderStatus[] = PRODUCTION_STAGES.flatMap((s) => s.statuses);

import { ORDER_STATUS_LABELS as STATUS_LABEL } from "@/lib/order-status";

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
  });

  const moveMutation = useMutation({
    mutationFn: async ({ orderId, newStatus }: { orderId: string; newStatus: OrderStatus }) => {
      const { error } = await supabase.from("orders").update({ status: newStatus }).eq("id", orderId);
      if (error) throw error;
      await supabase.from("order_status_history").insert({ order_id: orderId, status: newStatus, notes: "Movido no painel de produção" });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["production-orders"] });
      toast({ title: "Pedido movido com sucesso" });
    },
    onError: () => toast({ title: "Erro ao mover pedido", variant: "destructive" }),
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return orders;
    const q = search.toLowerCase();
    return orders.filter(
      (o) =>
        o.customer_name.toLowerCase().includes(q) ||
        String(o.order_number).includes(q) ||
        o.order_items.some((i) => i.product_name.toLowerCase().includes(q))
    );
  }, [orders, search]);

  const getNextStatus = (currentStageIdx: number): OrderStatus | null => {
    const next = PRODUCTION_STAGES[currentStageIdx + 1];
    return next ? next.statuses[0] : null;
  };

  const getPrevStatus = (currentStageIdx: number): OrderStatus | null => {
    const prev = PRODUCTION_STAGES[currentStageIdx - 1];
    return prev ? prev.statuses[0] : null;
  };

  const stageCount = (statuses: OrderStatus[]) => filtered.filter((o) => statuses.includes(o.status)).length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Painel de Produção</h1>
            <p className="text-muted-foreground text-sm">Acompanhe e mova pedidos entre etapas</p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar pedido, cliente..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </div>

        {/* Summary badges */}
        <div className="flex flex-wrap gap-2">
          {PRODUCTION_STAGES.map((stage) => (
            <Badge key={stage.key} variant="outline" className={`${stage.color} border text-xs px-3 py-1`}>
              <stage.icon className="h-3 w-3 mr-1.5" />
              {stage.label}: {stageCount(stage.statuses)}
            </Badge>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-highlight border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4">
            {PRODUCTION_STAGES.map((stage, stageIdx) => {
              const stageOrders = filtered.filter((o) => stage.statuses.includes(o.status));
              return (
                <div key={stage.key} className="flex flex-col">
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-t-xl border ${stage.color} font-semibold text-sm`}>
                    <stage.icon className="h-4 w-4" />
                    {stage.label}
                    <span className="ml-auto bg-background/50 rounded-full px-2 py-0.5 text-xs">{stageOrders.length}</span>
                  </div>
                  <div className="flex-1 bg-muted/30 border border-t-0 border-border rounded-b-xl p-2 space-y-2 min-h-[200px]">
                    {stageOrders.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-8">Nenhum pedido</p>
                    )}
                    {stageOrders.map((order) => {
                      const daysAgo = differenceInDays(new Date(), new Date(order.created_at));
                      return (
                        <Card key={order.id} className="border-border bg-card shadow-sm">
                          <CardHeader className="p-3 pb-1">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                                <Hash className="h-3.5 w-3.5 text-highlight" />
                                {order.order_number}
                              </CardTitle>
                              <Badge variant="outline" className="text-[10px]">
                                {STATUS_LABEL[order.status] || order.status}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="p-3 pt-1 space-y-1.5">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <User className="h-3 w-3" /> {order.customer_name}
                            </div>
                            {order.order_items.slice(0, 2).map((item, i) => (
                              <div key={i} className="flex items-center gap-1.5 text-xs">
                                <Package className="h-3 w-3 text-muted-foreground" />
                                <span className="truncate">{item.product_name}</span>
                                <span className="text-muted-foreground ml-auto">x{item.quantity}</span>
                              </div>
                            ))}
                            {order.order_items.length > 2 && (
                              <p className="text-[10px] text-muted-foreground">+{order.order_items.length - 2} itens</p>
                            )}
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {format(new Date(order.created_at), "dd/MM", { locale: ptBR })}
                              {daysAgo > 0 && <span className={daysAgo > 5 ? "text-destructive font-semibold" : ""}>({daysAgo}d)</span>}
                            </div>
                            <div className="flex gap-1 pt-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs"
                                title="Etiqueta"
                                onClick={() => {
                                  const lo: LabelOrder = { id: order.id, order_number: order.order_number, customer_name: order.customer_name, customer_phone: (order as any).customer_phone, status: order.status, created_at: order.created_at, notes: order.notes };
                                  const li: LabelItem[] = order.order_items.map(i => ({ product_name: i.product_name, quantity: i.quantity, item_width: i.item_width, item_height: i.item_height, item_area: i.item_area, instructions: i.instructions, pricing_type: i.pricing_type }));
                                  generateOrderLabel(lo, li);
                                }}
                              >
                                <Tag className="h-3 w-3" />
                              </Button>
                              {stageIdx > 0 && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-xs"
                                  disabled={moveMutation.isPending}
                                  onClick={() => moveMutation.mutate({ orderId: order.id, newStatus: getPrevStatus(stageIdx)! })}
                                >
                                  <ChevronLeft className="h-3 w-3" />
                                </Button>
                              )}
                              {stageIdx < PRODUCTION_STAGES.length - 1 && (
                                <Button
                                  size="sm"
                                  variant="default"
                                  className="h-7 px-2 text-xs flex-1"
                                  disabled={moveMutation.isPending}
                                  onClick={() => moveMutation.mutate({ orderId: order.id, newStatus: getNextStatus(stageIdx)! })}
                                >
                                  Avançar <ChevronRight className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
