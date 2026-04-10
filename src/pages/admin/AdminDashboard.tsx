import { useEffect, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { ShoppingCart, Users, UserPlus, Star, DollarSign, Package, TrendingUp, ArrowUpRight, ArrowDownRight, FileText, Receipt } from "lucide-react";
import { motion } from "framer-motion";
import { SalesChart, TopProductsChart, OrderStatusChart, MonthlyRevenueChart, ConversionRateChart, AvgTicketChart } from "@/components/admin/DashboardCharts";
import { useRealtimeAlerts } from "@/hooks/use-realtime-alerts";

interface Stats {
  totalOrders: number;
  totalRevenue: number;
  totalCustomers: number;
  totalLeads: number;
  pendingReviews: number;
  totalProducts: number;
  pendingReceipts: number;
  pendingInvoices: number;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<Stats>({ totalOrders: 0, totalRevenue: 0, totalCustomers: 0, totalLeads: 0, pendingReviews: 0, totalProducts: 0, pendingReceipts: 0, pendingInvoices: 0 });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  useRealtimeAlerts();

  useEffect(() => {
    const load = async () => {
      const [orders, profiles, leads, reviews, products, recent, pendingReceipts, pendingInvoices] = await Promise.all([
        supabase.from("orders").select("total", { count: "exact" }),
        supabase.from("profiles").select("id", { count: "exact" }),
        supabase.from("leads").select("id", { count: "exact" }),
        supabase.from("reviews").select("id", { count: "exact" }).eq("is_approved", false),
        supabase.from("products").select("id", { count: "exact" }),
        supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(5),
        supabase.from("orders").select("id", { count: "exact" }).eq("payment_method", "pix").eq("status", "aguardando_pagamento").is("pix_receipt_url", null),
        supabase.from("orders").select("id", { count: "exact" }).eq("status", "pagamento_confirmado").is("invoice_url", null),
      ]);
      const revenue = orders.data?.reduce((s, o) => s + Number(o.total), 0) ?? 0;
      setStats({
        totalOrders: orders.count ?? 0,
        totalRevenue: revenue,
        totalCustomers: profiles.count ?? 0,
        totalLeads: leads.count ?? 0,
        pendingReviews: reviews.count ?? 0,
        totalProducts: products.count ?? 0,
        pendingReceipts: pendingReceipts.count ?? 0,
        pendingInvoices: pendingInvoices.count ?? 0,
      });
      setRecentOrders(recent.data ?? []);
    };
    load();
  }, []);

  const statusLabels: Record<string, string> = {
    pedido_recebido: "Recebido", aguardando_pagamento: "Aguardando Pag.",
    pagamento_confirmado: "Pago", em_analise: "Em Análise",
    em_producao: "Em Produção", finalizado: "Finalizado", cancelado: "Cancelado",
  };

  const cards = [
    { label: "Faturamento Total", value: `R$ ${stats.totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, icon: DollarSign, color: "from-success to-success/60", trend: "+12%", up: true },
    { label: "Total de Pedidos", value: stats.totalOrders.toString(), icon: ShoppingCart, color: "from-highlight to-highlight-glow", trend: "+8%", up: true },
    { label: "Clientes", value: stats.totalCustomers.toString(), icon: Users, color: "from-highlight to-highlight/60", trend: "+15%", up: true },
    { label: "Leads", value: stats.totalLeads.toString(), icon: UserPlus, color: "from-warning to-warning/60", trend: "+5%", up: true },
    { label: "Avaliações Pendentes", value: stats.pendingReviews.toString(), icon: Star, color: "from-gold to-warning", trend: "", up: true },
    { label: "Produtos Ativos", value: stats.totalProducts.toString(), icon: Package, color: "from-highlight-glow to-highlight", trend: "", up: true },
    { label: "Recibos Pendentes", value: stats.pendingReceipts.toString(), icon: Receipt, color: "from-destructive to-destructive/60", trend: "", up: false },
    { label: "NFs Pendentes", value: stats.pendingInvoices.toString(), icon: FileText, color: "from-warning to-warning/60", trend: "", up: true },
  ];

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Visão geral do seu negócio</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
        {cards.map((c, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.4 }}
            className="glass-card rounded-2xl p-6 glass-card-hover transition-all duration-300 border-gradient-premium group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${c.color} flex items-center justify-center shadow-lg relative overflow-hidden`}>
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none" />
                <c.icon className="w-6 h-6 text-white relative z-10 group-hover:scale-110 transition-transform" />
              </div>
              {c.trend && (
                <span className={`flex items-center gap-0.5 text-xs font-semibold ${c.up ? "text-success" : "text-destructive"}`}>
                  {c.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {c.trend}
                </span>
              )}
            </div>
            <p className="font-display text-2xl font-bold text-foreground tracking-tight">{c.value}</p>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-1">{c.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
        <SalesChart />
        <MonthlyRevenueChart />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
        <TopProductsChart />
        <OrderStatusChart />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
        <ConversionRateChart />
        <AvgTicketChart />
      </div>

      {/* Recent orders */}
      <div className="glass-card rounded-2xl p-6 border-gradient-premium">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-bold text-foreground text-lg">Pedidos Recentes</h2>
          <a href="/admin/pedidos" className="text-sm text-highlight font-semibold hover:underline flex items-center gap-1">
            Ver todos <ArrowUpRight className="w-3 h-3" />
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left pb-3 font-semibold text-muted-foreground">#</th>
                <th className="text-left pb-3 font-semibold text-muted-foreground">Cliente</th>
                <th className="text-left pb-3 font-semibold text-muted-foreground">Total</th>
                <th className="text-left pb-3 font-semibold text-muted-foreground">Status</th>
                <th className="text-left pb-3 font-semibold text-muted-foreground">Data</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map(o => (
                <tr key={o.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                  <td className="py-3 font-medium text-foreground">#{o.order_number}</td>
                  <td className="py-3 text-foreground">{o.customer_name}</td>
                  <td className="py-3 font-semibold text-foreground">R$ {Number(o.total).toFixed(2)}</td>
                  <td className="py-3">
                    <span className="text-xs px-2.5 py-1 rounded-full bg-highlight/10 text-highlight font-semibold">
                      {statusLabels[o.status] || o.status}
                    </span>
                  </td>
                  <td className="py-3 text-muted-foreground">{new Date(o.created_at).toLocaleDateString("pt-BR")}</td>
                </tr>
              ))}
              {recentOrders.length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">Nenhum pedido ainda</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
