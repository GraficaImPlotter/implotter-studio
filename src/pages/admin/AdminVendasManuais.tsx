import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, FileText, Trash2, Search, Eye, Pencil, Upload, Receipt, ExternalLink, Copy, MessageCircle, QrCode } from "lucide-react";
import { generatePixCode } from "@/lib/pix";
import { generateReceiptPDF } from "@/lib/receipt-pdf";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "react-router-dom";
import { useSettings } from "@/hooks/use-settings";
import { sanitizeSearchInput } from "@/lib/sanitize-search";
import { validateDocumentFile } from "@/lib/file-validation";

interface SaleItem {
  productId: string | null;
  name: string;
  quantity: number;
  unitPrice: number;
  discount: number;
}

const emptyItem = (): SaleItem => ({ productId: null, name: "", quantity: 1, unitPrice: 0, discount: 0 });

import { ORDER_STATUS_LABELS } from "@/lib/order-status";

const statusLabels = ORDER_STATUS_LABELS;

const statusColors: Record<string, string> = {
  pedido_recebido: "bg-blue-100 text-blue-800",
  aguardando_pagamento: "bg-yellow-100 text-yellow-800",
  pagamento_confirmado: "bg-green-100 text-green-800",
  em_producao: "bg-orange-100 text-orange-800",
  finalizado: "bg-emerald-100 text-emerald-800",
  cancelado: "bg-red-100 text-red-800",
};

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

