import { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Crown, Medal, User, CalendarIcon, TrendingUp, ShoppingCart, DollarSign, Users } from "lucide-react";
import { format, subDays, subMonths, subYears, isAfter, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

type FilterKey = "30d" | "3m" | "6m" | "1y" | "custom";

interface OrderRow {
  customer_name: string;
  customer_email: string;
  total: number;
  created_at: string;
  status: string;
}

interface CustomerAgg {
  name: string;
  email: string;
  totalSpent: number;
  orderCount: number;
  avgTicket: number;
  lastOrder: string;
  tier: "vip" | "recorrente" | "ocasional";
}

const PAID_STATUSES = [
  "pagamento_confirmado", "em_analise", "aguardando_arte", "arte_em_conferencia",
  "aprovado_producao", "em_producao", "em_acabamento", "pronto_envio", "finalizado",
];

const tierConfig = {
  vip: { label: "VIP", icon: Crown, color: "bg-warning/15 text-warning border-warning/30" },
  recorrente: { label: "Recorrente", icon: Medal, color: "bg-primary/15 text-primary border-primary/30" },
  ocasional: { label: "Ocasional", icon: User, color: "bg-muted text-muted-foreground border-border" },
};

function classify(orderCount: number, totalSpent: number): CustomerAgg["tier"] {
  if (orderCount >= 5 || totalSpent >= 2000) return "vip";
  if (orderCount >= 2 || totalSpent >= 500) return "recorrente";
  return "ocasional";
}

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function AdminClientesImportantes() {
  const [allOrders, setAllOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>("30d");
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();

  useEffect(() => {
    supabase
      .from("orders")
      .select("customer_name, customer_email, total, created_at, status")
      .then(({ data }) => { setAllOrders((data as OrderRow[]) ?? []); setLoading(false); });
  }, []);

  const dateFrom = useMemo(() => {
    const now = new Date();
    switch (filter) {
      case "30d": return subDays(now, 30);
      case "3m": return subMonths(now, 3);
      case "6m": return subMonths(now, 6);
      case "1y": return subYears(now, 1);
      case "custom": return customFrom ?? subDays(now, 30);
    }
  }, [filter, customFrom]);

  const dateTo = useMemo(() => (filter === "custom" && customTo ? customTo : new Date()), [filter, customTo]);

  const customers = useMemo<CustomerAgg[]>(() => {
    const paid = allOrders.filter(
      (o) => PAID_STATUSES.includes(o.status) && isAfter(parseISO(o.created_at), dateFrom) && !isAfter(parseISO(o.created_at), dateTo)
    );
    const map = new Map<string, { name: string; email: string; total: number; count: number; last: string }>();
    paid.forEach((o) => {
      const key = o.customer_email.toLowerCase();
      const existing = map.get(key);
      if (existing) {
        existing.total += Number(o.total);
        existing.count += 1;
        if (o.created_at > existing.last) existing.last = o.created_at;
      } else {
        map.set(key, { name: o.customer_name, email: o.customer_email, total: Number(o.total), count: 1, last: o.created_at });
      }
    });
    return Array.from(map.values())
      .map((c) => ({
        name: c.name,
        email: c.email,
        totalSpent: c.total,
        orderCount: c.count,
        avgTicket: c.total / c.count,
        lastOrder: c.last,
        tier: classify(c.count, c.total),
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent);
  }, [allOrders, dateFrom, dateTo]);

  const stats = useMemo(() => {
    const vip = customers.filter((c) => c.tier === "vip").length;
    const recorrente = customers.filter((c) => c.tier === "recorrente").length;
    const total = customers.reduce((s, c) => s + c.totalSpent, 0);
    return { total: customers.length, vip, recorrente, revenue: total };
  }, [customers]);

  const filters: { key: FilterKey; label: string }[] = [
    { key: "30d", label: "30 dias" },
    { key: "3m", label: "3 meses" },
    { key: "6m", label: "6 meses" },
    { key: "1y", label: "1 ano" },
    { key: "custom", label: "Personalizado" },
  ];

  return (
    <AdminLayout>
      <h1 className="font-display text-3xl font-bold text-foreground mb-2">Clientes Importantes</h1>
      <p className="text-muted-foreground mb-6">Ranking dos clientes mais valiosos para a gráfica.</p>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {filters.map((f) => (
          <Button key={f.key} size="sm" variant={filter === f.key ? "default" : "outline"} onClick={() => setFilter(f.key)}>
            {f.label}
          </Button>
        ))}
        {filter === "custom" && (
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

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card><CardContent className="p-5 flex items-center gap-3">
          <Users className="h-8 w-8 text-primary" />
          <div><p className="text-xs text-muted-foreground">Total Clientes</p><p className="text-2xl font-bold text-foreground">{stats.total}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-5 flex items-center gap-3">
          <Crown className="h-8 w-8 text-warning" />
          <div><p className="text-xs text-muted-foreground">Clientes VIP</p><p className="text-2xl font-bold text-foreground">{stats.vip}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-5 flex items-center gap-3">
          <Medal className="h-8 w-8 text-primary" />
          <div><p className="text-xs text-muted-foreground">Recorrentes</p><p className="text-2xl font-bold text-foreground">{stats.recorrente}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-5 flex items-center gap-3">
          <DollarSign className="h-8 w-8 text-success" />
          <div><p className="text-xs text-muted-foreground">Faturamento</p><p className="text-2xl font-bold text-foreground">{fmt(stats.revenue)}</p></div>
        </CardContent></Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-10 text-center text-muted-foreground">Carregando...</div>
          ) : customers.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground">Nenhum cliente encontrado no período.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Classificação</TableHead>
                    <TableHead className="text-right">Total Comprado</TableHead>
                    <TableHead className="text-right">Pedidos</TableHead>
                    <TableHead className="text-right">Ticket Médio</TableHead>
                    <TableHead>Última Compra</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((c, i) => {
                    const tier = tierConfig[c.tier];
                    const Icon = tier.icon;
                    return (
                      <TableRow key={c.email}>
                        <TableCell className="font-bold text-muted-foreground">{i + 1}</TableCell>
                        <TableCell>
                          <p className="font-medium text-foreground">{c.name}</p>
                          <p className="text-xs text-muted-foreground">{c.email}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("gap-1", tier.color)}>
                            <Icon className="h-3 w-3" /> {tier.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-foreground">{fmt(c.totalSpent)}</TableCell>
                        <TableCell className="text-right text-foreground">{c.orderCount}</TableCell>
                        <TableCell className="text-right text-foreground">{fmt(c.avgTicket)}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(parseISO(c.lastOrder), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
