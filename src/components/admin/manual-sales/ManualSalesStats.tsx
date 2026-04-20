import { useMemo } from "react";
import { motion } from "framer-motion";
import { DollarSign, Clock, TrendingUp, BarChart3 } from "lucide-react";
import { startOfDay, isWithinInterval } from "date-fns";

interface ManualSalesStatsProps {
  orders: any[];
}

const ManualSalesStats = ({ orders }: ManualSalesStatsProps) => {
  const stats = useMemo(() => {
    const today = startOfDay(new Date());
    const now = new Date();

    const todayOrders = orders.filter(o => {
      try {
        const d = new Date(o.created_at);
        return isWithinInterval(d, { start: today, end: now });
      } catch { return false; }
    });

    const todayRevenue = todayOrders.reduce((s, o) => s + Number(o.total), 0);
    const pendingOrders = orders.filter(o => o.status === "aguardando_pagamento").length;
    const totalRevenue = orders.reduce((s, o) => s + Number(o.total), 0);
    const avgTicket = orders.length > 0 ? totalRevenue / orders.length : 0;

    return [
      { label: "Faturamento Hoje", value: todayRevenue, icon: DollarSign, color: "text-success", bg: "bg-success/10", suffix: "BRL" },
      { label: "Aguardando Pagamento", value: pendingOrders, icon: Clock, color: "text-warning", bg: "bg-warning/10" },
      { label: "Faturamento Total (Manual)", value: totalRevenue, icon: BarChart3, color: "text-highlight", bg: "bg-highlight/10", suffix: "BRL" },
      { label: "Ticket Médio", value: avgTicket, icon: TrendingUp, color: "text-highlight-glow", bg: "bg-highlight-glow/10", suffix: "BRL" },
    ];
  }, [orders]);

  const formatCurrency = (v: number) => 
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="glass-card p-5 rounded-2xl flex items-center gap-4 border-glow"
        >
          <div className={`w-12 h-12 rounded-xl ${s.bg} flex items-center justify-center`}>
            <s.icon className={`w-6 h-6 ${s.color}`} />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{s.label}</p>
            <p className="text-xl font-bold text-foreground">
              {s.label.includes("Faturamento") || s.label.includes("Ticket") 
                ? formatCurrency(s.value) 
                : s.value}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default ManualSalesStats;
