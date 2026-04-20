import AdminLayout from "@/components/layout/AdminLayout";
import { useBusinessHealth } from "@/hooks/use-analytics";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie
} from "recharts";
import { 
  TrendingUp, Users, Target, DollarSign, 
  Award, Calendar, ArrowUpRight, Activity 
} from "lucide-react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminRelatorios() {
  const { data: stats, isLoading } = useBusinessHealth();

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-8 animate-pulse">
          <div className="h-10 w-48 bg-card rounded-lg" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-card rounded-3xl" />)}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="h-80 bg-card rounded-3xl" />
             <div className="h-80 bg-card rounded-3xl" />
          </div>
        </div>
      </AdminLayout>
    );
  }

  const kpiCards = [
    { label: "Faturamento Total", value: `R$ ${stats?.totalRevenue.toLocaleString("pt-BR")}`, icon: DollarSign, color: "text-emerald-400" },
    { label: "Taxa de Conversão", value: `${stats?.conversionRate.toFixed(1)}%`, icon: Target, color: "text-highlight" },
    { label: "Total de Leads", value: stats?.totalLeads, icon: Activity, color: "text-amber-400" },
    { label: "Pedidos Fechados", value: stats?.totalOrders, icon: Award, color: "text-purple-400" },
  ];

  return (
    <AdminLayout>
      <div className="flex flex-col gap-8 pb-12">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-highlight/10 flex items-center justify-center border border-highlight/20 text-highlight shadow-glow-sm">
            <TrendingUp className="w-7 h-7" />
          </div>
          <div>
            <h1 className="font-display text-4xl font-black text-foreground tracking-tight uppercase">Dashboard <span className="text-highlight">Analytics</span></h1>
            <p className="text-muted-foreground text-sm font-medium tracking-wide">Saúde do negócio e inteligência competitiva</p>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {kpiCards.map((card, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="glass-card-premium p-6 rounded-[32px] border-white/5 shadow-xl relative overflow-hidden group"
            >
              <card.icon className={`absolute -right-4 -bottom-4 w-24 h-24 opacity-[0.03] ${card.color} group-hover:scale-110 transition-transform duration-500`} />
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2 opacity-60">{card.label}</p>
              <div className="flex items-end justify-between">
                <h3 className="text-3xl font-black text-foreground tracking-tighter leading-none">{card.value}</h3>
                <div className={`p-2 rounded-xl bg-white/5 border border-white/5 ${card.color}`}>
                   <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Chart */}
          <div className="lg:col-span-8 glass-card-premium p-8 rounded-[40px] border-white/5 shadow-2xl">
             <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-black text-foreground uppercase tracking-tight">Atividade Semanal</h3>
                  <p className="text-xs text-muted-foreground font-medium">Faturamento acumulado por dia da semana</p>
                </div>
                <Calendar className="w-5 h-5 text-muted-foreground opacity-40" />
             </div>
             
             <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats?.dayStats}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#888888', fontSize: 10, fontWeight: 900 }} 
                      dy={10} 
                    />
                    <YAxis hide />
                    <Tooltip 
                      cursor={{ fill: '#ffffff05' }}
                      contentStyle={{ backgroundColor: '#0f0f0f', border: '1px solid #ffffff10', borderRadius: '16px', fontSize: '12px' }}
                    />
                    <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                      {stats?.dayStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index % 2 === 0 ? "#6366f1" : "#8b5cf6"} fillOpacity={0.8} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
             </div>
          </div>

          {/* Top Customers */}
          <div className="lg:col-span-4 glass-card-premium p-8 rounded-[40px] border-white/5 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-black text-foreground uppercase tracking-tight">Top Clientes</h3>
                <p className="text-xs text-muted-foreground font-medium">Maiores volumes financeiros</p>
              </div>
              <Users className="w-5 h-5 text-highlight opacity-40" />
            </div>

            <div className="space-y-5 flex-1">
               {stats?.topCustomers.map((cust, i) => (
                 <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                       <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-black text-highlight border border-white/5 shrink-0">
                          {i + 1}
                       </div>
                       <div className="truncate">
                          <p className="text-sm font-bold text-foreground truncate leading-none mb-1">{cust.name}</p>
                          <p className="text-[10px] text-muted-foreground font-black uppercase opacity-60">{cust.count} PEDIDOS</p>
                       </div>
                    </div>
                    <p className="text-sm font-black text-foreground shrink-0">R$ {cust.total.toFixed(0)}</p>
                 </div>
               ))}
               {stats?.topCustomers.length === 0 && (
                 <div className="h-full flex flex-col items-center justify-center opacity-30 text-center py-20">
                    <Award className="w-12 h-12 mb-3" />
                    <p className="text-[10px] font-bold uppercase tracking-widest">Sem dados suficientes</p>
                 </div>
               )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
