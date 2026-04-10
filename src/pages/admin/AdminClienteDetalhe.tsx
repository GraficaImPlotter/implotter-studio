import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft, User, Mail, Phone, MapPin, ShoppingCart, FileText,
  DollarSign, Clock, MessageSquare, Package, Send, CalendarDays,
} from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
  pedido_recebido: "Recebido", aguardando_pagamento: "Aguardando Pgto",
  pagamento_confirmado: "Pgto Confirmado", em_analise: "Em Análise",
  aguardando_arte: "Aguardando Arte", arte_em_conferencia: "Arte Conferência",
  aprovado_producao: "Aprovado Prod.", em_producao: "Em Produção",
  em_acabamento: "Acabamento", pronto_envio: "Pronto Envio",
  finalizado: "Finalizado", cancelado: "Cancelado",
};

const QUOTE_STATUS: Record<string, string> = {
  rascunho: "Rascunho", enviado: "Enviado", aceito: "Aceito",
  recusado: "Recusado", vencido: "Vencido",
};

const fmt = (d: string) => format(new Date(d), "dd/MM/yyyy", { locale: ptBR });
const money = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function AdminClienteDetalhe() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [newNote, setNewNote] = useState("");

  // Profile
  const { data: profile, isLoading } = useQuery({
    queryKey: ["client-profile", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Orders
  const { data: orders = [] } = useQuery({
    queryKey: ["client-orders", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, order_number, status, total, created_at, payment_method, order_items(product_name, quantity, subtotal)")
        .eq("customer_id", id!)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  // Quotes
  const { data: quotes = [] } = useQuery({
    queryKey: ["client-quotes", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("quotes")
        .select("id, quote_number, status, total, created_at, valid_until, quote_items(product_name, quantity, subtotal)")
        .eq("customer_id", id!)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  // CRM Notes
  const { data: notes = [] } = useQuery({
    queryKey: ["client-notes", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("crm_notes")
        .select("*")
        .eq("customer_id", id!)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  const addNoteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("crm_notes").insert({
        customer_id: id!,
        note: newNote.trim(),
        note_type: "observation",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-notes", id] });
      setNewNote("");
      toast({ title: "Observação adicionada" });
    },
    onError: () => toast({ title: "Erro ao salvar", variant: "destructive" }),
  });

  // Summary metrics
  const totalPaid = orders.filter((o: any) => o.status !== "cancelado").reduce((s: number, o: any) => s + Number(o.total || 0), 0);
  const lastOrder = orders.length > 0 ? orders[0] : null;
  const totalOrders = orders.length;
  const totalQuotes = quotes.length;

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-highlight border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  if (!profile) {
    return (
      <AdminLayout>
        <p className="text-muted-foreground text-center py-20">Cliente não encontrado.</p>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/admin/clientes"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">{profile.full_name || "Sem nome"}</h1>
            <p className="text-sm text-muted-foreground">Cliente desde {fmt(profile.created_at)}</p>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <ShoppingCart className="h-8 w-8 text-highlight" />
              <div>
                <p className="text-2xl font-bold text-foreground">{totalOrders}</p>
                <p className="text-xs text-muted-foreground">Pedidos</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <FileText className="h-8 w-8 text-highlight" />
              <div>
                <p className="text-2xl font-bold text-foreground">{totalQuotes}</p>
                <p className="text-xs text-muted-foreground">Orçamentos</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-emerald-500" />
              <div>
                <p className="text-2xl font-bold text-foreground">{money(totalPaid)}</p>
                <p className="text-xs text-muted-foreground">Total pago</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <CalendarDays className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-sm font-bold text-foreground">{lastOrder ? fmt((lastOrder as any).created_at) : "—"}</p>
                <p className="text-xs text-muted-foreground">Última compra</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="dados">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="dados"><User className="h-3.5 w-3.5 mr-1.5" />Dados</TabsTrigger>
            <TabsTrigger value="pedidos"><ShoppingCart className="h-3.5 w-3.5 mr-1.5" />Pedidos</TabsTrigger>
            <TabsTrigger value="orcamentos"><FileText className="h-3.5 w-3.5 mr-1.5" />Orçamentos</TabsTrigger>
            <TabsTrigger value="notas"><MessageSquare className="h-3.5 w-3.5 mr-1.5" />Observações</TabsTrigger>
          </TabsList>

          {/* ── Dados ── */}
          <TabsContent value="dados">
            <Card>
              <CardHeader><CardTitle className="text-base">Dados do Cliente</CardTitle></CardHeader>
              <CardContent className="grid sm:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" /><span className="font-medium">Nome:</span> {profile.full_name || "—"}</div>
                <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /><span className="font-medium">Email:</span> {profile.email || "—"}</div>
                <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /><span className="font-medium">Telefone:</span> {profile.phone || "—"}</div>
                <div className="flex items-center gap-2"><span className="font-medium">CPF/CNPJ:</span> {profile.cpf_cnpj || "—"}</div>
                <div className="flex items-start gap-2 sm:col-span-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span>
                    {[profile.address_street, profile.address_number, profile.address_complement, profile.address_neighborhood, profile.address_city, profile.address_state, profile.address_zip]
                      .filter(Boolean)
                      .join(", ") || "Endereço não informado"}
                  </span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Pedidos ── */}
          <TabsContent value="pedidos">
            <Card>
              <CardHeader><CardTitle className="text-base">Histórico de Pedidos</CardTitle></CardHeader>
              <CardContent>
                {orders.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-8">Nenhum pedido encontrado</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Itens</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((o: any) => (
                        <TableRow key={o.id}>
                          <TableCell className="font-mono font-bold">{o.order_number}</TableCell>
                          <TableCell>{fmt(o.created_at)}</TableCell>
                          <TableCell>
                            {(o.order_items || []).slice(0, 2).map((i: any, idx: number) => (
                              <div key={idx} className="text-xs flex items-center gap-1">
                                <Package className="h-3 w-3 text-muted-foreground" />
                                <span className="truncate max-w-[180px]">{i.product_name}</span>
                                <span className="text-muted-foreground">x{i.quantity}</span>
                              </div>
                            ))}
                            {(o.order_items || []).length > 2 && (
                              <span className="text-[10px] text-muted-foreground">+{o.order_items.length - 2} itens</span>
                            )}
                          </TableCell>
                          <TableCell className="font-semibold">{money(Number(o.total))}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px]">{STATUS_LABEL[o.status] || o.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Orçamentos ── */}
          <TabsContent value="orcamentos">
            <Card>
              <CardHeader><CardTitle className="text-base">Orçamentos Enviados</CardTitle></CardHeader>
              <CardContent>
                {quotes.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-8">Nenhum orçamento encontrado</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Itens</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Validade</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {quotes.map((q: any) => (
                        <TableRow key={q.id}>
                          <TableCell className="font-mono font-bold">{q.quote_number}</TableCell>
                          <TableCell>{fmt(q.created_at)}</TableCell>
                          <TableCell>
                            {(q.quote_items || []).slice(0, 2).map((i: any, idx: number) => (
                              <div key={idx} className="text-xs">{i.product_name} x{i.quantity}</div>
                            ))}
                          </TableCell>
                          <TableCell className="font-semibold">{money(Number(q.total))}</TableCell>
                          <TableCell className="text-xs">{q.valid_until ? fmt(q.valid_until) : "—"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px]">{QUOTE_STATUS[q.status] || q.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Observações ── */}
          <TabsContent value="notas">
            <Card>
              <CardHeader><CardTitle className="text-base">Observações Internas</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Adicionar observação sobre o cliente..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="min-h-[80px]"
                  />
                  <Button
                    onClick={() => addNoteMutation.mutate()}
                    disabled={!newNote.trim() || addNoteMutation.isPending}
                    className="self-end"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                {notes.length === 0 && (
                  <p className="text-muted-foreground text-sm text-center py-4">Nenhuma observação</p>
                )}
                <div className="space-y-2">
                  {notes.map((n: any) => (
                    <div key={n.id} className="border border-border rounded-lg p-3 bg-muted/30">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{format(new Date(n.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                        {n.note_type && <Badge variant="secondary" className="text-[10px]">{n.note_type}</Badge>}
                      </div>
                      <p className="text-sm text-foreground whitespace-pre-wrap">{n.note}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
