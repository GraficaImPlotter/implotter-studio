import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";

type OrderStatus = Database["public"]["Enums"]["order_status"];

export interface OrderFilters {
  searchTerm?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

export const useOrders = (filters: OrderFilters) => {
  return useQuery({
    queryKey: ["orders", filters],
    queryFn: async () => {
      let q = supabase.from("orders").select("*").order("created_at", { ascending: false });

      if (filters.status) q = q.eq("status", filters.status as OrderStatus);
      if (filters.dateFrom) q = q.gte("created_at", `${filters.dateFrom}T00:00:00Z`);
      if (filters.dateTo) q = q.lte("created_at", `${filters.dateTo}T23:59:59Z`);
      
      if (filters.searchTerm) {
        const safe = filters.searchTerm.trim();
        const isNumber = !isNaN(Number(safe)) && safe !== "";
        if (isNumber) {
          q = q.or(`customer_name.ilike.%${safe}%,customer_email.ilike.%${safe}%,order_number.eq.${Number(safe)}`);
        } else {
          q = q.or(`customer_name.ilike.%${safe}%,customer_email.ilike.%${safe}%`);
        }
      }

      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
};

export const useOrderDetails = (orderId: string | null) => {
  return useQuery({
    queryKey: ["order-details", orderId],
    enabled: !!orderId,
    queryFn: async () => {
      if (!orderId) return null;
      const [{ data: items }, { data: history }] = await Promise.all([
        supabase.from("order_items").select("*").eq("order_id", orderId),
        supabase.from("order_status_history").select("*").eq("order_id", orderId).order("created_at", { ascending: false }),
      ]);
      return { items: items ?? [], history: history ?? [] };
    },
  });
};

export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ orderId, status, notes }: { orderId: string; status: string; notes?: string }) => {
      const { error: updateError } = await supabase
        .from("orders")
        .update({ status: status as OrderStatus, updated_at: new Date().toISOString() })
        .eq("id", orderId);
      
      if (updateError) throw updateError;

      const { error: historyError } = await supabase
        .from("order_status_history")
        .insert([{ order_id: orderId, status: status as OrderStatus, notes: notes || null }]);
      
      if (historyError) throw historyError;
      
      // Fire notification
      supabase.functions.invoke("notify-order-status", { body: { order_id: orderId, new_status: status } }).catch(() => {});
      
      return { orderId, status };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order-details", data.orderId] });
      toast({ title: "Status atualizado com sucesso" });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao atualizar status", description: error.message, variant: "destructive" });
    },
  });
};

export const useBulkUpdateOrderStatus = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      const { error: updateError } = await supabase
        .from("orders")
        .update({ status: status as OrderStatus, updated_at: new Date().toISOString() })
        .in("id", ids);
      
      if (updateError) throw updateError;

      const historyEntries = ids.map(id => ({ 
        order_id: id, 
        status: status as OrderStatus, 
        notes: "Atualização em massa" 
      }));
      
      const { error: historyError } = await supabase.from("order_status_history").insert(historyEntries);
      if (historyError) throw historyError;

      return { ids, status };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast({ title: "Pedidos atualizados com sucesso" });
    },
    onError: (error: any) => {
      toast({ title: "Erro na atualização em massa", description: error.message, variant: "destructive" });
    },
  });
};

export const useDeleteOrder = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (orderId: string) => {
      await supabase.from("order_status_history").delete().eq("order_id", orderId);
      await supabase.from("order_items").delete().eq("order_id", orderId);
      const { error } = await supabase.from("orders").delete().eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast({ title: "Pedido excluído com sucesso" });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao excluir pedido", description: error.message, variant: "destructive" });
    },
  });
};
