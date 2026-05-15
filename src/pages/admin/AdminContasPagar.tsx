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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

interface IncomingInvoice {
  id: string;
  access_key: string;
  supplier_cnpj: string;
  total_value: number;
  issue_date: string;
  status: string;
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
  const [invoices, setInvoices] = useState<IncomingInvoice[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [uploading, setUploading] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");

  const fetchExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from("expenses")
        .select("*, supplier:suppliers(*)")
        .order("due_date", { ascending: true });

      if (error) throw error;
      setExpenses(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar despesas: " + error.message);
    }
  };

  const fetchInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from("incoming_invoices")
        .select("*")
        .order("issue_date", { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar notas:", error);
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

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchExpenses(), fetchInvoices(), fetchOrders()]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
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
        loadData(); // Refresh everything
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast.error("Erro ao processar XML: " + error.message);
    } finally {
      setUploading(false);
      // Reset input
      event.target.value = "";
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

  const filteredInvoices = invoices.filter(
    (inv) =>
      inv.access_key.includes(searchTerm) ||
      inv.supplier_cnpj.includes(searchTerm),
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-3xl bg-gradient-to-br from-highlight to-highlight-glow flex items-center justify-center text-white shadow-glow">
              <Receipt className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tighter text-foreground uppercase">
                Financeiro <span className="text-highlight">Fornecedores</span>
              </h1>
              <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.3em] opacity-60">
                Contas a Pagar & Importação de NF-e
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-card/30 p-1.5 rounded-2xl border border-border/50">
              <span className="text-[10px] font-black uppercase tracking-widest opacity-60 pl-2">
                Vincular Pedido:
              </span>
              <select
                className="bg-background border border-border/30 rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:border-highlight/50 min-w-[180px]"
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
                className="gap-2 border-highlight/30 hover:bg-highlight/10 h-11 px-5 rounded-2xl font-black text-xs tracking-widest uppercase"
                asChild
              >
                <label htmlFor="xml-upload" className="cursor-pointer">
                  {uploading ? (
                    <Clock className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  Importar NF-e
                </label>
              </Button>
            </div>

            <Button className="gap-2 bg-highlight hover:bg-highlight/90 shadow-glow h-11 px-5 rounded-2xl font-black text-xs tracking-widest uppercase">
              <Plus className="w-4 h-4" />
              Nova Despesa
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-card/40 backdrop-blur-md border-border/50 rounded-[32px] overflow-hidden shadow-2xl group border-l-4 border-l-destructive">
            <CardContent className="pt-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.25em] mb-2">
                    A Pagar (Pendente)
                  </p>
                  <p className="text-4xl font-black text-destructive tracking-tighter">
                    R${" "}
                    {totals.pending.toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center border border-destructive/20 group-hover:scale-110 transition-transform">
                  <Clock className="w-7 h-7 text-destructive" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/40 backdrop-blur-md border-border/50 rounded-[32px] overflow-hidden shadow-2xl group border-l-4 border-l-success">
            <CardContent className="pt-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.25em] mb-2">
                    Pago (Mês Atual)
                  </p>
                  <p className="text-4xl font-black text-success tracking-tighter">
                    R${" "}
                    {totals.paid.toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-success/10 flex items-center justify-center border border-success/20 group-hover:scale-110 transition-transform">
                  <CheckCircle2 className="w-7 h-7 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/40 backdrop-blur-md border-border/50 rounded-[32px] overflow-hidden shadow-2xl group border-l-4 border-l-highlight">
            <CardContent className="pt-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.25em] mb-2">
                    Total Acumulado
                  </p>
                  <p className="text-4xl font-black text-highlight tracking-tighter">
                    R${" "}
                    {totals.total.toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-highlight/10 flex items-center justify-center border border-highlight/20 group-hover:scale-110 transition-transform">
                  <BarChart3 className="w-7 h-7 text-highlight" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="despesas" className="w-full">
          <TabsList className="bg-card/50 p-1 rounded-2xl border border-border/30 mb-6">
            <TabsTrigger
              value="despesas"
              className="rounded-xl px-6 py-2.5 font-black text-[10px] tracking-widest uppercase data-[state=active]:bg-highlight data-[state=active]:text-white transition-all"
            >
              Contas a Pagar
            </TabsTrigger>
            <TabsTrigger
              value="notas"
              className="rounded-xl px-6 py-2.5 font-black text-[10px] tracking-widest uppercase data-[state=active]:bg-highlight data-[state=active]:text-white transition-all"
            >
              NFs de Entrada
            </TabsTrigger>
          </TabsList>

          <TabsContent value="despesas">
            <Card className="border-border/30 bg-card/40 backdrop-blur-xl rounded-[40px] overflow-hidden shadow-2xl">
              <div className="p-8 border-b border-border/30 flex flex-col md:flex-row gap-6 items-center justify-between">
                <div className="relative w-full md:w-[450px] group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-highlight transition-colors" />
                  <Input
                    placeholder="Pesquisar por descrição ou fornecedor..."
                    className="pl-11 h-14 bg-background/50 border-border/30 rounded-[20px] focus:border-highlight/50 transition-all font-semibold"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-12 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest gap-2 bg-white/5 border border-white/5 hover:bg-white/10 transition-all"
                  >
                    <Filter className="w-4 h-4" /> Filtros Avançados
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow className="hover:bg-transparent border-border/30">
                      <TableHead className="text-[10px] font-black uppercase tracking-widest py-6 pl-8">
                        Vencimento
                      </TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest py-6">
                        Descrição & Vínculo
                      </TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest py-6">
                        Fornecedor
                      </TableHead>
                      <TableHead className="text-right text-[10px] font-black uppercase tracking-widest py-6">
                        Valor
                      </TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest py-6">
                        Status
                      </TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest py-6">
                        Conciliação
                      </TableHead>
                      <TableHead className="text-right text-[10px] font-black uppercase tracking-widest py-6 pr-8">
                        Ações
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-64 text-center">
                          <div className="flex flex-col items-center justify-center gap-4">
                            <div className="w-10 h-10 border-4 border-highlight border-t-transparent rounded-full animate-spin" />
                            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest animate-pulse">
                              Sincronizando fluxo financeiro...
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredExpenses.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="h-64 text-center text-muted-foreground/60 font-black uppercase tracking-widest opacity-40 text-[10px]"
                        >
                          Nenhuma despesa registrada.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredExpenses.map((expense) => (
                        <TableRow
                          key={expense.id}
                          className="group hover:bg-white/[0.04] transition-all duration-300 border-border/20"
                        >
                          <TableCell className="font-black text-foreground pl-8 py-5">
                            {format(new Date(expense.due_date), "dd MMM yyyy", {
                              locale: ptBR,
                            })}
                          </TableCell>
                          <TableCell className="py-5">
                            <div className="flex flex-col gap-1">
                              <span className="font-black text-foreground text-sm group-hover:text-highlight transition-colors uppercase tracking-tight">
                                {expense.description}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-black bg-white/5 px-2 py-0.5 rounded-lg border border-white/5">
                                  {expense.category}
                                </span>
                                {expense.order_id && (
                                  <Badge
                                    variant="hero"
                                    className="text-[8px] h-4 font-black rounded-md"
                                  >
                                    #
                                    {orders.find(
                                      (o) => o.id === expense.order_id,
                                    )?.order_number || "VINCULADO"}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-bold text-foreground/70 py-5">
                            {expense.supplier?.name || "Fornecedor avulso"}
                          </TableCell>
                          <TableCell className="text-right font-black text-foreground text-base py-5">
                            R${" "}
                            {expense.amount.toLocaleString("pt-BR", {
                              minimumFractionDigits: 2,
                            })}
                          </TableCell>
                          <TableCell className="py-5">
                            <Badge
                              variant={
                                expense.status === "paid"
                                  ? "success"
                                  : expense.status === "pending"
                                    ? "outline"
                                    : "destructive"
                              }
                              className="capitalize px-4 py-1.5 font-black text-[9px] tracking-[0.15em] rounded-xl shadow-inner uppercase"
                            >
                              {expense.status === "paid"
                                ? "Pago"
                                : expense.status === "pending"
                                  ? "Pendente"
                                  : "Cancelado"}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-5">
                            {expense.invoice_id ? (
                              <div className="flex items-center gap-2 text-success font-black text-[9px] bg-success/10 px-3 py-1.5 rounded-xl border border-success/20 w-fit uppercase tracking-wider">
                                <Receipt className="w-4 h-4" />
                                <span>NF OK</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-muted-foreground/30 font-black text-[9px] px-3 py-1.5 grayscale opacity-40 uppercase tracking-widest">
                                <Receipt className="w-4 h-4" />
                                <span>SEM NF</span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right pr-8 py-5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-12 w-12 rounded-2xl hover:bg-highlight hover:text-white transition-all shadow-xl bg-card border border-border/10"
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
          </TabsContent>

          <TabsContent value="notas">
            <Card className="border-border/30 bg-card/40 backdrop-blur-xl rounded-[40px] overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow className="hover:bg-transparent border-border/30">
                      <TableHead className="text-[10px] font-black uppercase tracking-widest py-6 pl-8">
                        Data Emissão
                      </TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest py-6">
                        Chave de Acesso
                      </TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest py-6">
                        CNPJ Fornecedor
                      </TableHead>
                      <TableHead className="text-right text-[10px] font-black uppercase tracking-widest py-6">
                        Valor Total
                      </TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest py-6">
                        Status
                      </TableHead>
                      <TableHead className="text-right text-[10px] font-black uppercase tracking-widest py-6 pr-8">
                        Ações
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="h-64 text-center text-muted-foreground/40 font-black uppercase tracking-widest text-[10px]"
                        >
                          Nenhuma nota fiscal importada ainda.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredInvoices.map((inv) => (
                        <TableRow
                          key={inv.id}
                          className="group hover:bg-white/[0.04] transition-all duration-300 border-border/20"
                        >
                          <TableCell className="font-black text-foreground pl-8 py-5">
                            {format(new Date(inv.issue_date), "dd MMM yyyy", {
                              locale: ptBR,
                            })}
                          </TableCell>
                          <TableCell className="font-mono text-[10px] text-muted-foreground py-5">
                            {inv.access_key}
                          </TableCell>
                          <TableCell className="font-bold text-foreground/70 py-5">
                            {inv.supplier_cnpj}
                          </TableCell>
                          <TableCell className="text-right font-black text-foreground py-5">
                            R${" "}
                            {inv.total_value.toLocaleString("pt-BR", {
                              minimumFractionDigits: 2,
                            })}
                          </TableCell>
                          <TableCell className="py-5">
                            <Badge
                              variant={
                                inv.status === "reconciled"
                                  ? "success"
                                  : "outline"
                              }
                              className="uppercase text-[8px] font-black tracking-widest"
                            >
                              {inv.status === "reconciled"
                                ? "Conciliada"
                                : "Pendente"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right pr-8 py-5">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-[10px] font-black uppercase tracking-widest gap-2"
                            >
                              <Download className="w-4 h-4" /> XML
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Info Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-10 pb-10">
          <Card className="border-border/20 bg-gradient-to-br from-highlight/10 to-transparent p-10 rounded-[48px] relative overflow-hidden shadow-2xl group border-t border-l border-white/5">
            <div className="relative z-10">
              <h3 className="text-3xl font-black text-foreground mb-4 flex items-center gap-4 tracking-tighter">
                <Sparkles className="w-8 h-8 text-highlight animate-pulse" />
                CONTROLE TOTAL
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed font-bold opacity-80">
                Se a nota fiscal não aparecer na aba de "Contas a Pagar",
                verifique a aba de **"NFs de Entrada"**. Todas as notas
                importadas com sucesso ficam registradas lá, permitindo que você
                audite se o fornecedor emitiu o documento corretamente.
              </p>
            </div>
            <div className="absolute top-0 right-0 p-8 opacity-[0.02] group-hover:opacity-10 transition-opacity">
              <Receipt className="w-56 h-56 rotate-12" />
            </div>
          </Card>

          <Card className="border-border/20 bg-card/40 p-10 rounded-[48px] shadow-2xl border-t border-l border-white/5">
            <h3 className="text-xl font-black text-foreground mb-8 uppercase tracking-[0.1em] flex items-center gap-3">
              <div className="w-2 h-8 bg-highlight rounded-full" />
              Checklist de Importação
            </h3>
            <ul className="space-y-5">
              {[
                {
                  text: "Verifique se o CNPJ do fornecedor no XML está cadastrado.",
                  icon: Package,
                },
                {
                  text: "Certifique-se que o valor total da nota é exatamente o valor da despesa.",
                  icon: Receipt,
                },
                {
                  text: "O sistema processa apenas arquivos XML de NF-e (Modelo 55).",
                  icon: CheckCircle2,
                },
              ].map((tip, i) => (
                <li key={i} className="flex gap-5 items-start group">
                  <div className="mt-0.5 w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-highlight/40 group-hover:bg-highlight/10 transition-all shadow-lg">
                    <tip.icon className="w-6 h-6 text-highlight" />
                  </div>
                  <span className="text-sm text-muted-foreground/90 font-black group-hover:text-foreground transition-colors leading-snug py-1">
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
