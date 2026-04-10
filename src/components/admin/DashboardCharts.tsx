import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
} from "recharts";
import { motion } from "framer-motion";

const COLORS = ["hsl(217,85%,48%)", "hsl(255,65%,55%)", "hsl(152,60%,38%)", "hsl(38,92%,50%)", "hsl(0,72%,51%)"];

export const SalesChart = () => {
  const [data, setData] = useState<{ date: string; total: number }[]>([]);

  useEffect(() => {
    const load = async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: orders } = await supabase
        .from("orders")
        .select("created_at, total")
        .gte("created_at", thirtyDaysAgo.toISOString())
        .order("created_at");

      const grouped: Record<string, number> = {};
      orders?.forEach((o) => {
        const day = new Date(o.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
        grouped[day] = (grouped[day] || 0) + Number(o.total);
      });

      setData(Object.entries(grouped).map(([date, total]) => ({ date, total })));
    };
    load();
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="glass-card rounded-2xl p-6 border-gradient-premium"
    >
      <h3 className="font-display font-bold text-foreground mb-4">Vendas (últimos 30 dias)</h3>
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(217,85%,48%)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(217,85%,48%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(216,20%,88%)" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(215,15%,45%)" />
          <YAxis tick={{ fontSize: 11 }} stroke="hsl(215,15%,45%)" tickFormatter={(v) => `R$${v}`} />
          <Tooltip
            formatter={(value: number) => [`R$ ${value.toFixed(2)}`, "Total"]}
            contentStyle={{ background: "hsl(222,40%,12%)", border: "1px solid hsl(217,30%,20%)", borderRadius: "8px", color: "#fff" }}
          />
          <Area type="monotone" dataKey="total" stroke="hsl(217,85%,48%)" fill="url(#colorTotal)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

export const TopProductsChart = () => {
  const [data, setData] = useState<{ name: string; qty: number }[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: items } = await supabase.from("order_items").select("product_name, quantity");
      const grouped: Record<string, number> = {};
      items?.forEach((i) => {
        grouped[i.product_name] = (grouped[i.product_name] || 0) + i.quantity;
      });
      const sorted = Object.entries(grouped)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name, qty]) => ({ name: name.length > 20 ? name.slice(0, 20) + "…" : name, qty }));
      setData(sorted);
    };
    load();
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="glass-card rounded-2xl p-6 border-gradient-premium"
    >
      <h3 className="font-display font-bold text-foreground mb-4">Top 5 Produtos</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(216,20%,88%)" />
          <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(215,15%,45%)" />
          <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} stroke="hsl(215,15%,45%)" width={120} />
          <Tooltip contentStyle={{ background: "hsl(222,40%,12%)", border: "1px solid hsl(217,30%,20%)", borderRadius: "8px", color: "#fff" }} />
          <Bar dataKey="qty" fill="hsl(217,85%,48%)" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

