import { useEffect, useState, useCallback } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus, Pencil, Trash2, Send, FileText, CheckCircle, XCircle,
  Search, Eye, ShoppingCart, Share2, Link as LinkIcon,
} from "lucide-react";
import { generateQuotePDF } from "@/lib/quote-pdf";
import { generatePremiumProposalPDF } from "@/lib/premium-proposal-pdf";
import { generateReceiptPDF } from "@/lib/receipt-pdf";
import { sanitizeSearchInput } from "@/lib/sanitize-search";

interface QuoteItem {
  id?: string;
  product_name: string;
  description: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  sort_order: number;
}

interface Quote {
  id: string;
  quote_number: number;
  customer_id: string | null;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  status: string;
  subtotal: number;
  discount: number;
  total: number;
  notes: string | null;
  internal_notes: string | null;
  valid_until: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_LABELS: Record<string, string> = {
  rascunho: "Rascunho",
  enviado: "Enviado",
  aceito: "Aceito",
  recusado: "Recusado",
  vencido: "Vencido",
};

const STATUS_COLORS: Record<string, string> = {
  rascunho: "bg-muted text-muted-foreground",
  enviado: "bg-info/20 text-info",
  aceito: "bg-success/20 text-success",
  recusado: "bg-destructive/20 text-destructive",
  vencido: "bg-warning/20 text-warning",
};

const emptyItem = (): QuoteItem => ({
  product_name: "",
  description: "",
  quantity: 1,
  unit_price: 0,
  subtotal: 0,
  sort_order: 0,
});

// ---- Formatting helpers ----
const formatPhone = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

const formatCep = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
};

const formatCpfCnpj = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 14);
  if (d.length <= 11) {
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  }
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
};