const AdminVendasManuais = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const { data: companySettings = {} } = useSettings();

  // Form state
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerCpfCnpj, setCustomerCpfCnpj] = useState("");
  const [addressZip, setAddressZip] = useState("");
  const [addressStreet, setAddressStreet] = useState("");
  const [addressNumber, setAddressNumber] = useState("");
  const [addressComplement, setAddressComplement] = useState("");
  const [addressNeighborhood, setAddressNeighborhood] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressState, setAddressState] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<SaleItem[]>([emptyItem()]);
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [searchTerms, setSearchTerms] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const [loadingCnpj, setLoadingCnpj] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const pixInputRef = useRef<HTMLInputElement>(null);
  const nfInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const { data } = await supabase
      .from("orders")
      .select("*")
      .in("origin", ["manual", "orcamento"])
      .order("created_at", { ascending: false });
    setOrders(data ?? []);
  };

  const loadProducts = async () => {
    const [{ data: prods }, { data: kts }] = await Promise.all([
      supabase.from("products").select("id, name, price, sale_price").eq("is_active", true),
      supabase.from("kits").select("id, name, normal_price, promo_price").eq("is_active", true)
    ]);
    const combined = [
      ...(prods || []).map(p => ({ ...p, type: 'product' })),
      ...(kts || []).map(k => ({ id: k.id, name: `[KIT] ${k.name}`, price: k.normal_price, sale_price: k.promo_price, type: 'kit' }))
    ].sort((a, b) => a.name.localeCompare(b.name));
    setProducts(combined);
  };

  useEffect(() => { load(); loadProducts(); }, []);

  const getCompanyData = () => ({
    name: companySettings.company_name || "Gráfica ImPlotter",
    phone: companySettings.phone || "",
    email: companySettings.email || "",
    address: companySettings.address || "",
    city: companySettings.city || "",
  });

  const lookupCep = useCallback(async (cep: string) => {
    const digits = cep.replace(/\D/g, "");
    if (digits.length !== 8) return;
    setLoadingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setAddressStreet(data.logradouro || "");
        setAddressNeighborhood(data.bairro || "");
        setAddressCity(data.localidade || "");
        setAddressState(data.uf || "");
      }
    } catch { /* ignore */ }
    setLoadingCep(false);
  }, []);

  const lookupCnpj = useCallback(async (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    if (digits.length !== 14) return;
    setLoadingCnpj(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`);
      const data = await res.json();
      if (data.razao_social) {
        if (!customerName) setCustomerName(data.razao_social);
        if (data.cep) {
          setAddressZip(formatCep(data.cep));
          setAddressStreet(data.logradouro || "");
          setAddressNumber(data.numero || "");
          setAddressComplement(data.complemento || "");
          setAddressNeighborhood(data.bairro || "");
          setAddressCity(data.municipio || "");
          setAddressState(data.uf || "");
        }
        if (data.ddd_telefone_1 && !customerPhone) {
          setCustomerPhone(formatPhone(data.ddd_telefone_1.replace(/\D/g, "")));
        }
      }
    } catch { /* ignore */ }
    setLoadingCnpj(false);
  }, [customerName, customerPhone]);

  const lookupCustomer = async (term: string) => {
    if (!term || term.length < 3) return;
    const safeTerm = sanitizeSearchInput(term);
    if (!safeTerm) return;
    const { data } = await supabase.from("orders")
      .select("customer_name, customer_email, customer_phone, customer_cpf_cnpj, address_zip, address_street, address_number, address_complement, address_neighborhood, address_city, address_state")
      .or(`customer_cpf_cnpj.eq.${safeTerm},customer_name.ilike.%${safeTerm}%`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      if (!customerName) setCustomerName(data.customer_name || "");
      if (!customerEmail) setCustomerEmail(data.customer_email?.includes("@implotter") ? "" : (data.customer_email || ""));
      if (!customerPhone) setCustomerPhone(data.customer_phone || "");
      if (!customerCpfCnpj) setCustomerCpfCnpj(data.customer_cpf_cnpj || "");
      if (!addressZip) setAddressZip(data.address_zip || "");
      if (!addressStreet) setAddressStreet(data.address_street || "");
      if (!addressNumber) setAddressNumber(data.address_number || "");
      if (!addressComplement) setAddressComplement(data.address_complement || "");
      if (!addressNeighborhood) setAddressNeighborhood(data.address_neighborhood || "");
      if (!addressCity) setAddressCity(data.address_city || "");
      if (!addressState) setAddressState(data.address_state || "");
    }
  };

  const updateItem = (idx: number, patch: Partial<SaleItem>) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, ...patch } : it));
  };

  const removeItem = (idx: number) => {
    setItems(prev => prev.length <= 1 ? [emptyItem()] : prev.filter((_, i) => i !== idx));
  };

  const selectProduct = (idx: number, product: any) => {
    const price = product.sale_price && Number(product.sale_price) < Number(product.price) ? Number(product.sale_price) : Number(product.price);
    updateItem(idx, { productId: product.id, name: product.name, unitPrice: price });
    setSearchTerms(prev => ({ ...prev, [idx]: "" }));
  };

  const subtotal = useMemo(() =>
    items.reduce((sum, it) => {
      const lineTotal = it.unitPrice * it.quantity;
      const lineDiscount = lineTotal * (it.discount / 100);
      return sum + lineTotal - lineDiscount;
    }, 0),
  [items]);

  const total = Math.max(0, subtotal - globalDiscount);

  const resetForm = () => {
    setEditing(null);
    setCustomerName(""); setCustomerEmail(""); setCustomerPhone(""); setCustomerCpfCnpj("");
    setAddressZip(""); setAddressStreet(""); setAddressNumber(""); setAddressComplement("");
    setAddressNeighborhood(""); setAddressCity(""); setAddressState("");
    setPaymentMethod("pix"); setNotes("");
    setItems([emptyItem()]); setGlobalDiscount(0); setSearchTerms({});
  };

  const openEdit = async (order: any) => {
    setEditing(order);
    setCustomerName(order.customer_name || "");
    const email = order.customer_email?.includes("@implotter.local") ? "" : (order.customer_email || "");
    setCustomerEmail(email);
    setCustomerPhone(order.customer_phone || "");
    setCustomerCpfCnpj(order.customer_cpf_cnpj || "");
    setAddressZip(order.address_zip || "");
    setAddressStreet(order.address_street || "");
    setAddressNumber(order.address_number || "");
    setAddressComplement(order.address_complement || "");
    setAddressNeighborhood(order.address_neighborhood || "");
    setAddressCity(order.address_city || "");
    setAddressState(order.address_state || "");
    setPaymentMethod(order.payment_method || "pix");
    setNotes(order.notes || "");
    setGlobalDiscount(Number(order.discount) || 0);
    setSearchTerms({});

    // Load order items
    const { data: orderItems } = await supabase.from("order_items").select("*").eq("order_id", order.id);
    if (orderItems && orderItems.length > 0) {
      setItems(orderItems.map((oi: any) => ({
        productId: oi.product_id || null,
        name: oi.product_name,
        quantity: oi.quantity,
        unitPrice: Number(oi.unit_price),
        discount: 0,
      })));
    } else {
      setItems([emptyItem()]);
    }

    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) return;
    const validItems = items.filter(it => it.name.trim());
    if (validItems.length === 0) { toast({ title: "Adicione pelo menos um item", variant: "destructive" }); return; }

    setSubmitting(true);
    try {
      const orderPayload = {
        customer_name: customerName,
        customer_email: customerEmail || `manual-${Date.now()}@implotter.local`,
        customer_phone: customerPhone || null,
        customer_cpf_cnpj: customerCpfCnpj || null,
        address_zip: addressZip || null,
        address_street: addressStreet || null,
        address_number: addressNumber || null,
        address_complement: addressComplement || null,
        address_neighborhood: addressNeighborhood || null,
        address_city: addressCity || null,
        address_state: addressState || null,
        subtotal: Math.round(subtotal * 100) / 100,
        discount: Math.round(globalDiscount * 100) / 100,
        total: Math.round(total * 100) / 100,
        payment_method: paymentMethod,
        notes: notes || null,
      };

      let orderId: string;
      let orderNumber: number;

      if (editing) {
        // Update existing order
        const { error } = await supabase.from("orders").update(orderPayload).eq("id", editing.id);
        if (error) { toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" }); return; }
        orderId = editing.id;
        orderNumber = editing.order_number;

        // Delete old items and re-insert
        await supabase.from("order_items").delete().eq("order_id", orderId);
      } else {
        // Create new order
        const { data: order, error: orderError } = await supabase.from("orders").insert([{
          ...orderPayload,
          origin: "manual",
          status: "aguardando_pagamento" as any,
        }]).select().single();

        if (orderError || !order) {
          toast({ title: "Erro ao criar pedido", description: orderError?.message, variant: "destructive" });
          return;
        }
        orderId = order.id;
        orderNumber = order.order_number;

        // Create initial status history
        await supabase.from("order_status_history").insert([{
          order_id: orderId,
          status: "aguardando_pagamento" as any,
          notes: "Venda manual registrada — aguardando pagamento",
        }]);

        // CRM Integration: convert lead
        if (customerPhone || customerEmail) {
          let q = supabase.from("leads").update({ status: "convertido" });
          if (customerEmail && customerPhone) {
            const safeEmail = sanitizeSearchInput(customerEmail);
            const safePhone = sanitizeSearchInput(customerPhone);
            if (safeEmail && safePhone) q = q.or(`email.eq.${safeEmail},phone.eq.${safePhone}`);
          } else if (customerEmail) {
            q = q.eq("email", customerEmail);
          } else {
            q = q.eq("phone", customerPhone);
          }
          await q;
        }
      }

      // Insert items
      const orderItems = validItems.map(it => {
        const lineSubtotal = Math.round(it.unitPrice * it.quantity * (1 - it.discount / 100) * 100) / 100;
        return {
          order_id: orderId,
          product_id: it.productId || null,
          product_name: it.name,
          quantity: it.quantity,
          unit_price: it.unitPrice,
          subtotal: lineSubtotal,
        };
      });
      await supabase.from("order_items").insert(orderItems);

      toast({ title: editing ? "Venda atualizada!" : "Venda registrada como pedido!", description: `Pedido #${orderNumber}` });
      setOpen(false); resetForm(); load();
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProducts = (idx: number) => {
    const term = (searchTerms[idx] || "").toLowerCase();
    if (!term) return [];
    return products.filter(p => p.name.toLowerCase().includes(term)).slice(0, 8);
  };

  const handleReceipt = async (order: any) => {
    const { data: orderItems } = await supabase.from("order_items").select("*").eq("order_id", order.id);
    const receiptItems = (orderItems ?? []).map((oi: any) => ({
      description: oi.product_name,
      quantity: oi.quantity,
      unitPrice: Number(oi.unit_price),
      subtotal: Number(oi.subtotal),
    }));
    if (receiptItems.length === 0) {
      receiptItems.push({ description: "Pedido", quantity: 1, unitPrice: Number(order.total), subtotal: Number(order.total) });
    }
    const email = order.customer_email?.includes("@implotter.local") ? "" : (order.customer_email || "");
    
    // Build customer object with all available info
    const customerData: any = { 
      name: order.customer_name, 
      email, 
      phone: order.customer_phone || null,
      cpf_cnpj: order.customer_cpf_cnpj || null,
    };
    
    // Add address if available
    if (order.address_street || order.address_city) {
      customerData.address = {
        street: order.address_street || "",
        number: order.address_number || "",
        complement: order.address_complement || "",
        neighborhood: order.address_neighborhood || "",
        city: order.address_city || "",
        state: order.address_state || "",
        zip: order.address_zip || "",
      };
    }
    
    generateReceiptPDF({
      type: "recibo",
      documentNumber: order.order_number,
      date: order.created_at,
      customer: customerData,
      items: receiptItems,
      subtotal: Number(order.subtotal),
      discount: Number(order.discount),
      total: Number(order.total),
      paymentMethod: order.payment_method,
      notes: order.notes,
      company: getCompanyData(),
    });
  };

  const handleDuplicate = async (order: any) => {
    await openEdit(order);
    setEditing(null);
    setOpen(true);
    toast({ title: "Venda duplicada", description: "Pronta para ser salva como um novo pedido." });
  };

  const openWhatsApp = (order: any) => {
    if (!order.customer_phone) {
      toast({ title: "Cliente sem telefone cadastrado", variant: "destructive" });
      return;
    }
    const phone = order.customer_phone.replace(/\D/g, "");
    const msg = encodeURIComponent(`Olá ${order.customer_name}, sua venda #${order.order_number} no valor de R$ ${Number(order.total).toFixed(2)} foi registrada. Status: ${statusLabels[order.status] || order.status}.`);
    window.open(`https://wa.me/55${phone}?text=${msg}`, "_blank");
  };

  const uploadDocument = async (orderId: string, field: "pix_receipt_url" | "invoice_url", file: File) => {
    // ESC-002: Validate file before upload
    const validation = validateDocumentFile(file);
    if (!validation.valid) {
      toast({ title: "Arquivo inválido", description: validation.error, variant: "destructive" });
      return;
    }

    setUploadingDoc(field);
    try {
      const ext = file.name.split('.').pop();
      const filePath = `orders/${orderId}/${field}_${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(filePath);
      const { error: updateError } = await supabase.from("orders").update({ [field]: publicUrl }).eq("id", orderId);
      if (updateError) throw updateError;

      setEditing((prev: any) => prev ? { ...prev, [field]: publicUrl } : prev);
      toast({ title: field === "pix_receipt_url" ? "Recibo PIX anexado!" : "Nota Fiscal anexada!" });
      load();
    } catch (err: any) {
      toast({ title: "Erro ao enviar arquivo", description: err.message, variant: "destructive" });
    } finally {
      setUploadingDoc(null);
    }
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Vendas Manuais</h1>
          <p className="text-sm text-muted-foreground mt-1">Vendas registradas manualmente e orçamentos aprovados</p>
        </div>
        <Button variant="hero" onClick={() => { resetForm(); setOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Nova Venda
        </Button>
      </div>

      {/* Dialog for create/edit */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? `Editar Pedido #${editing.order_number}` : "Registrar Venda Manual"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Cliente */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground border-b border-border pb-1">Dados do Cliente</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Nome *</label>
                  <Input 
                    value={customerName} 
                    onChange={e => {
                      setCustomerName(e.target.value);
                      if (e.target.value.length > 3) lookupCustomer(e.target.value);
                    }} 
                    required 
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">CPF/CNPJ</label>
                  <Input
                    value={customerCpfCnpj}
                    onChange={e => {
                      const formatted = formatCpfCnpj(e.target.value);
                      setCustomerCpfCnpj(formatted);
                      if (formatted.replace(/\D/g, "").length >= 11) lookupCustomer(formatted.replace(/\D/g, ""));
                      if (formatted.replace(/\D/g, "").length === 14) lookupCnpj(formatted);
                    }}
                    placeholder="000.000.000-00 ou 00.000.000/0000-00"
                  />
                  {loadingCnpj && <span className="text-xs text-muted-foreground">Buscando CNPJ...</span>}
                </div>
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <Input type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} placeholder="opcional" />
                </div>
                <div>
                  <label className="text-sm font-medium">Telefone</label>
                  <Input value={customerPhone} onChange={e => setCustomerPhone(formatPhone(e.target.value))} placeholder="(00) 00000-0000" />
                </div>
              </div>
            </div>

            {/* Endereço */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground border-b border-border pb-1">Endereço <span className="font-normal text-muted-foreground">(opcional)</span></h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="col-span-1">
                  <label className="text-sm font-medium">CEP</label>
                  <Input
                    value={addressZip}
                    onChange={e => {
                      const formatted = formatCep(e.target.value);
                      setAddressZip(formatted);
                      if (formatted.replace(/\D/g, "").length === 8) lookupCep(formatted);
                    }}
                    placeholder="00000-000"
                  />
                  {loadingCep && <span className="text-xs text-muted-foreground">Buscando CEP...</span>}
                </div>
                <div className="col-span-2 sm:col-span-3">
                  <label className="text-sm font-medium">Rua</label>
                  <Input value={addressStreet} onChange={e => setAddressStreet(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-sm font-medium">Número</label>
                  <Input value={addressNumber} onChange={e => setAddressNumber(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium">Complemento</label>
                  <Input value={addressComplement} onChange={e => setAddressComplement(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium">Bairro</label>
                  <Input value={addressNeighborhood} onChange={e => setAddressNeighborhood(e.target.value)} />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="text-sm font-medium">Cidade</label>
                    <Input value={addressCity} onChange={e => setAddressCity(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">UF</label>
                    <Input value={addressState} onChange={e => setAddressState(e.target.value)} maxLength={2} className="uppercase" />
                  </div>
                </div>
              </div>
            </div>

            {/* Itens */}
            <div>
              <label className="text-sm font-medium mb-2 block">Itens da Venda</label>
              <div className="space-y-3">
                {items.map((item, idx) => (
                  <div key={idx} className="border border-border rounded-lg p-3 bg-muted/20 space-y-2">
                    <div className="relative">
                      <label className="text-xs text-muted-foreground">Produto</label>
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="Buscar produto cadastrado..."
                          className="pl-8"
                          value={searchTerms[idx] ?? ""}
                          onChange={e => setSearchTerms(prev => ({ ...prev, [idx]: e.target.value }))}
                        />
                      </div>
                      {filteredProducts(idx).length > 0 && (
                        <div className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {filteredProducts(idx).map(p => (
                            <button
                              key={p.id}
                              type="button"
                              className="w-full text-left px-3 py-2 hover:bg-accent text-sm flex justify-between"
                              onClick={() => selectProduct(idx, p)}
                            >
                              <span className="text-foreground">{p.name}</span>
                              <span className="text-muted-foreground">R$ {Number(p.sale_price && Number(p.sale_price) < Number(p.price) ? p.sale_price : p.price).toFixed(2)}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Nome do item</label>
                      <Input value={item.name} onChange={e => updateItem(idx, { name: e.target.value, productId: null })} placeholder="Ou digite manualmente" />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-xs text-muted-foreground">Qtd</label>
                        <Input type="number" min={1} value={item.quantity} onChange={e => updateItem(idx, { quantity: parseInt(e.target.value) || 1 })} />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Preço unit.</label>
                        <Input type="number" step="0.01" min={0} value={item.unitPrice} onChange={e => updateItem(idx, { unitPrice: parseFloat(e.target.value) || 0 })} />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Desc. (%)</label>
                        <Input type="number" step="1" min={0} max={100} value={item.discount} onChange={e => updateItem(idx, { discount: parseFloat(e.target.value) || 0 })} />
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">
                        Subtotal: R$ {((item.unitPrice * item.quantity) * (1 - item.discount / 100)).toFixed(2)}
                      </span>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeItem(idx)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => setItems(prev => [...prev, emptyItem()])}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar item
              </Button>
            </div>

            {/* Totais */}
            <div className="bg-muted/30 rounded-lg p-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-foreground font-medium">R$ {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <label className="text-sm text-muted-foreground whitespace-nowrap">Desconto global (R$)</label>
                <Input type="number" step="0.01" min={0} className="w-32 text-right" value={globalDiscount} onChange={e => setGlobalDiscount(parseFloat(e.target.value) || 0)} />
              </div>
              <div className="flex justify-between text-base font-bold border-t border-border pt-2">
                <span>Total</span>
                <span className="text-primary">R$ {total.toFixed(2)}</span>
              </div>
            </div>

            {/* Pagamento + Obs */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Pagamento</label>
                <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                  <option value="pix">PIX</option><option value="dinheiro">Dinheiro</option><option value="cartao">Cartão</option><option value="boleto">Boleto</option><option value="outro">Outro</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Observações</label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
              </div>
            </div>

            {/* Documentos - só aparece quando editando um pedido existente */}
            {editing && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground border-b border-border pb-1">Anexos do Pedido</h3>
                <input type="file" ref={pixInputRef} className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file && editing) uploadDocument(editing.id, "pix_receipt_url", file);
                  e.target.value = "";
                }} />
                <input type="file" ref={nfInputRef} className="hidden" accept=".pdf,.jpg,.jpeg,.png,.xml" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file && editing) uploadDocument(editing.id, "invoice_url", file);
                  e.target.value = "";
                }} />
                <div className="flex flex-wrap gap-2">
                  {editing.pix_receipt_url ? (
                    <div className="flex gap-1">
                      <Button type="button" variant="outline" size="sm" asChild>
                        <a href={editing.pix_receipt_url} target="_blank" rel="noreferrer">
                          <Receipt className="w-4 h-4 mr-1" /> Recibo PIX <ExternalLink className="w-3 h-3 ml-1" />
                        </a>
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => pixInputRef.current?.click()} disabled={uploadingDoc === "pix_receipt_url"}>
                        {uploadingDoc === "pix_receipt_url" ? "Enviando..." : "Substituir"}
                      </Button>
                    </div>
                  ) : (
                    <Button type="button" variant="outline" size="sm" onClick={() => pixInputRef.current?.click()} disabled={uploadingDoc === "pix_receipt_url"}>
                      <Upload className="w-4 h-4 mr-1" /> {uploadingDoc === "pix_receipt_url" ? "Enviando..." : "Anexar Recibo PIX"}
                    </Button>
                  )}
                  {editing.invoice_url ? (
                    <div className="flex gap-1">
                      <Button type="button" variant="outline" size="sm" asChild>
                        <a href={editing.invoice_url} target="_blank" rel="noreferrer">
                          <FileText className="w-4 h-4 mr-1" /> Nota Fiscal <ExternalLink className="w-3 h-3 ml-1" />
                        </a>
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => nfInputRef.current?.click()} disabled={uploadingDoc === "invoice_url"}>
                        {uploadingDoc === "invoice_url" ? "Enviando..." : "Substituir"}
                      </Button>
                    </div>
                  ) : (
                    <Button type="button" variant="outline" size="sm" onClick={() => nfInputRef.current?.click()} disabled={uploadingDoc === "invoice_url"}>
                      <Upload className="w-4 h-4 mr-1" /> {uploadingDoc === "invoice_url" ? "Enviando..." : "Anexar Nota Fiscal"}
                    </Button>
                  )}
                </div>
              </div>
            )}

            <Button type="submit" variant="hero" className="w-full" disabled={submitting}>
              {submitting ? "Salvando..." : editing ? "Salvar Alterações" : "Registrar Venda"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 font-medium text-muted-foreground">Pedido</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Cliente</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Valor</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Origem</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Data</th>
              <th className="text-right p-3 font-medium text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.id} className="border-t border-border hover:bg-muted/30">
                <td className="p-3 font-mono font-bold text-foreground">#{o.order_number}</td>
                <td className="p-3 font-medium text-foreground">{o.customer_name}</td>
                <td className="p-3 text-foreground">R$ {Number(o.total).toFixed(2)}</td>
                <td className="p-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${o.origin === "orcamento" ? "bg-info/20 text-info" : "bg-muted text-muted-foreground"}`}>
                    {o.origin === "orcamento" ? "Orçamento" : "Manual"}
                  </span>
                </td>
                <td className="p-3">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[o.status] || "bg-muted text-muted-foreground"}`}>
                    {statusLabels[o.status] || o.status}
                  </span>
                </td>
                <td className="p-3 text-muted-foreground">{new Date(o.created_at).toLocaleDateString("pt-BR")}</td>
                <td className="p-3 text-right flex justify-end gap-1">
                  <Button variant="ghost" size="icon" title="Copiar / Duplicar" onClick={() => handleDuplicate(o)}>
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" title="Editar" onClick={() => openEdit(o)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" title="Compartilhar no WhatsApp" onClick={() => openWhatsApp(o)} className="text-success hover:text-success hover:bg-success/10">
                    <MessageCircle className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" title="Ver Pedido" onClick={() => navigate(`/admin/pedidos`)}>
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" title="Gerar Recibo" onClick={() => handleReceipt(o)}>
                    <FileText className="w-4 h-4" />
                  </Button>
                  {o.payment_method === "pix" && (
                    <Button variant="ghost" size="icon" title="Copiar código PIX" onClick={async () => {
                      const pixKey = companySettings.pix_key;
                      const pixName = companySettings.pix_receiver_name;
                      const pixCity = companySettings.pix_city;
                      if (!pixKey || !pixName || !pixCity) {
                        toast({ title: "Configure a chave PIX nas configurações", variant: "destructive" });
                        return;
                      }
                      const code = generatePixCode({ pixKey, receiverName: pixName, city: pixCity, amount: Number(o.total) });
                      await navigator.clipboard.writeText(code);
                      toast({ title: "Código PIX copiado!" });
                    }}>
                      <QrCode className="w-4 h-4" />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            {orders.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Nenhuma venda manual registrada</td></tr>}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
};

export default AdminVendasManuais;
