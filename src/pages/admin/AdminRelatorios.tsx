import { useEffect, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { supabase } from "@/integrations/supabase/client";

const AdminRelatorios = () => {
  const [data, setData] = useState({
    ordersByStatus: [] as { status: string; count: number }[],
    totalRevenue: 0,
    totalOrders: 0,
    totalCustomers: 0,
    totalLeads: 0,
    avgTicket: 0,
    topProducts: [] as { name: string; count: number }[],
  });

  useEffect(() => {
    const load = async () => {
      const [ordersRes, profilesRes, leadsRes, itemsRes] = await Promise.all([
        supabase.from("orders").select("status, total"),
        supabase.from("profiles").select("id", { count: "exact" }),
        supabase.from("leads").select("id", { count: "exact" }),
        supabase.from("order_items").select("product_name, quantity"),
      ]);

      const orders = ordersRes.data ?? [];
      const totalRevenue = orders.reduce((s, o) => s + Number(o.total), 0);
      const avgTicket = orders.length > 0 ? totalRevenue / orders.length : 0;

      // Group by status
      const statusMap: Record<string, number> = {};
      orders.forEach(o => { statusMap[o.status] = (statusMap[o.status] || 0) + 1; });
      const ordersByStatus = Object.entries(statusMap).map(([status, count]) => ({ status, count }));

      // Top products
      const productMap: Record<string, number> = {};
      (itemsRes.data ?? []).forEach(i => { productMap[i.product_name] = (productMap[i.product_name] || 0) + i.quantity; });
      const topProducts = Object.entries(productMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count }));

      setData({
        ordersByStatus,
        totalRevenue,
        totalOrders: orders.length,
        totalCustomers: profilesRes.count ?? 0,
        totalLeads: leadsRes.count ?? 0,
        avgTicket,
        topProducts,
      });
    };
    load();
  }, []);

  return (
    <AdminLayout>
      <h1 className="font-display text-3xl font-bold text-foreground mb-6">Relatórios</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-card rounded-xl border border-border p-5 shadow-card">
          <p className="text-sm text-muted-foreground">Total Pedidos</p>
          <p className="font-display text-2xl font-bold text-foreground">{data.totalOrders}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5 shadow-card">
          <p className="text-sm text-muted-foreground">Faturamento</p>
          <p className="font-display text-2xl font-bold text-foreground">R$ {data.totalRevenue.toFixed(2)}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5 shadow-card">
          <p className="text-sm text-muted-foreground">Ticket Médio</p>
          <p className="font-display text-2xl font-bold text-foreground">R$ {data.avgTicket.toFixed(2)}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5 shadow-card">
          <p className="text-sm text-muted-foreground">Clientes / Leads</p>
          <p className="font-display text-2xl font-bold text-foreground">{data.totalCustomers} / {data.totalLeads}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border border-border p-6 shadow-card">
          <h3 className="font-display font-semibold text-foreground mb-4">Pedidos por Status</h3>
          {data.ordersByStatus.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem dados</p>
          ) : (
            <div className="space-y-2">
              {data.ordersByStatus.map(s => (
                <div key={s.status} className="flex justify-between text-sm">
                  <span className="text-muted-foreground capitalize">{s.status.replace(/_/g, " ")}</span>
                  <span className="font-medium text-foreground">{s.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-card rounded-xl border border-border p-6 shadow-card">
          <h3 className="font-display font-semibold text-foreground mb-4">Produtos Mais Vendidos</h3>
          {data.topProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem dados</p>
          ) : (
            <div className="space-y-2">
              {data.topProducts.map((p, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{p.name}</span>
                  <span className="font-medium text-foreground">{p.count} un.</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminRelatorios;
