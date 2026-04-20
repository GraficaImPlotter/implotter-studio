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
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminRelatorios() {
  const { data: stats, isLoading } = useBusinessHealth();

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-8 animate-pulse p-8">
          <div className="h-12 w-64 bg-white/5 rounded-2xl" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-white/5 rounded-[32px]" />)}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="h-96 bg-white/5 rounded-[40px]" />
             <div className="h-96 bg-white/5 rounded-[40px]" />
          </div>
        </div>
      </AdminLayout>
    );
  }

  const kpiCards = [
    { label: "Faturamento Bruto", value: `R$ ${(stats?.totalRevenue || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, icon: DollarSign, color: "text-emerald-400", sub: "Acumulado total" },
    { label: "Taxa de Conversão", value: `${(stats?.conversionRate || 0).toFixed(1)}%`, icon: Target, color: "text-blue-400", sub: "Leads p/ Vendas" },
    { label: "Oportunidades", value: stats?.totalLeads || 0, icon: Activity, color: "text-amber-400", sub: "Contatos captados" },
    { label: "Vendas Realizadas", value: stats?.totalOrders || 0, icon: Award, color: "text-purple-400", sub: "Pedidos fechados" },
  ];

  return (
    <AdminLayout>
      <div className="flex flex-col gap-10 pb-20 p-4 lg:p-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-[24px] bg-highlight/10 flex items-center justify-center border border-highlight/20 text-highlight shadow-glow">
              <TrendingUp className="w-8 h-8" />
            </div>
            <div>
              <h1 className="font-display text-4xl font-black text-foreground tracking-tight uppercase leading-none">Dashboard <span className="text-highlight">Analytics</span></h1>
              <p className="text-muted-foreground text-sm font-medium tracking-wide mt-2">Inteligência competitiva e performance de tráfego</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-white/5 p-2 rounded-2xl border border-white/5">
             <div className="px-5 py-2 text-center border-r border-white/10">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1 text-emerald-400">Live</p>
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                   <p className="text-sm font-black text-foreground">Sincronizado</p>
                </div>
             </div>
             <Calendar className="w-5 h-5 mx-3 text-muted-foreground opacity-40" />
          </div>
        </div>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {kpiCards.map((card, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1, duration: 0.5, ease: "easeOut" }}
              className="glass-card-premium p-8 rounded-[40px] border-white/5 shadow-2xl relative overflow-hidden group"
            >
              <card.icon className={`absolute -right-4 -bottom-4 w-28 h-28 opacity-[0.05] ${card.color} group-hover:scale-110 transition-transform duration-700`} />
              <p className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-4 opacity-50">{card.label}</p>
              <div className="flex items-end justify-between relative z-10">
                <div>
                  <h3 className="text-3xl font-black text-foreground tracking-tighter leading-none mb-2">{card.value}</h3>
                  <p className="text-[10px] font-bold text-muted-foreground/60 uppercase">{card.sub}</p>
                </div>
                <div className={`p-3 rounded-2xl bg-white/5 border border-white/5 ${card.color} shadow-lg`}>
                   <ArrowUpRight className="w-5 h-5" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Main Analytics Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Revenue by Day Chart */}
          <div className="lg:col-span-8 glass-card-premium p-10 rounded-[48px] border-white/5 shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 p-10 opacity-[0.02] pointer-events-none">
                <DollarSign className="w-40 h-40" />
             </div>
             <div className="flex items-center justify-between mb-10 relative z-10">
                <div>
                  <h3 className="text-2xl font-black text-foreground uppercase tracking-tight leading-none mb-2">Atividade Semanal</h3>
                  <p className="text-xs text-muted-foreground font-medium tracking-wide">Faturamento bruto distribuído por dia</p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/5">
                   <div className="w-3 h-3 rounded-full bg-highlight" />
                   <span className="text-[10px] font-black uppercase text-foreground">Receita R$</span>
                </div>
             </div>
             
             <div className="h-[350px] w-full relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats?.dayStats || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#888888', fontSize: 11, fontWeight: 900 }} 
                      dy={10} 
                    />
                    <YAxis hide />
                    <Tooltip 
                      cursor={{ fill: '#ffffff05' }}
                      contentStyle={{ backgroundColor: '#0f0f0f', border: '1px solid #ffffff10', borderRadius: '24px', padding: '16px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}
                      itemStyle={{ color: '#fff', fontSize: '14px', fontWeight: 'bold' }}
                      labelStyle={{ color: '#888', fontSize: '10px', textTransform: 'uppercase', fontWeight: '900', marginBottom: '4px' }}
                    />
                    <Bar dataKey="value" radius={[14, 14, 14, 14]} barSize={40}>
                      {(stats?.dayStats || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index % 2 === 0 ? "hsl(var(--primary))" : "hsl(var(--highlight-glow))"} fillOpacity={1} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
             </div>
          </div>

          {/* Top Customers List */}
          <div className="lg:col-span-4 glass-card-premium p-10 rounded-[48px] border-white/5 shadow-2xl flex flex-col h-full">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h3 className="text-2xl font-black text-foreground uppercase tracking-tight leading-none mb-2">Top Clientes</h3>
                <p className="text-xs text-muted-foreground font-medium">Maiores contribuidores financeiros</p>
              </div>
              <Users className="w-6 h-6 text-highlight opacity-40" />
            </div>

            <div className="space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
               {(stats?.topCustomers || []).map((cust, i) => (
                 <motion.div 
                   key={i} 
                   initial={{ opacity: 0, x: 20 }}
                   animate={{ opacity: 1, x: 0 }}
                   transition={{ delay: 0.5 + (i * 0.1) }}
                   className="flex items-center justify-between p-4 rounded-3xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-all group"
                 >
                    <div className="flex items-center gap-4 min-w-0">
                       <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-xs font-black text-highlight border border-white/5 shrink-0 group-hover:scale-110 transition-transform">
                          {i + 1}
                       </div>
                       <div className="truncate">
                          <p className="text-sm font-bold text-foreground truncate leading-none mb-1.5">{cust.name}</p>
                          <div className="flex items-center gap-2">
                             <p className="text-[10px] text-muted-foreground font-black uppercase opacity-60 tracking-tighter">{cust.count} PEDIDOS</p>
                             <div className="w-1 h-1 rounded-full bg-white/20" />
                             <p className="text-[10px] text-highlight font-black uppercase tracking-tighter">VIP</p>
                          </div>
                       </div>
                    </div>
                    <div className="text-right shrink-0">
                       <p className="text-sm font-black text-foreground">R$ {cust.total.toFixed(0)}</p>
                    </div>
                 </motion.div>
               ))}
               {(!stats?.topCustomers || stats.topCustomers.length === 0) && (
                 <div className="h-full flex flex-col items-center justify-center opacity-30 text-center py-20 grayscale">
                    <Award className="w-16 h-16 mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest leading-loose">Aguardando fluxo<br/>de faturamento</p>
                 </div>
               )}
            </div>
          </div>
        </div>

        {/* Traffic & Popularity Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Traffic Area Chart */}
          <div className="glass-card-premium p-10 rounded-[48px] border-white/5 shadow-2xl relative overflow-hidden bg-gradient-to-br from-emerald-500/[0.03] to-transparent">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h3 className="text-2xl font-black text-foreground uppercase tracking-tight leading-none mb-2">Visitas Únicas</h3>
                <p className="text-xs text-muted-foreground font-medium">Fluxo de tráfego capturado via telemetria</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                <Globe className="w-6 h-6" />
              </div>
            </div>
            
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats?.trafficStats || []}>
                  <defs>
                    <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#888888', fontSize: 10, fontWeight: 900 }} 
                  />
                  <Tooltip 
                    cursor={{ stroke: '#10b981', strokeWidth: 1, strokeDasharray: '4 4' }}
                    contentStyle={{ backgroundColor: '#0f0f0f', border: '1px solid #10b98120', borderRadius: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}
                  />
                  <Area type="monotone" dataKey="visits" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorVisits)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Popular Products - Detailed Ranking */}
          <div className="glass-card-premium p-10 rounded-[48px] border-white/5 shadow-2xl relative overflow-hidden bg-gradient-to-br from-orange-500/[0.03] to-transparent">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h3 className="text-2xl font-black text-foreground uppercase tracking-tight leading-none mb-2">Interesse do Mercado</h3>
                <p className="text-xs text-muted-foreground font-medium">Ranking de popularidade por visualização</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-400 border border-orange-500/20">
                <Flame className="w-6 h-6" />
              </div>
            </div>

            <div className="space-y-4">
              {(stats?.hotProducts || []).map((product, i) => (
                <motion.div 
                  key={i} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 + (i * 0.1) }}
                  className="group relative flex items-center justify-between p-5 rounded-[32px] bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="flex items-center gap-5 min-w-0 relative">
                    <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center text-sm font-black text-orange-400 border border-orange-500/10 shadow-lg group-hover:rotate-[15deg] transition-transform">
                      #{i + 1}
                    </div>
                    <div className="truncate">
                      <p className="text-base font-bold text-foreground truncate group-hover:text-orange-400 transition-colors uppercase tracking-tight">{product.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                         <span className="text-[10px] text-muted-foreground font-black uppercase opacity-60">Path:</span>
                         <span className="text-[10px] text-muted-foreground font-medium">/loja/{product.slug}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 relative pl-4">
                    <div className="flex items-center gap-2">
                       <MousePointer2 className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
                       <span className="text-xl font-black text-foreground tracking-tighter">{product.visits}</span>
                    </div>
                    <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest opacity-40">Engajamento</span>
                  </div>
                </motion.div>
              ))}
              {(!stats?.hotProducts || stats.hotProducts.length === 0) && (
                <div className="flex flex-col items-center justify-center py-16 opacity-30 text-center">
                  <div className="w-20 h-20 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center mb-6">
                     <Zap className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] max-w-[200px] leading-relaxed">
                    Nenhum produto visitado recentemente. Os dados aparecerão conforme seus clientes navegam na loja.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
