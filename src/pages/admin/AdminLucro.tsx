import { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { DollarSign, TrendingUp, Percent, CalendarIcon } from "lucide-react";
import { format, subDays, subMonths, isAfter, isBefore, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

type FilterKey = "30d" | "90d" | "6m" | "1y" | "all" | "custom";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function AdminLucro() {
  const [products, setProducts] = useState<any[]>([]);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<FilterKey>("30d");
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();

  useEffect(() => {
    Promise.all([
      supabase.from("products").select("id, name, slug, price, sale_price, cost_production, cost_supplier, cost_material, cost_art, cost_extra"),
      supabase.from("order_items").select("product_id, product_name, quantity, unit_price, subtotal, order_id"),
      supabase.from("orders").select("id, created_at, status"),
    ]).then(([p, oi, o]) => {
      setProducts(p.data ?? []);
      setOrderItems(oi.data ?? []);
      setOrders(o.data ?? []);
      setLoading(false);
    });
  }, []);

  const dateRange = useMemo(() => {
    const now = new Date();
    let from: Date | null = null;
    const to = period === "custom" && customTo ? customTo : now;
    switch (period) {
      case "30d": from = subDays(now, 30); break;
      case "90d": from = subDays(now, 90); break;
      case "6m": from = subMonths(now, 6); break;
      case "1y": from = subMonths(now, 12); break;
      case "all": from = null; break;
      case "custom": from = customFrom ?? null; break;
    }
    return { from, to };
  }, [period, customFrom, customTo]);

  const PAID = ["pagamento_confirmado", "em_analise", "aguardando_arte", "arte_em_conferencia", "aprovado_producao", "em_producao", "em_acabamento", "pronto_envio", "finalizado"];

  const data = useMemo(() => {
    // Filter orders by period
    const validOrderIds = new Set(
      orders
        .filter((o) => {
          if (!PAID.includes(o.status)) return false;
          const d = parseISO(o.created_at);
          if (dateRange.from && isBefore(d, dateRange.from)) return false;
          if (isAfter(d, dateRange.to)) return false;
          return true;
        })
        .map((o) => o.id)
    );

    // Build product cost map
    const costMap = new Map<string, number>();
    products.forEach((p) => {
      const cost = Number(p.cost_production || 0) + Number(p.cost_supplier || 0) + Number(p.cost_material || 0) + Number(p.cost_art || 0) + Number(p.cost_extra || 0);
      costMap.set(p.id, cost);
    });

    // Aggregate by product
    const agg = new Map<string, { name: string; revenue: number; cost: number; qty: number }>();
    orderItems.forEach((item) => {
      if (!validOrderIds.has(item.order_id)) return;
      const key = item.product_id || item.product_name;
      const existing = agg.get(key) ?? { name: item.product_name, revenue: 0, cost: 0, qty: 0 };
      existing.revenue += Number(item.subtotal);
      existing.qty += item.quantity;
      const unitCost = item.product_id ? (costMap.get(item.product_id) ?? 0) : 0;
      existing.cost += unitCost * item.quantity;
      agg.set(key, existing);
    });

    const rows = Array.from(agg.values())
      .map((r) => ({
        ...r,
        profit: r.revenue - r.cost,
        margin: r.revenue > 0 ? ((r.revenue - r.cost) / r.revenue) * 100 : 0,
      }))
      .sort((a, b) => b.profit - a.profit);

    const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
    const totalCost = rows.reduce((s, r) => s + r.cost, 0);
    const totalProfit = totalRevenue - totalCost;
    const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    return { rows, totalRevenue, totalCost, totalProfit, avgMargin };
  }, [products, orderItems, orders, dateRange]);

  const periods: { key: FilterKey; label: string }[] = [
    { key: "30d", label: "30 dias" },
    { key: "90d", label: "90 dias" },
    { key: "6m", label: "6 meses" },
    { key: "1y", label: "1 ano" },
    { key: "all", label: "Tudo" },
    { key: "custom", label: "Personalizado" },
  ];

  return (
    <AdminLayout>
      <h1 className="font-display text-3xl font-bold text-foreground mb-2">Relatório de Lucro</h1>
      <p className="text-muted-foreground mb-6">Margem e lucratividade por produto vendido.</p>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {periods.map((p) => (
          <Button key={p.key} size="sm" variant={period === p.key ? "default" : "outline"} onClick={() => setPeriod(p.key)}>
            {p.label}
          </Button>
        ))}
        {period === "custom" && (
          <div className="flex items-center gap-2 ml-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn(!customFrom && "text-muted-foreground")}>
                  <CalendarIcon className="mr-1 h-3.5 w-3.5" />
                  {customFrom ? format(customFrom, "dd/MM/yyyy") : "De"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={customFrom} onSelect={setCustomFrom} locale={ptBR} className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
            <span className="text-muted-foreground text-sm">até</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn(!customTo && "text-muted-foreground")}>
                  <CalendarIcon className="mr-1 h-3.5 w-3.5" />
                  {customTo ? format(customTo, "dd/MM/yyyy") : "Até"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={customTo} onSelect={setCustomTo} locale={ptBR} className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card><CardContent className="p-5 flex items-center gap-3">
          <DollarSign className="h-8 w-8 text-primary" />
          <div><p className="text-xs text-muted-foreground">Faturamento</p><p className="text-2xl font-bold text-foreground">{fmt(data.totalRevenue)}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-5 flex items-center gap-3">
          <DollarSign className="h-8 w-8 text-destructive" />
          <div><p className="text-xs text-muted-foreground">Custo Total</p><p className="text-2xl font-bold text-foreground">{fmt(data.totalCost)}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-5 flex items-center gap-3">
          <TrendingUp className="h-8 w-8 text-success" />
          <div><p className="text-xs text-muted-foreground">Lucro Total</p><p className={`text-2xl font-bold ${data.totalProfit >= 0 ? "text-success" : "text-destructive"}`}>{fmt(data.totalProfit)}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-5 flex items-center gap-3">
          <Percent className="h-8 w-8 text-warning" />
          <div><p className="text-xs text-muted-foreground">Margem Média</p><p className="text-2xl font-bold text-foreground">{data.avgMargin.toFixed(1)}%</p></div>
        </CardContent></Card>
      </div>

      {loading ? (
        <div className="p-10 text-center text-muted-foreground">Carregando...</div>
      ) : (
        <>
          {/* Chart top 10 */}
          {data.rows.length > 0 && (
            <Card className="mb-8">
              <CardContent className="p-6">
                <h3 className="font-display font-semibold text-foreground mb-4">Top 10 Produtos Mais Lucrativos</h3>
                <ResponsiveContainer width="100%" height={Math.max(200, Math.min(data.rows.length, 10) * 40)}>
                  <BarChart data={data.rows.slice(0, 10)} layout="vertical" margin={{ left: 20 }}>
                    <XAxis type="number" tickFormatter={(v) => `R$${v}`} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis dataKey="name" type="category" width={160} tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }} />
                    <Tooltip formatter={(v: number) => [fmt(v)]} contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
                    <Bar dataKey="profit" fill="hsl(var(--success))" radius={[0, 6, 6, 0]} name="Lucro" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              {data.rows.length === 0 ? (
                <div className="p-10 text-center text-muted-foreground">Nenhum dado de vendas no período.</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">#</TableHead>
                        <TableHead>Produto</TableHead>
                        <TableHead className="text-right">Qtd Vendida</TableHead>
                        <TableHead className="text-right">Faturamento</TableHead>
                        <TableHead className="text-right">Custo</TableHead>
                        <TableHead className="text-right">Lucro</TableHead>
                        <TableHead className="text-right">Margem</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.rows.map((r, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-bold text-muted-foreground">{i + 1}</TableCell>
                          <TableCell className="font-medium text-foreground">{r.name}</TableCell>
                          <TableCell className="text-right text-foreground">{r.qty}</TableCell>
                          <TableCell className="text-right text-foreground">{fmt(r.revenue)}</TableCell>
                          <TableCell className="text-right text-muted-foreground">{fmt(r.cost)}</TableCell>
                          <TableCell className={`text-right font-semibold ${r.profit >= 0 ? "text-success" : "text-destructive"}`}>{fmt(r.profit)}</TableCell>
                          <TableCell className={`text-right font-bold ${r.margin >= 30 ? "text-success" : r.margin >= 0 ? "text-warning" : "text-destructive"}`}>{r.margin.toFixed(1)}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </AdminLayout>
  );
}
