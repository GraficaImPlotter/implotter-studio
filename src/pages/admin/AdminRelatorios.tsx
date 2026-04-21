import AdminLayout from "@/components/layout/AdminLayout";
import { useBusinessHealth } from "@/hooks/use-analytics";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell, AreaChart, Area
} from "recharts";
import { 
  TrendingUp, Users, Target, DollarSign, 
  Award, Calendar, ArrowUpRight, Activity,
  Globe, Flame, MousePointer2, Zap
} from "lucide-react";
import { motion } from "framer-motion";

/**
 * COMPONENTE DE RELATÓRIOS - VERSÃO BLINDADA (ANTIGRAVITY)
 * Proteções contra dados nulos e falhas de renderização de gráficos.
 */
export default function AdminRelatorios() {
  // Hook com tratamento de erro interno
  const { data: stats, isLoading, isError } = useBusinessHealth();

  // 1. Estado de Carregamento (Skeleton)
  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-8 animate-pulse p-8">
          <div className="h-12 w-64 bg-white/5 rounded-2xl" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-white/5 rounded-[32px]" />)}
          </div>
          <div className="h-[400px] bg-white/5 rounded-[40px]" />
        </div>
      </AdminLayout>
    );
  }

  // 2. Estado de Erro Crítico
  if (isError || !stats) {
    return (
      <AdminLayout>
        <div className="p-12 text-center flex flex-col items-center justify-center min-h-[60vh]">
          <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mb-4">
             <Zap className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-foreground uppercase tracking-tight">Falha na Sincronização</h1>
          <p className="text-muted-foreground mt-2 max-w-md">Não conseguimos processar os dados analíticos no momento. Por favor, tente recarregar a página.</p>
        </div>
      </AdminLayout>
    );
  }

  const kpiCards = [
    { label: "Faturamento Bruto", value: `R$ ${(stats.totalRevenue || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, icon: DollarSign, color: "text-emerald-400", sub: "Acumulado" },
    { label: "Taxa de Conversão", value: `${(stats.conversionRate || 0).toFixed(1)}%`, icon: Target, color: "text-blue-400", sub: "Lead p/ Venda" },
    { label: "Oportunidades", value: stats.totalLeads || 0, icon: Activity, color: "text-amber-400", sub: "Novos Contatos" },
    { label: "Pedidos Fechados", value: stats.totalOrders || 0, icon: Award, color: "text-purple-400", sub: "Volume Final" },
  ];

  return (
    <AdminLayout>
      <div className="flex flex-col gap-10 pb-20 p-4 lg:p-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-[24px] bg-highlight/10 flex items-center justify-center border border-highlight/20 text-highlight shadow-glow">
              <TrendingUp className="w-8 h-8" />
            </div>
            <div>
              <h1 className="font-display text-4xl font-black text-foreground tracking-tight uppercase leading-none">Dashboard <span className="text-highlight">Analytics</span></h1>
              <p className="text-muted-foreground text-sm font-medium tracking-wide mt-2">Visão 360º de faturamento e comportamento de tráfego</p>
            </div>
          </div>
        </div>

        {/* KPIs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {kpiCards.map((card, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="glass-card-premium p-8 rounded-[38px] border-white/5 shadow-xl relative overflow-hidden group"
            >
              <card.icon className={`absolute -right-4 -bottom-4 w-28 h-28 opacity-[0.04] ${card.color} group-hover:scale-110 transition-transform duration-700`} />
              <p className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-4 opacity-50">{card.label}</p>
              <div className="flex items-end justify-between relative z-10">
                <div>
                  <h3 className="text-3xl font-black text-foreground tracking-tighter leading-none mb-1">{card.value}</h3>
                  <p className="text-[10px] font-bold text-muted-foreground/40 uppercase">{card.sub}</p>
                </div>
                <div className={`p-2.5 rounded-xl bg-white/5 border border-white/5 ${card.color}`}>
                   <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Sales Chart & Top Customers */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 glass-card-premium p-8 rounded-[44px] border-white/5 shadow-2xl relative">
             <h3 className="text-xl font-black text-foreground uppercase tracking-tight mb-8">Atividade de Vendas</h3>
             <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.dayStats || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#888', fontSize: 10, fontWeight: 900 }} />
                    <Tooltip cursor={{ fill: '#ffffff05' }} contentStyle={{ backgroundColor: '#0f0f0f', border: '1px solid #ffffff10', borderRadius: '16px' }} />
                    <Bar dataKey="value" radius={[10, 10, 10, 10]} barSize={40}>
                      {(stats.dayStats || []).map((_, i) => <Cell key={i} fill={i % 2 === 0 ? "#6366f1" : "#8b5cf6"} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
             </div>
          </div>

          <div className="lg:col-span-4 glass-card-premium p-8 rounded-[44px] border-white/5 shadow-2xl flex flex-col">
            <h3 className="text-xl font-black text-foreground uppercase tracking-tight mb-8">Top Clientes</h3>
            <div className="space-y-4 flex-1">
               {(stats.topCustomers || []).slice(0, 5).map((cust, i) => (
                 <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5 overflow-hidden">
                    <div className="truncate pr-4">
                      <p className="text-sm font-bold truncate leading-none mb-1">{cust.name}</p>
                      <p className="text-[9px] text-muted-foreground font-black uppercase opacity-60">{cust.count} PEDIDOS</p>
                    </div>
                    <p className="text-sm font-black text-foreground">R$ {cust.total.toFixed(0)}</p>
                 </div>
               ))}
               {(stats.topCustomers || []).length === 0 && (
                 <div className="h-full flex items-center justify-center opacity-30 text-center py-20 grayscale">
                    <p className="text-[10px] font-black uppercase">Sem dados</p>
                 </div>
               )}
            </div>
          </div>
        </div>

        {/* Traffic Area Chart (Telemetria) */}
        <div className="glass-card-premium p-10 rounded-[44px] border-white/5 shadow-2xl bg-gradient-to-br from-emerald-500/[0.03] to-transparent">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-2xl font-black text-foreground uppercase tracking-tight leading-none mb-2 text-emerald-400">Visitas ao Site</h3>
              <p className="text-xs text-muted-foreground font-medium tracking-wide">Monitoramento de tráfego capturado via Telemetria</p>
            </div>
            <Globe className="w-8 h-8 text-emerald-400 opacity-20" />
          </div>
          
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.trafficStats || []}>
                <defs>
                  <linearGradient id="glowVisits" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#888', fontSize: 9, fontWeight: 900 }} />
                <Tooltip contentStyle={{ backgroundColor: '#0f0f0f', border: '1px solid #10b98120', borderRadius: '16px' }} />
                <Area type="monotone" dataKey="visits" stroke="#10b981" strokeWidth={3} fill="url(#glowVisits)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Popularity Ranking */}
        <div className="glass-card-premium p-10 rounded-[44px] border-white/5 shadow-2xl bg-gradient-to-br from-orange-500/[0.02] to-transparent">
          <div className="flex items-center justify-between mb-8">
             <h3 className="text-2xl font-black text-foreground uppercase tracking-tight leading-none text-orange-400">Produtos em Alta</h3>
             <Flame className="w-8 h-8 text-orange-400 opacity-20" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(stats.hotProducts || []).map((product, i) => (
              <div key={i} className="flex items-center justify-between p-5 rounded-3xl bg-white/5 border border-white/5 group hover:bg-orange-500/10 transition-all duration-300">
                <div className="truncate">
                  <p className="text-sm font-bold text-foreground truncate group-hover:text-orange-400 transition-colors uppercase tracking-tight">{product.name}</p>
                  <p className="text-[10px] text-muted-foreground font-black opacity-60 tracking-wider">/loja/{product.slug}</p>
                </div>
                <div className="flex items-center gap-2 pl-4">
                   <MousePointer2 className="w-4 h-4 text-orange-400" />
                   <span className="text-lg font-black text-foreground">{product.visits}</span>
                </div>
              </div>
            ))}
            {(stats.hotProducts || []).length === 0 && (
              <div className="col-span-full py-16 opacity-30 text-center flex flex-col items-center">
                <Activity className="w-12 h-12 mb-4" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em] max-w-[250px] leading-relaxed">
                  Os dados de interesse aparecerão conforme seus clientes navegarem pela loja.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
