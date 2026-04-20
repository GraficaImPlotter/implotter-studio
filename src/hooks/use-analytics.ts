import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, format, parseISO, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";

export const useBusinessHealth = () => {
  return useQuery({
    queryKey: ["business-health-stats"],
    queryFn: async () => {
      const [
        { data: orders },
        { data: leads },
        { data: profiles }
      ] = await Promise.all([
        supabase.from("orders").select("created_at, total, customer_name, customer_id"),
        supabase.from("leads").select("id, created_at"),
        supabase.from("profiles").select("id, full_name")
      ]);

      const allOrders = orders || [];
      const allLeads = leads || [];
      
      // 1. Sales by Day of Week
      const daysOfWeek = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
      const salesByDay = [0, 0, 0, 0, 0, 0, 0];
      allOrders.forEach(o => {
        const dayIndex = getDay(parseISO(o.created_at));
        salesByDay[dayIndex] += Number(o.total || 0);
      });

      const dayStats = daysOfWeek.map((name, i) => ({ name, value: salesByDay[i] }));

      // 2. Top Customers (Financial volume)
      const customerMap: Record<string, { name: string; total: number; count: number }> = {};
      allOrders.forEach(o => {
        const id = o.customer_id || o.customer_name;
        if (!customerMap[id]) customerMap[id] = { name: o.customer_name, total: 0, count: 0 };
        customerMap[id].total += Number(o.total || 0);
        customerMap[id].count += 1;
      });

      const topCustomers = Object.values(customerMap)
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);

      // 3. Conversion Metrics
      const totalOrders = allOrders.length;
      const totalLeads = allLeads.length;
      const conversionRate = totalLeads > 0 ? (totalOrders / totalLeads) * 100 : 0;

      return {
        dayStats,
        topCustomers,
        conversionRate,
        totalLeads,
        totalOrders,
        totalRevenue: allOrders.reduce((acc, o) => acc + Number(o.total || 0), 0)
      };
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
};
