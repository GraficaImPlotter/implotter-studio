import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, subMonths, format, startOfToday } from "date-fns";

export const useDashboardStats = () => {
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [
        { count: totalOrders },
        { data: revenueData },
        { count: totalCustomers },
        { count: totalLeads },
        { count: pendingReviews },
        { count: totalProducts },
        { count: pendingReceipts },
        { count: pendingInvoices },
        { data: pendingOrders }
      ] = await Promise.all([
        supabase.from("orders").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("total"),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("leads").select("id", { count: "exact", head: true }),
        supabase.from("reviews").select("id", { count: "exact", head: true }).eq("is_approved", false),
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("payment_method", "pix").eq("status", "aguardando_pagamento").is("pix_receipt_url", null),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pagamento_confirmado").is("invoice_url", null),
        supabase.from("orders").select("total").in("status", ["pedido_recebido", "aguardando_pagamento", "pagamento_confirmado", "em_analise", "aguardando_arte", "arte_em_conferencia", "aprovado_producao", "em_producao", "em_acabamento", "pronto_envio"])
      ]);

      const totalRevenue = revenueData?.reduce((acc, o) => acc + Number(o.total || 0), 0) || 0;
      const projectedRevenue = pendingOrders?.reduce((acc, o) => acc + Number(o.total || 0), 0) || 0;

      return {
        totalOrders: totalOrders || 0,
        totalRevenue,
        totalCustomers: totalCustomers || 0,
        totalLeads: totalLeads || 0,
        pendingReviews: pendingReviews || 0,
        totalProducts: totalProducts || 0,
        pendingReceipts: pendingReceipts || 0,
        pendingInvoices: pendingInvoices || 0,
        projectedRevenue
      };
    },
    staleTime: 1000 * 60 * 5, // Data remains fresh for 5 minutes
    refetchInterval: 60000, // Still refresh every minute in the background
  });
};

export const useSalesData = (days = 30) => {
  return useQuery({
    queryKey: ["sales-chart", days],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data: orders, error } = await supabase
        .from("orders")
        .select("created_at, total")
        .gte("created_at", startDate.toISOString())
        .order("created_at");

      if (error) throw error;

      const grouped: Record<string, number> = {};
      orders?.forEach((o) => {
        const day = format(new Date(o.created_at), "dd/MM");
        grouped[day] = (grouped[day] || 0) + Number(o.total);
      });

      return Object.entries(grouped).map(([date, total]) => ({ date, total }));
    },
    staleTime: 1000 * 60 * 15, // 15 minutes
  });
};

export const useProductPerformance = () => {
  return useQuery({
    queryKey: ["product-performance"],
    queryFn: async () => {
      const { data: items, error } = await supabase
        .from("order_items")
        .select("product_name, quantity");

      if (error) throw error;

      const grouped: Record<string, number> = {};
      items?.forEach((i) => {
        grouped[i.product_name] = (grouped[i.product_name] || 0) + i.quantity;
      });

      return Object.entries(grouped)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([name, qty]) => ({ 
          name: name.length > 25 ? name.slice(0, 25) + "..." : name, 
          qty 
        }));
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
};

export const useMonthlyRevenue = (months = 6) => {
  return useQuery({
    queryKey: ["monthly-revenue", months],
    queryFn: async () => {
      const startDate = startOfMonth(subMonths(new Date(), months - 1));

      const { data: orders, error } = await supabase
        .from("orders")
        .select("created_at, total")
        .gte("created_at", startDate.toISOString())
        .order("created_at");

      if (error) throw error;

      const grouped: Record<string, { revenue: number; orders: number }> = {};
      orders?.forEach((o) => {
        const month = format(new Date(o.created_at), "MMM/yy");
        if (!grouped[month]) grouped[month] = { revenue: 0, orders: 0 };
        grouped[month].revenue += Number(o.total);
        grouped[month].orders += 1;
      });

      return Object.entries(grouped).map(([month, d]) => ({ month, ...d }));
    },
    staleTime: 1000 * 60 * 60, // 1 hour (static historical data)
  });
};
