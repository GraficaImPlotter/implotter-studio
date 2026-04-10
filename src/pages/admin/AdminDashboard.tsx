import AdminLayout from "@/components/layout/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { 
  ShoppingCart, Users, UserPlus, Star, DollarSign, Package, 
  TrendingUp, ArrowUpRight, ArrowDownRight, FileText, Receipt, 
  Activity, Briefcase, Zap
} from "lucide-react";
import { motion } from "framer-motion";
import { 
  SalesChart, TopProductsChart, MonthlyRevenueChart, 
  ProjectedRevenueChart 
} from "@/components/admin/DashboardCharts";
import { useDashboardStats } from "@/hooks/use-dashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";

const AdminDashboard = () => {
  const { data: stats, isLoading } = useDashboardStats();

  const { data: recentOrders = [] } = useQuery({
    queryKey: ["recent-orders"],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(6);
      return data || [];
    }
  });

  const { data: abandonedOrders = [] } = useQuery({
    queryKey: ["abandoned-orders"],
    queryFn: async () => {
      // Definition: orders pending payment for more than 2 hours
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("status", "aguardando_pagamento")
        .lt("created_at", twoHoursAgo)
        .order("created_at", { ascending: false })
        .limit(4);
      return data || [];
    }
  });

  const statusLabels: Record<string, string> = {
    pedido_recebido: "Recebido", aguardando_pagamento: "Aguardando Pag.",
    pagamento_confirmado: "Pago", em_analise: "Em Análise",
    em_producao: "Em Produção", finalizado: "Finalizado", cancelado: "Cancelado",
  };

  const cards = [
    { 
      label: "Faturamento Total", 
      value: stats ? `R$ ${stats.totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "R$ 0,00", 
      icon: DollarSign, 
      color: "from-success/80 to-success", 
      trend: "+12%", 
      up: true,
      description: "Lucro bruto acumulado"
    },
    { 
      label: "Pedidos Ativos", 
      value: stats?.totalOrders.toString() || "0", 
      icon: ShoppingCart, 
      color: "from-primary/80 to-primary", 
      trend: "+8%", 
      up: true,
      description: "Volume total de vendas"
    },
    { 
      label: "Base de Clientes", 
      value: stats?.totalCustomers.toString() || "0", 
      icon: Users, 
      color: "from-highlight/80 to-highlight-glow", 
      trend: "+15%", 
      up: true,
      description: "Contas registradas"
    },
    { 
      label: "Leads Captados", 
      value: stats?.totalLeads.toString() || "0", 
      icon: UserPlus, 
      color: "from-amber-400 to-orange-500", 
      trend: "+5%", 
      up: true,
      description: "Oportunidades abertas"
    },
  ];

  const quickStats = [
    { label: "NFs Pendentes", value: stats?.pendingInvoices || 0, icon: FileText, sub: "Faturamento" },
    { label: "PIX Pendentes", value: stats?.pendingReceipts || 0, icon: Receipt, sub: "Financeiro" },
    { label: "Abandono", value: abandonedOrders.length, icon: ShoppingCart, sub: "Recuperação" }
  ];

  return (
    <AdminLayout>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
        <div>
          <div className="flex items-center gap-2 text-highlight mb-1">
             <Activity className="w-4 h-4" />
             <span className="text-[10px] font-black uppercase tracking-[0.3em]">Sistema Operacional Live</span>
          </div>
          <h1 className="font-display text-4xl font-black text-foreground tracking-tight">Cerebro <span className="text-primary">ImPlotter</span></h1>
          <p className="text-muted-foreground text-sm font-medium">Controle central de inteligência e performance operacional</p>
        </div>
        
        <div className="flex items-center gap-3 bg-card p-1.5 rounded-2xl border border-border shadow-sm">
           {quickStats.map((s, idx) => (
             <div key={idx} className="px-4 py-2 border-r last:border-0 border-border/50 text-center">
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">{s.label}</p>
                <p className="font-display font-black text-foreground text-lg leading-none">{s.value}</p>
             </div>
           ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        {cards.map((c, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.4 }}
            className="glass-card-premium rounded-3xl p-6 hover:translate-y-[-4px] transition-all duration-300 border-white/5 group shadow-xl relative overflow-hidden"
          >
            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${c.color} opacity-[0.03] blur-2xl rounded-full translate-x-1/2 translate-y-[-1/2]`} />
            
            <div className="flex items-start justify-between mb-6">
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${c.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                <c.icon className="w-6 h-6 text-white" />
              </div>
              {isLoading ? <Skeleton className="h-5 w-12" /> : (
                <span className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-0.5 ${c.up ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                  {c.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {c.trend}
                </span>
              )}
            </div>
            
            <div className="space-y-1">
              {isLoading ? <Skeleton className="h-8 w-3/4" /> : (
                <p className="font-display text-2xl font-black text-foreground tracking-tighter">{c.value}</p>
              )}
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">{c.label}</p>
              <p className="text-[9px] text-muted-foreground/60 font-medium">{c.description}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-10">
        <div className="lg:col-span-8">
           <SalesChart />
        </div>
        <div className="lg:col-span-4">
           <ProjectedRevenueChart projected={stats?.projectedRevenue || 0} />
        </div>
        
        <div className="lg:col-span-7">
           <MonthlyRevenueChart />
        </div>
        <div className="lg:col-span-5">
           <TopProductsChart />
        </div>
      </div>

      {/* Tables & Intel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card-premium rounded-3xl p-8 border-white/5 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-[0.02]">
             <Zap className="w-48 h-48" />
          </div>
          
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="font-display font-black text-foreground text-2xl tracking-tight uppercase">Fluxo Recente</h2>
              <p className="text-muted-foreground text-xs font-medium tracking-wide">Pedidos processados nas últimas horas</p>
            </div>
            <a href="/admin/pedidos" className="px-4 py-2 rounded-xl bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all">
              Ver Todos
            </a>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 pb-4">
                  <th className="text-left py-4 font-black text-muted-foreground text-[10px] uppercase tracking-widest">ID</th>
                  <th className="text-left py-4 font-black text-muted-foreground text-[10px] uppercase tracking-widest">Cliente</th>
                  <th className="text-left py-4 font-black text-muted-foreground text-[10px] uppercase tracking-widest">Montante</th>
                  <th className="text-left py-4 font-black text-muted-foreground text-[10px] uppercase tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {recentOrders.map(o => (
                  <tr key={o.id} className="group hover:bg-white/[0.02] transition-colors">
                    <td className="py-5 font-black text-highlight text-xs">#{o.order_number}</td>
                    <td className="py-5">
                      <p className="font-bold text-foreground leading-none">{o.customer_name}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{new Date(o.created_at).toLocaleDateString("pt-BR")}</p>
                    </td>
                    <td className="py-5 font-black text-foreground">R$ {Number(o.total).toFixed(2)}</td>
                    <td className="py-5">
                      <span className="text-[9px] px-2.5 py-1 rounded-lg bg-white/5 text-muted-foreground font-black uppercase border border-white/5 group-hover:border-primary/30 group-hover:text-primary transition-all">
                        {statusLabels[o.status] || o.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="glass-card-premium rounded-3xl p-8 border-white/5 shadow-2xl flex flex-col h-full">
           <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="font-display font-black text-foreground text-xl tracking-tight uppercase">Recuperar Leads</h3>
                <p className="text-muted-foreground text-[10px] font-medium tracking-wide">Carrinhos e PIX pendentes {">"} 2h</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-highlight/10 flex items-center justify-center text-highlight shadow-glow-sm">
                 <Zap className="w-5 h-5" />
              </div>
           </div>

           <div className="space-y-4 flex-1">
              {abandonedOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 opacity-30 text-center">
                   <ShoppingCart className="w-8 h-8 mb-2" />
                   <p className="text-[10px] font-black uppercase">Fila limpa!</p>
                </div>
              ) : (
                abandonedOrders.map(order => {
                  const whatsappMsg = `Olá ${order.customer_name.split(' ')[0]}! Notamos que você iniciou um pedido na ImPlotter (#${order.order_number}) e parou na etapa de pagamento. Posso te ajudar com alguma dúvida técnica ou cupom?`;
                  const phone = order.customer_phone?.replace(/\D/g, "");
                  
                  return (
                    <div key={order.id} className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col gap-3">
                       <div className="flex justify-between items-start">
                          <div>
                             <p className="font-bold text-xs text-foreground truncate max-w-[120px]">{order.customer_name}</p>
                             <p className="text-[10px] text-muted-foreground uppercase font-black">R$ {Number(order.total).toFixed(2)}</p>
                          </div>
                          <span className="text-[8px] bg-amber-400/20 text-amber-400 px-1.5 py-0.5 rounded font-black">PENDENTE</span>
                       </div>
                       <a 
                        href={`https://wa.me/${phone}?text=${encodeURIComponent(whatsappMsg)}`} 
                        target="_blank" rel="noreferrer"
                        className="w-full py-2.5 rounded-xl bg-success/10 text-success text-[10px] font-black uppercase tracking-widest hover:bg-success hover:text-white transition-all text-center flex items-center justify-center gap-2"
                       >
                          Recuperar no Whats
                       </a>
                    </div>
                  );
                })
              )}
           </div>

           <button className="w-full py-4 mt-6 rounded-2xl border border-white/5 text-muted-foreground text-[9px] font-black uppercase tracking-[0.2em] hover:bg-white/[0.03] transition-all">
              Ver Relatório de Abandono
           </button>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
