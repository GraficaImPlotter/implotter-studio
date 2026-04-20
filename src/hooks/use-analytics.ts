import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { parseISO, getDay } from "date-fns";

export const useBusinessHealth = () => {
  return useQuery({
    queryKey: ["business-health-stats"],
    queryFn: async () => {
      try {
        const [
          { data: orders },
          { data: leads },
          { data: site_settings },
          { data: products }
        ] = await Promise.all([
          supabase.from("orders").select("created_at, total, customer_name, customer_id"),
          supabase.from("leads").select("id, created_at"),
          supabase.from("site_settings").select("key, value").like("key", "stats_visits_%"),
          supabase.from("products").select("name, slug, id").eq("is_active", true)
        ]);

        const allOrders = orders || [];
        const allLeads = leads || [];
        
        // 1. Sales by Day of Week
        const daysOfWeek = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
        const salesByDay = [0, 0, 0, 0, 0, 0, 0];
        allOrders.forEach(o => {
          if (o.created_at) {
            const dayIndex = getDay(parseISO(o.created_at));
            salesByDay[dayIndex] += Number(o.total || 0);
          }
        });

        const dayStats = daysOfWeek.map((name, i) => ({ name, value: salesByDay[i] }));

        // 2. Top Customers (Financial volume)
        const customerMap: Record<string, { name: string; total: number; count: number }> = {};
        allOrders.forEach(o => {
          const id = o.customer_id || o.customer_name || "Desconhecido";
          if (!customerMap[id]) customerMap[id] = { name: o.customer_name || "Cliente", total: 0, count: 0 };
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

        // 4. Traffic & Popularity (Protegido com try/catch)
        let productClicks: Record<string, number> = {};
        try {
          const rawTelemetry = localStorage.getItem("implotter_telemetry_v1");
          if (rawTelemetry) {
            const telemetry = JSON.parse(rawTelemetry);
            productClicks = telemetry.products || {};
          }
        } catch (e) {
          console.warn("Analytics: Telemetry parse failed");
        }
        
        const hotProducts = (products || [])
          .map(p => ({
            name: p.name,
            slug: p.slug,
            visits: (p.slug && productClicks[p.slug]) ? productClicks[p.slug] : 0
          }))
          .filter(p => p.visits > 0)
          .sort((a, b) => b.visits - a.visits)
          .slice(0, 5);

        const trafficStats = (site_settings || []).map(s => ({
          date: s.key.replace("stats_visits_", ""),
          visits: parseInt(s.value || "0")
        })).sort((a, b) => a.date.localeCompare(b.date));

        return {
          dayStats,
          topCustomers,
          conversionRate,
          totalLeads,
          totalOrders,
          totalRevenue: allOrders.reduce((acc, o) => acc + Number(o.total || 0), 0),
          hotProducts,
          trafficStats
        };
      } catch (err) {
        console.error("useBusinessHealth error:", err);
        return {
          dayStats: [],
          topCustomers: [],
          conversionRate: 0,
          totalLeads: 0,
          totalOrders: 0,
          totalRevenue: 0,
          hotProducts: [],
          trafficStats: []
        };
      }
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
};
