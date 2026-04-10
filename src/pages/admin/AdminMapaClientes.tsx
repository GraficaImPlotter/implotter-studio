import { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { MapPin, Users, ShoppingCart, DollarSign, CalendarIcon, Search } from "lucide-react";
import { format, subDays, subMonths, isAfter, isBefore, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

type FilterPeriod = "30d" | "90d" | "6m" | "1y" | "all" | "custom";

interface OrderRow {
  customer_name: string;
  customer_email: string;
  address_city: string | null;
  address_state: string | null;
  total: number;
  created_at: string;
  status: string;
  customer_id: string | null;
}

interface CityAgg {
  city: string;
  state: string;
  customers: number;
  orders: number;
  revenue: number;
}

interface StateAgg {
  state: string;
  customers: number;
  orders: number;
  revenue: number;
}

const COLORS = [
  "hsl(217, 85%, 48%)", "hsl(255, 65%, 55%)", "hsl(152, 60%, 38%)",
  "hsl(38, 92%, 50%)", "hsl(0, 72%, 51%)", "hsl(280, 60%, 50%)",
  "hsl(190, 70%, 42%)", "hsl(340, 65%, 50%)", "hsl(100, 50%, 40%)",
];

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function AdminMapaClientes() {
  const [allOrders, setAllOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<FilterPeriod>("all");
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();
  const [filterCity, setFilterCity] = useState("");
  const [filterState, setFilterState] = useState("");
  const [selectedCity, setSelectedCity] = useState<CityAgg | null>(null);

  useEffect(() => {
    supabase
      .from("orders")
      .select("customer_name, customer_email, address_city, address_state, total, created_at, status, customer_id")
      .then(({ data }) => { setAllOrders((data as OrderRow[]) ?? []); setLoading(false); });
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
      case "custom": from = customFrom ?? null; break;
      case "all": from = null; break;
    }
    return { from, to };
  }, [period, customFrom, customTo]);

  const filtered = useMemo(() => {
    return allOrders.filter((o) => {
      if (!o.address_city && !o.address_state) return false;
      const d = parseISO(o.created_at);
      if (dateRange.from && isBefore(d, dateRange.from)) return false;
      if (isAfter(d, dateRange.to)) return false;
      if (filterState && o.address_state?.toUpperCase() !== filterState.toUpperCase()) return false;
      if (filterCity && !o.address_city?.toLowerCase().includes(filterCity.toLowerCase())) return false;
      return true;
    });
  }, [allOrders, dateRange, filterState, filterCity]);

  const { cities, states, totals } = useMemo(() => {
    const cityMap = new Map<string, CityAgg>();
    const stateMap = new Map<string, StateAgg>();
    const emailSet = new Set<string>();

    filtered.forEach((o) => {
      const city = o.address_city?.trim() || "Não informada";
      const state = o.address_state?.trim().toUpperCase() || "??";
      const key = `${city}|${state}`;
      const revenue = Number(o.total);

      // city
      const ca = cityMap.get(key) ?? { city, state, customers: 0, orders: 0, revenue: 0 };
      ca.orders += 1;
      ca.revenue += revenue;
      const emailKey = `${o.customer_email.toLowerCase()}|${key}`;
      if (!emailSet.has(emailKey)) { ca.customers += 1; emailSet.add(emailKey); }
      cityMap.set(key, ca);

      // state
      const sa = stateMap.get(state) ?? { state, customers: 0, orders: 0, revenue: 0 };
      sa.orders += 1;
      sa.revenue += revenue;
      const stateEmailKey = `${o.customer_email.toLowerCase()}|${state}`;
      if (!emailSet.has(stateEmailKey)) { sa.customers += 1; emailSet.add(stateEmailKey); }
      stateMap.set(state, sa);
    });

    const cities = Array.from(cityMap.values()).sort((a, b) => b.revenue - a.revenue);
    const states = Array.from(stateMap.values()).sort((a, b) => b.revenue - a.revenue);
    const totalCustomers = new Set(filtered.map((o) => o.customer_email.toLowerCase())).size;
    return {
      cities,
      states,
      totals: { orders: filtered.length, customers: totalCustomers, revenue: filtered.reduce((s, o) => s + Number(o.total), 0) },
    };
  }, [filtered]);

  const periods: { key: FilterPeriod; label: string }[] = [
    { key: "30d", label: "30 dias" },
    { key: "90d", label: "90 dias" },
    { key: "6m", label: "6 meses" },
    { key: "1y", label: "1 ano" },
    { key: "all", label: "Tudo" },
    { key: "custom", label: "Personalizado" },
  ];

  const uniqueStates = useMemo(() => {
    const s = new Set<string>();
    allOrders.forEach((o) => { if (o.address_state) s.add(o.address_state.trim().toUpperCase()); });
    return Array.from(s).sort();
  }, [allOrders]);

  return (
    <AdminLayout>
      <h1 className="font-display text-3xl font-bold text-foreground mb-2">Mapa de Clientes</h1>
      <p className="text-muted-foreground mb-6">Distribuição geográfica dos pedidos e clientes.</p>

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

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Filtrar cidade..." value={filterCity} onChange={(e) => setFilterCity(e.target.value)} className="pl-9 w-48" />
        </div>
        <select
          value={filterState}
          onChange={(e) => setFilterState(e.target.value)}
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm h-10"
        >
          <option value="">Todos estados</option>
          {uniqueStates.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card><CardContent className="p-5 flex items-center gap-3">
          <MapPin className="h-8 w-8 text-primary" />
          <div><p className="text-xs text-muted-foreground">Cidades</p><p className="text-2xl font-bold text-foreground">{cities.length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-5 flex items-center gap-3">
          <Users className="h-8 w-8 text-highlight" />
          <div><p className="text-xs text-muted-foreground">Clientes</p><p className="text-2xl font-bold text-foreground">{totals.customers}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-5 flex items-center gap-3">
          <ShoppingCart className="h-8 w-8 text-warning" />
          <div><p className="text-xs text-muted-foreground">Pedidos</p><p className="text-2xl font-bold text-foreground">{totals.orders}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-5 flex items-center gap-3">
          <DollarSign className="h-8 w-8 text-success" />
          <div><p className="text-xs text-muted-foreground">Faturamento</p><p className="text-2xl font-bold text-foreground">{fmt(totals.revenue)}</p></div>
        </CardContent></Card>
      </div>

      {loading ? (
        <div className="p-10 text-center text-muted-foreground">Carregando...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* State chart */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-display font-semibold text-foreground mb-4">Pedidos por Estado</h3>
              {states.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem dados de localização.</p>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(200, states.length * 36)}>
                  <BarChart data={states.slice(0, 15)} layout="vertical" margin={{ left: 10 }}>
                    <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis dataKey="state" type="category" width={40} tick={{ fontSize: 12, fill: "hsl(var(--foreground))" }} />
                    <Tooltip formatter={(v: number) => [v, "Pedidos"]} contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
                    <Bar dataKey="orders" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Revenue by state pie */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-display font-semibold text-foreground mb-4">Faturamento por Estado</h3>
              {states.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem dados.</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={states.slice(0, 8)} dataKey="revenue" nameKey="state" cx="50%" cy="50%" outerRadius={110} label={({ state, percent }) => `${state} ${(percent * 100).toFixed(0)}%`}>
                      {states.slice(0, 8).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => [fmt(v), "Faturamento"]} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* City table */}
      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b border-border">
            <h3 className="font-display font-semibold text-foreground">Ranking por Cidade</h3>
            <p className="text-xs text-muted-foreground mt-1">Clique em uma cidade para ver detalhes</p>
          </div>
          {cities.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground">Nenhum dado de localização encontrado nos pedidos.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Cidade</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Clientes</TableHead>
                    <TableHead className="text-right">Pedidos</TableHead>
                    <TableHead className="text-right">Faturamento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cities.slice(0, 50).map((c, i) => (
                    <TableRow
                      key={`${c.city}|${c.state}`}
                      className={cn("cursor-pointer", selectedCity?.city === c.city && selectedCity?.state === c.state && "bg-primary/5")}
                      onClick={() => setSelectedCity(selectedCity?.city === c.city && selectedCity?.state === c.state ? null : c)}
                    >
                      <TableCell className="font-bold text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-medium text-foreground">{c.city}</TableCell>
                      <TableCell><Badge variant="outline">{c.state}</Badge></TableCell>
                      <TableCell className="text-right text-foreground">{c.customers}</TableCell>
                      <TableCell className="text-right text-foreground">{c.orders}</TableCell>
                      <TableCell className="text-right font-semibold text-foreground">{fmt(c.revenue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail panel */}
      {selectedCity && (
        <Card className="mt-6 border-primary/30">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="h-5 w-5 text-primary" />
              <h3 className="font-display font-semibold text-foreground text-lg">{selectedCity.city} – {selectedCity.state}</h3>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-muted rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{selectedCity.customers}</p>
                <p className="text-xs text-muted-foreground">Clientes</p>
              </div>
              <div className="bg-muted rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{selectedCity.orders}</p>
                <p className="text-xs text-muted-foreground">Pedidos</p>
              </div>
              <div className="bg-muted rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{fmt(selectedCity.revenue)}</p>
                <p className="text-xs text-muted-foreground">Faturamento</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Ticket médio: {fmt(selectedCity.revenue / selectedCity.orders)}
            </p>
          </CardContent>
        </Card>
      )}
    </AdminLayout>
  );
}