export const OrderStatusChart = () => {
  const [data, setData] = useState<{ name: string; value: number }[]>([]);

  const statusLabels: Record<string, string> = {
    pedido_recebido: "Recebido", aguardando_pagamento: "Aguardando Pag.",
    pagamento_confirmado: "Pago", em_producao: "Em Produção",
    finalizado: "Finalizado", cancelado: "Cancelado",
  };

  useEffect(() => {
    const load = async () => {
      const { data: orders } = await supabase.from("orders").select("status");
      const grouped: Record<string, number> = {};
      orders?.forEach((o) => {
        const label = statusLabels[o.status] || o.status;
        grouped[label] = (grouped[label] || 0) + 1;
      });
      setData(Object.entries(grouped).map(([name, value]) => ({ name, value })));
    };
    load();
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="glass-card rounded-2xl p-6 border-gradient-premium"
    >
      <h3 className="font-display font-bold text-foreground mb-4">Status dos Pedidos</h3>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ background: "hsl(222,40%,12%)", border: "1px solid hsl(217,30%,20%)", borderRadius: "8px", color: "#fff" }} />
        </PieChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

export const MonthlyRevenueChart = () => {
  const [data, setData] = useState<{ month: string; revenue: number; orders: number }[]>([]);

  useEffect(() => {
    const load = async () => {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const { data: orders } = await supabase
        .from("orders")
        .select("created_at, total")
        .gte("created_at", sixMonthsAgo.toISOString())
        .order("created_at");

      const grouped: Record<string, { revenue: number; orders: number }> = {};
      orders?.forEach((o) => {
        const month = new Date(o.created_at).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
        if (!grouped[month]) grouped[month] = { revenue: 0, orders: 0 };
        grouped[month].revenue += Number(o.total);
        grouped[month].orders += 1;
      });

      setData(Object.entries(grouped).map(([month, d]) => ({ month, ...d })));
    };
    load();
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="glass-card rounded-2xl p-6 border-gradient-premium"
    >
      <h3 className="font-display font-bold text-foreground mb-4">Faturamento Mensal (6 meses)</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(216,20%,88%)" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(215,15%,45%)" />
          <YAxis tick={{ fontSize: 11 }} stroke="hsl(215,15%,45%)" tickFormatter={(v) => `R$${v}`} />
          <Tooltip
            formatter={(value: number, name: string) => [name === "revenue" ? `R$ ${value.toFixed(2)}` : value, name === "revenue" ? "Faturamento" : "Pedidos"]}
            contentStyle={{ background: "hsl(222,40%,12%)", border: "1px solid hsl(217,30%,20%)", borderRadius: "8px", color: "#fff" }}
          />
          <Bar dataKey="revenue" fill="hsl(152,60%,38%)" radius={[4, 4, 0, 0]} name="Faturamento" />
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

export const ConversionRateChart = () => {
  const [data, setData] = useState<{ month: string; rate: number }[]>([]);

  useEffect(() => {
    const load = async () => {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const { data: orders } = await supabase
        .from("orders")
        .select("created_at, status")
        .gte("created_at", sixMonthsAgo.toISOString());

      const grouped: Record<string, { total: number; finalized: number }> = {};
      orders?.forEach((o) => {
        const month = new Date(o.created_at).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
        if (!grouped[month]) grouped[month] = { total: 0, finalized: 0 };
        grouped[month].total += 1;
        if (o.status === "finalizado" || o.status === "pagamento_confirmado" || o.status === "em_producao") {
          grouped[month].finalized += 1;
        }
      });

      setData(Object.entries(grouped).map(([month, d]) => ({
        month,
        rate: d.total > 0 ? Math.round((d.finalized / d.total) * 100) : 0,
      })));
    };
    load();
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.5 }}
      className="glass-card rounded-2xl p-6 border-gradient-premium"
    >
      <h3 className="font-display font-bold text-foreground mb-4">Taxa de Conversão (%)</h3>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(216,20%,88%)" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(215,15%,45%)" />
          <YAxis tick={{ fontSize: 11 }} stroke="hsl(215,15%,45%)" tickFormatter={(v) => `${v}%`} />
          <Tooltip
            formatter={(value: number) => [`${value}%`, "Conversão"]}
            contentStyle={{ background: "hsl(222,40%,12%)", border: "1px solid hsl(217,30%,20%)", borderRadius: "8px", color: "#fff" }}
          />
          <Line type="monotone" dataKey="rate" stroke="hsl(255,65%,55%)" strokeWidth={2} dot={{ fill: "hsl(255,65%,55%)", r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

export const AvgTicketChart = () => {
  const [data, setData] = useState<{ month: string; avg: number }[]>([]);

  useEffect(() => {
    const load = async () => {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const { data: orders } = await supabase
        .from("orders")
        .select("created_at, total")
        .gte("created_at", sixMonthsAgo.toISOString());

      const grouped: Record<string, { sum: number; count: number }> = {};
      orders?.forEach((o) => {
        const month = new Date(o.created_at).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
        if (!grouped[month]) grouped[month] = { sum: 0, count: 0 };
        grouped[month].sum += Number(o.total);
        grouped[month].count += 1;
      });

      setData(Object.entries(grouped).map(([month, d]) => ({
        month,
        avg: d.count > 0 ? Math.round(d.sum / d.count * 100) / 100 : 0,
      })));
    };
    load();
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.6 }}
      className="glass-card rounded-2xl p-6 border-gradient-premium"
    >
      <h3 className="font-display font-bold text-foreground mb-4">Ticket Médio</h3>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(216,20%,88%)" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(215,15%,45%)" />
          <YAxis tick={{ fontSize: 11 }} stroke="hsl(215,15%,45%)" tickFormatter={(v) => `R$${v}`} />
          <Tooltip
            formatter={(value: number) => [`R$ ${value.toFixed(2)}`, "Ticket Médio"]}
            contentStyle={{ background: "hsl(222,40%,12%)", border: "1px solid hsl(217,30%,20%)", borderRadius: "8px", color: "#fff" }}
          />
          <Line type="monotone" dataKey="avg" stroke="hsl(38,92%,50%)" strokeWidth={2} dot={{ fill: "hsl(38,92%,50%)", r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </motion.div>
  );
};
