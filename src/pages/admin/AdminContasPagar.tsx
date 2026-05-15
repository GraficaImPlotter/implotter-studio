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
}

const AdminContasPagar = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [uploading, setUploading] = useState(false);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      // Using direct fetch from API we just created or via Supabase
      // Let's use the API we added to server.js if possible, but since we are in frontend,
      // standard practice here is direct Supabase or fetch.
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

  useEffect(() => {
    fetchExpenses();
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

      const response = await fetch(
        `${window.location.origin.replace("8080", "3001")}/api/finance/incoming-xml`,
        {
          method: "POST",
          body: formData,
        },
      );

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
            <h1 className="text-3xl font-bold tracking-tight">
              Contas a Pagar
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie suas despesas e concilie com NFs de fornecedores.
            </p>
          </div>

          <div className="flex items-center gap-3">
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
                className="gap-2 border-highlight/30 hover:bg-highlight/10"
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

            <Button className="gap-2 bg-highlight hover:bg-highlight/90 shadow-glow-sm">
              <Plus className="w-4 h-4" />
              Nova Despesa
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Pendente
                  </p>
                  <p className="text-2xl font-bold text-destructive">
                    R${" "}
                    {totals.pending.toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-destructive" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Pago (Mês)
                  </p>
                  <p className="text-2xl font-bold text-success">
                    R${" "}
                    {totals.paid.toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Geral
                  </p>
                  <p className="text-2xl font-bold text-highlight">
                    R${" "}
                    {totals.total.toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-highlight/10 flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-highlight" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Table */}
        <Card className="border-border/50 bg-card/30 backdrop-blur-md overflow-hidden">
          <div className="p-4 border-b border-border/30 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por descrição ou fornecedor..."
                className="pl-10 bg-background/50 border-border/30 focus:border-highlight/50 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="text-xs gap-1">
                <Filter className="w-3 h-3" /> Filtros
              </Button>
              <Button variant="ghost" size="sm" className="text-xs gap-1">
                <Calendar className="w-3 h-3" /> Período
              </Button>
            </div>
          </div>

          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Vencimento</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-highlight border-t-transparent rounded-full animate-spin" />
                      <p className="text-xs text-muted-foreground font-medium">
                        Carregando despesas...
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredExpenses.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-32 text-center text-muted-foreground"
                  >
                    Nenhuma despesa encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                filteredExpenses.map((expense) => (
                  <TableRow
                    key={expense.id}
                    className="group hover:bg-white/[0.02] transition-colors border-border/20"
                  >
                    <TableCell className="font-medium">
                      {format(new Date(expense.due_date), "dd/MM/yyyy", {
                        locale: ptBR,
                      })}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground">
                          {expense.description}
                        </span>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                          {expense.category}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {expense.supplier?.name || "Fornecedor avulso"}
                    </TableCell>
                    <TableCell className="text-right font-bold text-foreground">
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
                        className="capitalize px-3 py-0.5 font-bold text-[10px]"
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
                        <div className="flex items-center gap-1.5 text-success font-bold text-[11px] bg-success/10 px-2 py-1 rounded-lg w-fit">
                          <Receipt className="w-3 h-3" />
                          <span>NF Conciliada</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-muted-foreground font-medium italic">
                          Sem documento
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-highlight/10 hover:text-highlight"
                      >
                        <FileText className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        {/* Reconciliation Guide */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          <Card className="border-border/30 bg-gradient-to-br from-highlight/5 to-transparent p-6 relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="text-lg font-bold text-foreground mb-2 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-highlight" />
                Conciliação Inteligente
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Ao importar o XML de uma NF-e, o sistema busca automaticamente
                por despesas pendentes que coincidam com o valor e o fornecedor
                da nota. Isso ajuda você a manter seu financeiro organizado sem
                esforço manual.
              </p>
            </div>
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Receipt className="w-24 h-24 rotate-12" />
            </div>
          </Card>

          <Card className="border-border/30 bg-card/30 p-6">
            <h3 className="text-lg font-bold text-foreground mb-4">
              Dicas de Gestão
            </h3>
            <ul className="space-y-3">
              {[
                "Sempre solicite o XML da nota aos seus fornecedores.",
                "Cadastre a previsão de despesa assim que fizer o pedido fora.",
                "Use a importação para conferir se os valores batem com o combinado.",
                "Acompanhe o fluxo de caixa comparando Receitas vs. Despesas.",
              ].map((tip, i) => (
                <li
                  key={i}
                  className="flex gap-2 text-sm text-muted-foreground"
                >
                  <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-highlight shrink-0" />
                  {tip}
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