const AdminOrcamentos = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Form state
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Quote | null>(null);
  const [formItems, setFormItems] = useState<QuoteItem[]>([emptyItem()]);
  const [formDiscount, setFormDiscount] = useState(0);
  const [productSearchTerms, setProductSearchTerms] = useState<Record<number, string>>({});

  // Customer form state (controlled for formatting)
  const [fCustomerName, setFCustomerName] = useState("");
  const [fCustomerEmail, setFCustomerEmail] = useState("");
  const [fCustomerPhone, setFCustomerPhone] = useState("");
  const [fCustomerCpfCnpj, setFCustomerCpfCnpj] = useState("");
  const [fAddressZip, setFAddressZip] = useState("");
  const [fAddressStreet, setFAddressStreet] = useState("");
  const [fAddressNumber, setFAddressNumber] = useState("");
  const [fAddressComplement, setFAddressComplement] = useState("");
  const [fAddressNeighborhood, setFAddressNeighborhood] = useState("");
  const [fAddressCity, setFAddressCity] = useState("");
  const [fAddressState, setFAddressState] = useState("");
  const [fValidUntil, setFValidUntil] = useState("");
  const [fNotes, setFNotes] = useState("");
  const [fInternalNotes, setFInternalNotes] = useState("");
  const [loadingCep, setLoadingCep] = useState(false);
  const [loadingCnpj, setLoadingCnpj] = useState(false);

  // View state
  const [viewing, setViewing] = useState<Quote | null>(null);
  const [viewItems, setViewItems] = useState<QuoteItem[]>([]);
  const [viewOpen, setViewOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("quotes").select("*").order("created_at", { ascending: false });
    if (statusFilter) q = q.eq("status", statusFilter as any);
    if (searchTerm.trim()) {
      const safe = sanitizeSearchInput(searchTerm);
      if (safe) q = q.or(`customer_name.ilike.%${safe}%,quote_number.eq.${parseInt(safe) || 0}`);
    }
    const { data } = await q;
    setQuotes((data ?? []) as Quote[]);
    setLoading(false);
  }, [statusFilter, searchTerm]);

  const loadProducts = async () => {
    const { data } = await supabase.from("products").select("id, name, price, sale_price").eq("is_active", true).order("name");
    setProducts(data ?? []);
  };

  useEffect(() => { load(); loadProducts(); }, [load]);

  // CEP lookup
  const lookupCep = useCallback(async (cep: string) => {
    const digits = cep.replace(/\D/g, "");
    if (digits.length !== 8) return;
    setLoadingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setFAddressStreet(data.logradouro || "");
        setFAddressNeighborhood(data.bairro || "");
        setFAddressCity(data.localidade || "");
        setFAddressState(data.uf || "");
      }
    } catch { /* ignore */ }
    setLoadingCep(false);
  }, []);

  // CNPJ lookup
  const lookupCnpj = useCallback(async (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    if (digits.length !== 14) return;
    setLoadingCnpj(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`);
      const data = await res.json();
      if (data.razao_social) {
        setFCustomerName(prev => prev || data.razao_social);
        if (data.cep) {
          setFAddressZip(formatCep(data.cep));
          setFAddressStreet(data.logradouro || "");
          setFAddressNumber(data.numero || "");
          setFAddressComplement(data.complemento || "");
          setFAddressNeighborhood(data.bairro || "");
          setFAddressCity(data.municipio || "");
          setFAddressState(data.uf || "");
        }
        if (data.ddd_telefone_1) {
          setFCustomerPhone(prev => prev || formatPhone(data.ddd_telefone_1.replace(/\D/g, "")));
        }
      }
    } catch { /* ignore */ }
    setLoadingCnpj(false);
  }, []);

  const resetForm = () => {
    setFCustomerName(""); setFCustomerEmail(""); setFCustomerPhone(""); setFCustomerCpfCnpj("");
    setFAddressZip(""); setFAddressStreet(""); setFAddressNumber(""); setFAddressComplement("");
    setFAddressNeighborhood(""); setFAddressCity(""); setFAddressState("");
    setFValidUntil(""); setFNotes(""); setFInternalNotes("");
    setFormItems([emptyItem()]); setFormDiscount(0); setProductSearchTerms({});
  };

  // Open create form
  const openCreate = () => {
    setEditing(null);
    resetForm();
    setOpen(true);
  };

  // Open edit form
  const openEdit = async (quote: Quote) => {
    setEditing(quote);
    setFCustomerName(quote.customer_name);
    setFCustomerEmail(quote.customer_email || "");
    setFCustomerPhone(quote.customer_phone || "");
    setFCustomerCpfCnpj("");
    setFAddressZip(""); setFAddressStreet(""); setFAddressNumber(""); setFAddressComplement("");
    setFAddressNeighborhood(""); setFAddressCity(""); setFAddressState("");
    setFValidUntil(quote.valid_until || "");
    setFNotes(quote.notes || "");
    setFInternalNotes(quote.internal_notes || "");
    setFormDiscount(Number(quote.discount));
    setProductSearchTerms({});
    const { data: items } = await supabase.from("quote_items").select("*").eq("quote_id", quote.id).order("sort_order");
    setFormItems(items && items.length > 0 ? (items as QuoteItem[]) : [emptyItem()]);
    setOpen(true);
  };

  // View quote
  const openView = async (quote: Quote) => {
    setViewing(quote);
    const { data: items } = await supabase.from("quote_items").select("*").eq("quote_id", quote.id).order("sort_order");
    setViewItems((items ?? []) as QuoteItem[]);
    setViewOpen(true);
  };

  // Item helpers
  const updateItem = (index: number, field: keyof QuoteItem, value: any) => {
    setFormItems(prev => {
      const updated = [...prev];
      (updated[index] as any)[field] = value;
      if (field === "quantity" || field === "unit_price") {
        updated[index].subtotal = Number(updated[index].quantity) * Number(updated[index].unit_price);
      }
      return updated;
    });
  };

  const selectProduct = (idx: number, product: any) => {
    const price = product.sale_price && Number(product.sale_price) < Number(product.price) ? Number(product.sale_price) : Number(product.price);
    setFormItems(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], product_name: product.name, unit_price: price, subtotal: price * updated[idx].quantity };
      return updated;
    });
    setProductSearchTerms(prev => ({ ...prev, [idx]: "" }));
  };

  const filteredProducts = (idx: number) => {
    const term = (productSearchTerms[idx] || "").toLowerCase();
    if (!term) return [];
    return products.filter(p => p.name.toLowerCase().includes(term)).slice(0, 8);
  };

  const addItem = () => setFormItems(prev => [...prev, emptyItem()]);
  const removeItem = (index: number) => {
    if (formItems.length <= 1) return;
    setFormItems(prev => prev.filter((_, i) => i !== index));
  };

  const formSubtotal = formItems.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unit_price)), 0);
  const formTotal = Math.max(0, formSubtotal - formDiscount);

  // Submit
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const payload = {
      customer_name: fCustomerName,
      customer_email: fCustomerEmail || null,
      customer_phone: fCustomerPhone || null,
      notes: fNotes || null,
      internal_notes: fInternalNotes || null,
      valid_until: fValidUntil || null,
      subtotal: formSubtotal,
      discount: formDiscount,
      total: formTotal,
      created_by: user?.id || null,
      updated_at: new Date().toISOString(),
    };

    let quoteId: string;

    if (editing) {
      const { error } = await supabase.from("quotes").update(payload).eq("id", editing.id);
      if (error) { toast({ title: "Erro ao atualizar", variant: "destructive" }); return; }
      quoteId = editing.id;
      await supabase.from("quote_items").delete().eq("quote_id", quoteId);
    } else {
      const { data, error } = await supabase.from("quotes").insert(payload).select().single();
      if (error || !data) { toast({ title: "Erro ao criar", variant: "destructive" }); return; }
      quoteId = data.id;
    }

    const itemsPayload = formItems
      .filter(item => item.product_name.trim())
      .map((item, i) => ({
        quote_id: quoteId,
        product_name: item.product_name,
        description: item.description || null,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
        subtotal: Number(item.quantity) * Number(item.unit_price),
        sort_order: i,
      }));

    if (itemsPayload.length > 0) {
      await supabase.from("quote_items").insert(itemsPayload);
    }

    toast({ title: editing ? "Orçamento atualizado!" : "Orçamento criado!" });
    setOpen(false);
    setEditing(null);
    load();
  };

  // Status update
  const updateStatus = async (quote: Quote, newStatus: string) => {
    const updates: any = { status: newStatus, updated_at: new Date().toISOString() };
    if (newStatus === "enviado" && !quote.sent_at) updates.sent_at = new Date().toISOString();
    await supabase.from("quotes").update(updates).eq("id", quote.id);
    toast({ title: `Status alterado para ${STATUS_LABELS[newStatus]}` });
    load();
    if (viewing?.id === quote.id) setViewing({ ...quote, ...updates });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir orçamento?")) return;
    await supabase.from("quotes").delete().eq("id", id);
    toast({ title: "Orçamento excluído" });
    load();
  };

  // WhatsApp
  const sendWhatsApp = async (quote: Quote) => {
    const { data: items } = await supabase.from("quote_items").select("*").eq("quote_id", quote.id).order("sort_order");
    const itemsList = (items ?? [])
      .map((item: any, i: number) => `${i + 1}. ${item.product_name} - ${item.quantity}x R$ ${Number(item.unit_price).toFixed(2)} = R$ ${Number(item.subtotal).toFixed(2)}`)
      .join("\n");
    const validUntil = quote.valid_until ? new Date(quote.valid_until + "T12:00:00").toLocaleDateString("pt-BR") : "Não informada";
    const message = `*ORÇAMENTO #${quote.quote_number} - Gráfica ImPlotter*\n\nOlá ${quote.customer_name}!\n\nSegue seu orçamento:\n\n${itemsList}\n\n` +
      `Subtotal: R$ ${Number(quote.subtotal).toFixed(2)}\n` +
      (Number(quote.discount) > 0 ? `Desconto: -R$ ${Number(quote.discount).toFixed(2)}\n` : "") +
      `*TOTAL: R$ ${Number(quote.total).toFixed(2)}*\n\nValidade: ${validUntil}\n` +
      (quote.notes ? `\nObs: ${quote.notes}\n` : "") +
      `\nAguardamos seu retorno! 😊`;
    const phone = (quote.customer_phone || "").replace(/\D/g, "");
    const url = `https://wa.me/${phone.startsWith("55") ? phone : "55" + phone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
    if (quote.status === "rascunho") await updateStatus(quote, "enviado");
  };

  const handlePDF = async (quote: Quote) => {
    const { data: items } = await supabase.from("quote_items").select("*").eq("quote_id", quote.id).order("sort_order");
    generateQuotePDF(quote, (items ?? []) as QuoteItem[]);
  };

  const handlePremiumPDF = async (quote: Quote) => {
    const { data: items } = await supabase.from("quote_items").select("*").eq("quote_id", quote.id).order("sort_order");
    generatePremiumProposalPDF(quote, (items ?? []) as QuoteItem[]);
  };

  const handleReceipt = async (quote: Quote) => {
    const { data: items } = await supabase.from("quote_items").select("*").eq("quote_id", quote.id).order("sort_order");
    generateReceiptPDF({
      type: "recibo",
      documentNumber: quote.quote_number,
      date: quote.created_at,
      customer: { name: quote.customer_name, email: quote.customer_email, phone: quote.customer_phone },
      items: ((items ?? []) as QuoteItem[]).map(it => ({ description: it.product_name + (it.description ? ` – ${it.description}` : ""), quantity: it.quantity, unitPrice: it.unit_price, subtotal: it.subtotal })),
      subtotal: quote.subtotal,
      discount: quote.discount,
      total: quote.total,
      notes: quote.notes,
    });
  };

  const convertToOrder = async (quote: Quote) => {
    if (!confirm("Aprovar orçamento e criar venda manual?")) return;
    const { data: items } = await supabase.from("quote_items").select("*").eq("quote_id", quote.id).order("sort_order");
    const { data: order, error } = await supabase.from("orders").insert({
      customer_name: quote.customer_name,
      customer_email: quote.customer_email || `orcamento-${Date.now()}@implotter.local`,
      customer_phone: quote.customer_phone,
      subtotal: Number(quote.subtotal),
      discount: Number(quote.discount),
      total: Number(quote.total),
      notes: quote.notes,
      status: "pagamento_confirmado" as any,
      origin: "orcamento",
      payment_method: "pix",
    }).select().single();
    if (error || !order) { toast({ title: "Erro ao converter", variant: "destructive" }); return; }
    const orderItems = (items ?? []).map((item: any) => ({
      order_id: order.id,
      product_name: item.product_name,
      quantity: Number(item.quantity),
      unit_price: Number(item.unit_price),
      subtotal: Number(item.subtotal),
    }));
    await supabase.from("order_items").insert(orderItems);
    await supabase.from("order_status_history").insert({ order_id: order.id, status: "pagamento_confirmado" as any, notes: "Orçamento aprovado - venda manual criada" });
    await updateStatus(quote, "aceito");
    toast({ title: `Venda manual #${order.order_number} criada a partir do orçamento!` });
  };

  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString("pt-BR") : "—";

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground flex items-center gap-3">
            <FileText className="w-8 h-8 text-highlight" />
            Orçamentos
          </h1>
          <p className="text-muted-foreground text-sm mt-1">{quotes.length} orçamento(s)</p>
        </div>
        <Button variant="hero" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" /> Novo Orçamento
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por cliente ou nº..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 bg-secondary border-border" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground">
          <option value="">Todos os status</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium text-muted-foreground">#</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Cliente</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Data</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Validade</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Total</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map(q => (
                <tr key={q.id} className="border-t border-border hover:bg-muted/30">
                  <td className="p-3 font-mono font-bold text-foreground">{q.quote_number}</td>
                  <td className="p-3">
                    <p className="font-medium text-foreground">{q.customer_name}</p>
                    {q.customer_phone && <p className="text-xs text-muted-foreground">{q.customer_phone}</p>}
                  </td>
                  <td className="p-3 text-muted-foreground">{formatDate(q.created_at)}</td>
                  <td className="p-3 text-muted-foreground">{q.valid_until ? formatDate(q.valid_until) : "—"}</td>
                  <td className="p-3 font-bold text-foreground">R$ {Number(q.total).toFixed(2)}</td>
                  <td className="p-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[q.status] || ""}`}>
                      {STATUS_LABELS[q.status] || q.status}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center justify-end gap-1 flex-wrap">
                      <Button variant="outline" size="icon" className="h-8 w-8 text-blue-500 border-blue-100 hover:bg-blue-50" onClick={() => openView(q)} title="Visualizar"><Eye className="w-4 h-4" /></Button>
                      <Button variant="outline" size="icon" className="h-8 w-8 text-amber-500 border-amber-100 hover:bg-amber-50" onClick={() => openEdit(q)} title="Editar"><Pencil className="w-4 h-4" /></Button>
                      <Button variant="outline" size="icon" className="h-8 w-8 text-slate-500 border-slate-100 hover:bg-slate-50" onClick={() => handlePDF(q)} title="Orçamento Simples"><FileText className="w-4 h-4" /></Button>
                      <Button variant="outline" size="icon" className="h-8 w-8 text-highlight border-highlight/20 hover:bg-highlight/10 shadow-glow-sm" onClick={() => handlePremiumPDF(q)} title="Proposta Premium"><Sparkles className="w-4 h-4" /></Button>
                      <Button variant="outline" size="icon" className="h-8 w-8 text-success border-success/20 hover:bg-success/10" onClick={() => handleReceipt(q)} title="Gerar Recibo"><FileText className="w-4 h-4" /></Button>
                      <Button variant="outline" size="icon" className="h-8 w-8 text-emerald-600 border-emerald-100 hover:bg-emerald-50" onClick={() => sendWhatsApp(q)} title="WhatsApp"><Send className="w-4 h-4" /></Button>
                      {q.status !== "aceito" && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-success hover:text-success" onClick={() => updateStatus(q, "aceito")} title="Aceitar"><CheckCircle className="w-4 h-4" /></Button>
                      )}
                      {q.status !== "recusado" && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => updateStatus(q, "recusado")} title="Recusar"><XCircle className="w-4 h-4" /></Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(q.id)} title="Excluir"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && quotes.length === 0 && (
                <tr><td colSpan={7} className="p-12 text-center text-muted-foreground">Nenhum orçamento encontrado</td></tr>
              )}
              {loading && (
                <tr><td colSpan={7} className="p-12 text-center text-muted-foreground">
                  <div className="w-6 h-6 border-2 border-highlight border-t-transparent rounded-full animate-spin mx-auto" />
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== CREATE / EDIT DIALOG ===== */}
      <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) { setEditing(null); resetForm(); } }}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? `Editar Orçamento #${editing.quote_number}` : "Novo Orçamento"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Customer info */}
            <div className="bg-secondary/50 rounded-xl p-4 space-y-4 border border-border">
              <h3 className="font-display font-bold text-foreground text-sm">Dados do Cliente</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Nome *</label>
                  <Input value={fCustomerName} onChange={e => setFCustomerName(e.target.value)} required />
                </div>
                <div>
                  <label className="text-sm font-medium">CPF/CNPJ</label>
                  <Input
                    value={fCustomerCpfCnpj}
                    onChange={e => {
                      const formatted = formatCpfCnpj(e.target.value);
                      setFCustomerCpfCnpj(formatted);
                      if (formatted.replace(/\D/g, "").length === 14) lookupCnpj(formatted);
                    }}
                    placeholder="000.000.000-00 ou 00.000.000/0000-00"
                  />
                  {loadingCnpj && <span className="text-xs text-muted-foreground">Buscando CNPJ...</span>}
                </div>
                <div>
                  <label className="text-sm font-medium">Telefone</label>
                  <Input value={fCustomerPhone} onChange={e => setFCustomerPhone(formatPhone(e.target.value))} placeholder="(00) 00000-0000" />
                </div>
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <Input type="email" value={fCustomerEmail} onChange={e => setFCustomerEmail(e.target.value)} placeholder="opcional" />
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="bg-secondary/50 rounded-xl p-4 space-y-3 border border-border">
              <h3 className="font-display font-bold text-foreground text-sm">Endereço <span className="font-normal text-muted-foreground">(opcional)</span></h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="col-span-1">
                  <label className="text-sm font-medium">CEP</label>
                  <Input
                    value={fAddressZip}
                    onChange={e => {
                      const formatted = formatCep(e.target.value);
                      setFAddressZip(formatted);
                      if (formatted.replace(/\D/g, "").length === 8) lookupCep(formatted);
                    }}
                    placeholder="00000-000"
                  />
                  {loadingCep && <span className="text-xs text-muted-foreground">Buscando CEP...</span>}
                </div>
                <div className="col-span-2 sm:col-span-3">
                  <label className="text-sm font-medium">Rua</label>
                  <Input value={fAddressStreet} onChange={e => setFAddressStreet(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-sm font-medium">Número</label>
                  <Input value={fAddressNumber} onChange={e => setFAddressNumber(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium">Complemento</label>
                  <Input value={fAddressComplement} onChange={e => setFAddressComplement(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium">Bairro</label>
                  <Input value={fAddressNeighborhood} onChange={e => setFAddressNeighborhood(e.target.value)} />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="text-sm font-medium">Cidade</label>
                    <Input value={fAddressCity} onChange={e => setFAddressCity(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">UF</label>
                    <Input value={fAddressState} onChange={e => setFAddressState(e.target.value)} maxLength={2} className="uppercase" />
                  </div>
                </div>
              </div>
            </div>

            {/* Validity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Validade do orçamento</label>
                <Input type="date" value={fValidUntil} onChange={e => setFValidUntil(e.target.value)} />
              </div>
            </div>

            {/* Items */}
            <div className="bg-secondary/50 rounded-xl p-4 border border-border space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-display font-bold text-foreground text-sm">Itens do Orçamento</h3>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="w-3 h-3 mr-1" /> Item
                </Button>
              </div>

              {formItems.map((item, i) => (
                <div key={i} className="bg-background rounded-lg p-3 border border-border space-y-2">
                  {/* Product search */}
                  <div className="relative">
                    <label className="text-xs text-muted-foreground">Buscar produto cadastrado</label>
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar produto..."
                        className="pl-8 text-sm"
                        value={productSearchTerms[i] ?? ""}
                        onChange={e => setProductSearchTerms(prev => ({ ...prev, [i]: e.target.value }))}
                      />
                    </div>
                    {filteredProducts(i).length > 0 && (
                      <div className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {filteredProducts(i).map(p => (
                          <button
                            key={p.id}
                            type="button"
                            className="w-full text-left px-3 py-2 hover:bg-accent text-sm flex justify-between"
                            onClick={() => selectProduct(i, p)}
                          >
                            <span className="text-foreground">{p.name}</span>
                            <span className="text-muted-foreground">R$ {Number(p.sale_price && Number(p.sale_price) < Number(p.price) ? p.sale_price : p.price).toFixed(2)}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-start">
                    <div className="sm:col-span-4">
                      <label className="text-xs text-muted-foreground">Produto/Serviço</label>
                      <Input placeholder="Nome do produto/serviço" value={item.product_name} onChange={e => updateItem(i, "product_name", e.target.value)} className="text-sm" />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="text-xs text-muted-foreground">Descrição</label>
                      <Input placeholder="Descrição" value={item.description} onChange={e => updateItem(i, "description", e.target.value)} className="text-sm" />
                    </div>
                    <div className="sm:col-span-1">
                      <label className="text-xs text-muted-foreground">Qtd</label>
                      <Input type="number" min="1" value={item.quantity} onChange={e => updateItem(i, "quantity", Number(e.target.value))} className="text-sm" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-xs text-muted-foreground">Valor Unit.</label>
                      <Input type="number" step="0.01" min="0" value={item.unit_price} onChange={e => updateItem(i, "unit_price", Number(e.target.value))} className="text-sm" />
                    </div>
                    <div className="sm:col-span-1 flex items-end justify-end h-full pb-2">
                      <span className="text-sm font-bold text-foreground">R$ {(Number(item.quantity) * Number(item.unit_price)).toFixed(2)}</span>
                    </div>
                    <div className="sm:col-span-1 flex items-end justify-end h-full pb-1">
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeItem(i)} disabled={formItems.length <= 1}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Totals */}
              <div className="flex flex-col items-end gap-2 pt-3 border-t border-border">
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-bold text-foreground w-28 text-right">R$ {formSubtotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-muted-foreground">Desconto:</span>
                  <Input type="number" step="0.01" min="0" value={formDiscount} onChange={e => setFormDiscount(Number(e.target.value))} className="w-28 text-right text-sm" />
                </div>
                <div className="flex items-center gap-3 text-lg border-t border-border pt-2">
                  <span className="font-bold text-foreground">Total:</span>
                  <span className="font-display font-bold text-foreground w-28 text-right">R$ {formTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Observações (visíveis ao cliente)</label>
                <Textarea rows={3} value={fNotes} onChange={e => setFNotes(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">Notas internas</label>
                <Textarea rows={3} value={fInternalNotes} onChange={e => setFInternalNotes(e.target.value)} />
              </div>
            </div>

            <Button type="submit" variant="hero" className="w-full">
              {editing ? "Salvar Alterações" : "Criar Orçamento"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ===== VIEW DIALOG ===== */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          {viewing && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  Orçamento #{viewing.quote_number}
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[viewing.status] || ""}`}>
                    {STATUS_LABELS[viewing.status]}
                  </span>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-5">
                <div className="bg-secondary/50 rounded-xl p-4 border border-border">
                  <h3 className="text-sm font-bold text-foreground mb-2">Cliente</h3>
                  <p className="text-foreground font-medium">{viewing.customer_name}</p>
                  {viewing.customer_phone && <p className="text-sm text-muted-foreground">{viewing.customer_phone}</p>}
                  {viewing.customer_email && <p className="text-sm text-muted-foreground">{viewing.customer_email}</p>}
                </div>

                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="bg-secondary/50 rounded-lg p-3 border border-border">
                    <p className="text-muted-foreground text-xs">Criado em</p>
                    <p className="font-medium text-foreground">{formatDate(viewing.created_at)}</p>
                  </div>
                  <div className="bg-secondary/50 rounded-lg p-3 border border-border">
                    <p className="text-muted-foreground text-xs">Validade</p>
                    <p className="font-medium text-foreground">{viewing.valid_until ? formatDate(viewing.valid_until) : "—"}</p>
                  </div>
                  <div className="bg-secondary/50 rounded-lg p-3 border border-border">
                    <p className="text-muted-foreground text-xs">Enviado em</p>
                    <p className="font-medium text-foreground">{viewing.sent_at ? formatDate(viewing.sent_at) : "—"}</p>
                  </div>
                </div>

                <div className="bg-secondary/50 rounded-xl p-4 border border-border">
                  <h3 className="text-sm font-bold text-foreground mb-3">Itens</h3>
                  <div className="space-y-2">
                    {viewItems.map((item, i) => (
                      <div key={i} className="flex justify-between items-start bg-background rounded-lg p-3 border border-border">
                        <div className="flex-1">
                          <p className="font-medium text-foreground text-sm">{item.product_name}</p>
                          {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
                          <p className="text-xs text-muted-foreground mt-0.5">{item.quantity}x R$ {Number(item.unit_price).toFixed(2)}</p>
                        </div>
                        <span className="font-bold text-foreground text-sm">R$ {Number(item.subtotal).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-border space-y-1 text-right">
                    <p className="text-sm text-muted-foreground">Subtotal: R$ {Number(viewing.subtotal).toFixed(2)}</p>
                    {Number(viewing.discount) > 0 && <p className="text-sm text-success">Desconto: -R$ {Number(viewing.discount).toFixed(2)}</p>}
                    <p className="font-display text-xl font-bold text-foreground">Total: R$ {Number(viewing.total).toFixed(2)}</p>
                  </div>
                </div>

                {viewing.notes && (
                  <div className="bg-secondary/50 rounded-xl p-4 border border-border">
                    <h3 className="text-sm font-bold text-foreground mb-1">Observações</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{viewing.notes}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <Button variant="outline" onClick={() => handlePDF(viewing)} className="text-sm"><FileText className="w-4 h-4 mr-1.5" /> PDF</Button>
                  <Button variant="outline" onClick={() => sendWhatsApp(viewing)} className="text-sm"><Send className="w-4 h-4 mr-1.5" /> WhatsApp</Button>
                  <Button variant="outline" onClick={() => {
                    const link = `${window.location.origin}/orcamento/${viewing.id}`;
                    navigator.clipboard.writeText(link);
                    toast({ title: "Link copiado!", description: link });
                  }} className="text-sm"><Share2 className="w-4 h-4 mr-1.5" /> Link</Button>
                  <Button variant="outline" onClick={() => updateStatus(viewing, "aceito")} className="text-sm text-success border-success/30 hover:bg-success/10" disabled={viewing.status === "aceito"}><CheckCircle className="w-4 h-4 mr-1.5" /> Aceitar</Button>
                  <Button variant="outline" onClick={() => updateStatus(viewing, "recusado")} className="text-sm text-destructive border-destructive/30 hover:bg-destructive/10" disabled={viewing.status === "recusado"}><XCircle className="w-4 h-4 mr-1.5" /> Recusar</Button>
                </div>

                {viewing.status === "aceito" && (
                  <Button variant="hero" className="w-full" onClick={() => convertToOrder(viewing)}>
                    <ShoppingCart className="w-4 h-4 mr-2" /> Converter em Pedido
                  </Button>
                )}

                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">Alterar status:</span>
                  <select value={viewing.status} onChange={e => updateStatus(viewing, e.target.value)} className="rounded-lg border border-border bg-secondary px-3 py-1.5 text-sm text-foreground">
                    {Object.entries(STATUS_LABELS).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
                  </select>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminOrcamentos;
