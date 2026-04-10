import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

export const useRealtimeAlerts = () => {
  const { toast } = useToast();
  const { isAdmin } = useAuth();

  useEffect(() => {
    if (!isAdmin) return;

    const ordersChannel = supabase
      .channel("admin-orders-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload) => {
          const order = payload.new as any;
          toast({
            title: "🛒 Novo Pedido!",
            description: `Pedido #${order.order_number} de ${order.customer_name} — R$ ${Number(order.total).toFixed(2)}`,
          });
        }
      )
      .subscribe();

    const leadsChannel = supabase
      .channel("admin-leads-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "leads" },
        (payload) => {
          const lead = payload.new as any;
          toast({
            title: "📩 Novo Lead!",
            description: `${lead.name}${lead.email ? ` — ${lead.email}` : ""}`,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(leadsChannel);
    };
  }, [isAdmin, toast]);
};
