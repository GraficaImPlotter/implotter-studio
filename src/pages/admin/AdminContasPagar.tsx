import { useState, useEffect } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Upload,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  Filter,
  Calendar,
  Download,
  Receipt,
  BarChart3,
  Sparkles,
  Package,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

interface Expense {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  status: "pending" | "paid" | "cancelled";
  category: string;
  supplier?: {
    name: string;
    cnpj: string;
  };
  invoice_id?: string;
  order_id?: string;
}

const getApiUrl = () => {
  if (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  ) {
    return "http://localhost:3001";
  }
  return import.meta.env.VITE_API_URL || window.location.origin;
};

const AdminContasPagar = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [uploading, setUploading] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("expenses")
        .select("*, supplier:suppliers(*)");

      if (error) throw error;
      setExpenses(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar despesas: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, customer_name")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setOrders(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar pedidos:", error);
    }
  };

  useEffect(() => {
    fetchExpenses();
    fetchOrders();
  }, []);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".xml")) {
      toast.error("Por favor, envie um arquivo XML de NF-e");
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("xml", file);
      if (selectedOrderId) {
        formData.append("orderId", selectedOrderId);
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Usuário não autenticado");

      const API_URL = getApiUrl();
      const response = await fetch(`${API_URL}/api/finance/incoming-xml`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      const result = await response.json();
      if (result.success) {
        toast.success(
          `NF-e importada com sucesso! Emitente: ${result.supplier.name}`,
        );
        fetchExpenses(); // Refresh list to see reconciliation
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast.error("Erro ao processar XML: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const totals = {
    pending: expenses
      .filter((e) => e.status === "pending")
      .reduce((sum, e) => sum + e.amount, 0),
    paid: expenses
      .filter((e) => e.status === "paid")
      .reduce((sum, e) => sum + e.amount, 0),
    total: expenses.reduce((sum, e) => sum + e.amount, 0),
  };

  const filteredExpenses = expenses.filter(
    (e) =>
      e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.supplier?.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Contas a Pagar
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie suas despesas e concilie com NFs de fornecedores.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
                Vincular Pedido:
              </span>
              <select
                className="bg-background border border-border/50 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-highlight/50 min-w-[200px]"
                value={selectedOrderId}
                onChange={(e) => setSelectedOrderId(e.target.value)}
              >
                <option value="">Nenhum pedido</option>
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>
                    #{o.order_number} - {o.customer_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative">
              <input
                type="file"
                id="xml-upload"
                className="hidden"
                accept=".xml"
                onChange={handleFileUpload}
                disabled={uploading}
              />
              <Button
                variant="outline"
                className="gap-2 border-highlight/30 hover:bg-highlight/10 h-10 px-4 rounded-xl font-bold"
                asChild
              >
                <label htmlFor="xml-upload" className="cursor-pointer">
                  {uploading ? (
                    <Clock className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  Importar XML NF-e
                </label>
              </Button>
            </div>

            <Button className="gap-2 bg-highlight hover:bg-highlight/90 shadow-glow-sm h-10 px-4 rounded-xl font-bold">
              <Plus className="w-4 h-4" />
              Nova Despesa
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50 rounded-3xl overflow-hidden shadow-xl group">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">
                    A Pagar
                  </p>
                  <p className="text-3xl font-black text-destructive group-hover:scale-105 transition-transform origin-left">
                    R${" "}
                    {totals.pending.toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center border border-destructive/20">
                  <Clock className="w-6 h-6 text-destructive" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border-border/50 rounded-3xl overflow-hidden shadow-xl group">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">
                    Pago (Mês)
                  </p>
                  <p className="text-3xl font-black text-success group-hover:scale-105 transition-transform origin-left">
                    R${" "}
                    {totals.paid.toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-success/10 flex items-center justify-center border border-success/20">
                  <CheckCircle2 className="w-6 h-6 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border-border/50 rounded-3xl overflow-hidden shadow-xl group">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">
                    Total Geral
                  </p>
                  <p className="text-3xl font-black text-highlight group-hover:scale-105 transition-transform origin-left">
                    R${" "}
                    {totals.total.toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-highlight/10 flex items-center justify-center border border-highlight/20">
                  <BarChart3 className="w-6 h-6 text-highlight" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Table */}
        <Card className="border-border/30 bg-card/40 backdrop-blur-xl rounded-[32px] overflow-hidden shadow-2xl">
          <div className="p-6 border-b border-border/30 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-96 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-highlight transition-colors" />
              <Input
                placeholder="Pesquisar por descrição ou fornecedor..."
                className="pl-11 h-12 bg-background/50 border-border/30 rounded-2xl focus:border-highlight/50 transition-all font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="h-10 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest gap-2 bg-white/5 border border-white/5 hover:bg-white/10 transition-all"
              >
                <Filter className="w-3.5 h-3.5" /> Filtros
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-10 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest gap-2 bg-white/5 border border-white/5 hover:bg-white/10 transition-all"
              >
                <Calendar className="w-3.5 h-3.5" /> Período
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent border-border/30">
                  <TableHead className="text-[10px] font-black uppercase tracking-widest py-5">
                    Vencimento
                  </TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest py-5">
                    Descrição & Pedido
                  </TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest py-5">
                    Fornecedor
                  </TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase tracking-widest py-5">
                    Valor
                  </TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest py-5">
                    Status
                  </TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest py-5">
                    Documento
                  </TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase tracking-widest py-5">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-48 text-center">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-8 h-8 border-3 border-highlight border-t-transparent rounded-full animate-spin" />
                        <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest animate-pulse">
                          Sincronizando despesas...
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredExpenses.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-48 text-center text-muted-foreground/60 font-medium italic"
                    >
                      Nenhuma despesa registrada no momento.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredExpenses.map((expense) => (
                    <TableRow
                      key={expense.id}
                      className="group hover:bg-white/[0.03] transition-all duration-300 border-border/20"
                    >
                      <TableCell className="font-bold text-foreground">
                        {format(new Date(expense.due_date), "dd MMM yyyy", {
                          locale: ptBR,
                        })}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold text-foreground text-sm group-hover:text-highlight transition-colors">
                            {expense.description}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-black bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                              {expense.category}
                            </span>
                            {expense.order_id && (
                              <Badge
                                variant="hero"
                                className="text-[8px] h-4 font-black"
                              >
                                PEDIDO #
                                {orders.find((o) => o.id === expense.order_id)
                                  ?.order_number || "VINCULADO"}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold text-foreground/80">
                        {expense.supplier?.name || "Fornecedor avulso"}
                      </TableCell>
                      <TableCell className="text-right font-black text-foreground text-base">
                        R${" "}
                        {expense.amount.toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            expense.status === "paid"
                              ? "success"
                              : expense.status === "pending"
                                ? "outline"
                                : "destructive"
                          }
                          className="capitalize px-4 py-1 font-black text-[9px] tracking-widest rounded-lg shadow-sm"
                        >
                          {expense.status === "paid"
                            ? "Pago"
                            : expense.status === "pending"
                              ? "Pendente"
                              : "Cancelado"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {expense.invoice_id ? (
                          <div className="flex items-center gap-2 text-success font-black text-[10px] bg-success/10 px-3 py-1.5 rounded-xl border border-success/20 w-fit uppercase tracking-tighter">
                            <Receipt className="w-3.5 h-3.5" />
                            <span>NF Conciliada</span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-muted-foreground/50 font-black uppercase tracking-widest italic opacity-40">
                            Pendente
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 rounded-xl hover:bg-highlight hover:text-white transition-all shadow-hover"
                        >
                          <FileText className="w-5 h-5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Info Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-10">
          <Card className="border-border/20 bg-gradient-to-br from-highlight/10 to-transparent p-8 rounded-[40px] relative overflow-hidden shadow-2xl group">
            <div className="relative z-10">
              <h3 className="text-2xl font-black text-foreground mb-3 flex items-center gap-3">
                <Sparkles className="w-7 h-7 text-highlight animate-pulse" />
                Gestão Automatizada
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                Ao importar o XML de uma NF-e, o sistema agora cria
                automaticamente uma despesa se não encontrar uma correspondente.
                Você também pode vincular a nota a um pedido específico para
                calcular o custo real de produção.
              </p>
            </div>
            <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-10 transition-opacity">
              <Receipt className="w-48 h-48 rotate-12" />
            </div>
          </Card>

          <Card className="border-border/20 bg-card/50 p-8 rounded-[40px] shadow-2xl">
            <h3 className="text-xl font-black text-foreground mb-6 uppercase tracking-tight flex items-center gap-2">
              Dicas de Eficiência
            </h3>
            <ul className="space-y-4">
              {[
                {
                  text: "Associe a nota ao Pedido para ver o lucro real.",
                  icon: Package,
                },
                {
                  text: "Use o XML para validar se o fornecedor cobrou o preço acordado.",
                  icon: Receipt,
                },
                {
                  text: "O status 'NF Conciliada' garante que a despesa tem lastro fiscal.",
                  icon: CheckCircle2,
                },
              ].map((tip, i) => (
                <li key={i} className="flex gap-4 items-start group">
                  <div className="mt-0.5 w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center border border-white/5 group-hover:border-highlight/30 group-hover:bg-highlight/5 transition-all">
                    <tip.icon className="w-5 h-5 text-highlight" />
                  </div>
                  <span className="text-sm text-muted-foreground/80 font-bold group-hover:text-foreground transition-colors leading-tight py-2">
                    {tip.text}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminContasPagar;
