import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, ComposedChart
} from "recharts";
import { motion } from "framer-motion";
import { useSalesData, useProductPerformance, useMonthlyRevenue } from "@/hooks/use-dashboard";
import { Skeleton } from "@/components/ui/skeleton";

const COLORS = ["hsl(217,85%,48%)", "hsl(255,65%,55%)", "hsl(152,60%,38%)", "hsl(38,92%,50%)", "hsl(0,72%,51%)"];

const ChartHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <div className="mb-6">
    <h3 className="font-display font-bold text-foreground text-lg tracking-tight">{title}</h3>
    {subtitle && <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-0.5">{subtitle}</p>}
  </div>
);

const LoadingChart = () => (
  <div className="h-[250px] w-full flex items-end gap-2 px-4 pb-8">
    {Array.from({ length: 12 }).map((_, i) => (
      <Skeleton key={i} className="flex-1" style={{ height: `${Math.random() * 60 + 20}%` }} />
    ))}
  </div>
);

const CustomTooltip = ({ active, payload, label, formatter }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card-premium p-3 border-white/5 shadow-2xl rounded-xl">
        <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-xs font-bold flex items-center gap-2" style={{ color: entry.color }}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            {formatter ? formatter(entry.value, entry.name) : `${entry.name}: ${entry.value}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export const SalesChart = () => {
  const { data = [], isLoading } = useSalesData();

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-2xl p-6 border-gradient-premium shadow-card-premium"
    >
      <ChartHeader title="Volume de Vendas" subtitle="Performance dos últimos 30 dias" />
      {isLoading ? <LoadingChart /> : (
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(217,85%,48%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(217,85%,48%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsla(var(--border), 0.5)" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10, fontWeight: 600 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fontWeight: 600 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v}`} />
            <Tooltip content={<CustomTooltip formatter={(v: number) => `R$ ${v.toLocaleString()}`} />} />
            <Area type="monotone" dataKey="total" name="Vendas" stroke="hsl(217,85%,48%)" fill="url(#colorTotal)" strokeWidth={3} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </motion.div>
  );
};

export const TopProductsChart = () => {
  const { data = [], isLoading } = useProductPerformance();

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-card rounded-2xl p-6 border-gradient-premium shadow-card-premium"
    >
      <ChartHeader title="Produtos Mais Vendidos" subtitle="Ranking por volume de itens" />
      {isLoading ? <LoadingChart /> : (
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data} layout="vertical" margin={{ left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsla(var(--border), 0.5)" horizontal={false} />
            <XAxis type="number" hide />
            <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fontWeight: 700 }} stroke="hsl(var(--foreground))" width={110} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="qty" name="Vendidos" fill="hsl(255,65%,55%)" radius={[0, 8, 8, 0]} barSize={20} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </motion.div>
  );
};

export const MonthlyRevenueChart = () => {
  const { data = [], isLoading } = useMonthlyRevenue();

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="glass-card rounded-2xl p-6 border-gradient-premium shadow-card-premium"
    >
      <ChartHeader title="Faturamento Mensal" subtitle="Histórico de crescimento" />
      {isLoading ? <LoadingChart /> : (
        <ResponsiveContainer width="100%" height={250}>
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsla(var(--border), 0.5)" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 10, fontWeight: 600 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fontWeight: 600 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v}`} />
            <Tooltip content={<CustomTooltip formatter={(v: number, name: string) => name === "revenue" ? `R$ ${v.toLocaleString()}` : `${v} pedidos`} />} />
            <Bar dataKey="revenue" name="Receita" fill="hsl(152,60%,38%)" radius={[6, 6, 0, 0]} />
            <Line type="monotone" dataKey="orders" name="Pedidos" stroke="hsl(38,92%,50%)" strokeWidth={3} dot={{ r: 4, fill: "hsl(38,92%,50%)" }} />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </motion.div>
  );
};

export const ProjectedRevenueChart = ({ projected = 0 }: { projected: number }) => {
  // Simplified projection visualization: current revenue vs pending
  const data = [
    { name: 'Atual', value: 100 },
    { name: 'Projetado', value: projected > 0 ? 30 : 0 },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-card rounded-2xl p-6 border-gradient-premium shadow-card-premium bg-gradient-to-br from-highlight/5 to-transparent"
    >
      <ChartHeader title="Pipeline Financeiro" subtitle="Receita garantida vs projetada" />
      <div className="flex items-center justify-between h-[250px]">
        <div className="flex-1">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                <Cell fill="hsl(217,85%,48%)" />
                <Cell fill="hsl(152,60%,38%)" fillOpacity={0.3} strokeWidth={2} stroke="hsl(152,60%,38%)" />
              </Pie>
              <Tooltip content={<CustomTooltip formatter={(v: number) => `${v}%`} />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="w-1/3 space-y-4">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none">Receita Pendente</p>
            <p className="text-xl font-display font-black text-foreground">R$ {projected.toLocaleString()}</p>
          </div>
          <div className="p-3 rounded-xl bg-success/10 border border-success/20">
             <p className="text-[10px] text-success font-bold uppercase tracking-tight">Otimismo do Pipeline</p>
             <p className="text-xs text-muted-foreground mt-1 leading-tight">Pedidos em produção garantem este montante nos próximos dias.</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
