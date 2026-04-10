import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import AdminLayout from "@/components/layout/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Eye, Trash2, FileText, Tag, Tags, Upload, Receipt, ExternalLink, Search, CheckSquare, MessageCircle, Download, Truck } from "lucide-react";
import { exportToCSV } from "@/lib/export-csv";
import { generateReceiptPDF } from "@/lib/receipt-pdf";
import { generateOrderDocument } from "@/lib/order-document-pdf";
import { generateOrderLabel, generateItemLabel, generateAllItemLabels } from "@/lib/production-label";
import type { LabelOrder, LabelItem } from "@/lib/production-label";
import { validateDocumentFile } from "@/lib/file-validation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Printer } from "lucide-react";

import { ORDER_STATUS_LABELS as statusLabels } from "@/lib/order-status";
import { sanitizeSearchInput } from "@/lib/sanitize-search";

const AdminPedidos = () => {
  const { toast } = useToast();
  const [orders, setOrders] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  
  // Filters
  const [filter, setFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  
  // Bulk Actions
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState("");

  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [companySettings, setCompanySettings] = useState<Record<string, string>>({});
  const [generatingLabel, setGeneratingLabel] = useState(false);
  const pixInputRef = useRef<HTMLInputElement>(null);
  const nfInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.from("site_settings").select("key, value").then(({ data }) => {
      const map: Record<string, string> = {};
      data?.forEach(s => { map[s.key] = s.value || ""; });
      setCompanySettings(map);
    });
  }, []);

  const load = async () => {
    let q = supabase.from("orders").select("*").order("created_at", { ascending: false });
    
    if (filter) q = q.eq("status", filter as any);
    if (dateFrom) q = q.gte("created_at", `${dateFrom}T00:00:00Z`);
    if (dateTo) q = q.lte("created_at", `${dateTo}T23:59:59Z`);
    if (searchTerm) {
      const safe = sanitizeSearchInput(searchTerm);
      if (!safe) return;
      const isNumber = !isNaN(Number(safe)) && safe.trim() !== "";
      if (isNumber) {
        q = q.or(`customer_name.ilike.%${safe}%,customer_email.ilike.%${safe}%,order_number.eq.${Number(safe)}`);
      } else {
        q = q.or(`customer_name.ilike.%${safe}%,customer_email.ilike.%${safe}%`);
      }
    }

    const { data } = await q;
    setOrders(data ?? []);
  };
  
  useEffect(() => { load(); }, [filter, searchTerm, dateFrom, dateTo]);

  const toggleSelectAll = () => {
    if (selectedOrders.size === orders.length && orders.length > 0) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(orders.map(o => o.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedOrders);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedOrders(next);
  };

  const handleBulkUpdate = async () => {
    if (!bulkStatus || selectedOrders.size === 0) return;
    const ids = Array.from(selectedOrders);
    await supabase.from("orders").update({ status: bulkStatus as any, updated_at: new Date().toISOString() }).in("id", ids);
    const historyEntries = ids.map(id => ({ order_id: id, status: bulkStatus as any, notes: "Atualização em massa" }));
    await supabase.from("order_status_history").insert(historyEntries);
    
    toast({ title: "Pedidos atualizados com sucesso" });
    setSelectedOrders(new Set());
    setBulkStatus("");
    load();
  };

  const generateBulkPackingSlip = async () => {
    if (selectedOrders.size === 0) return;
    const ids = Array.from(selectedOrders);
    const selectedOrdersData = orders.filter(o => ids.includes(o.id));
    const { data: allItems } = await supabase.from("order_items").select("*").in("order_id", ids);
    
    const itemsByOrder: Record<string, any[]> = {};
    allItems?.forEach(it => {
      if (!itemsByOrder[it.order_id]) itemsByOrder[it.order_id] = [];
      itemsByOrder[it.order_id].push(it);
    });

    const { generatePackingSlipPDF } = await import("@/lib/packing-slip-pdf");
    generatePackingSlipPDF(selectedOrdersData, itemsByOrder);
  };

  const openDetail = async (order: any) => {
    setSelected(order);
    const [{ data: its }, { data: hist }] = await Promise.all([
      supabase.from("order_items").select("*").eq("order_id", order.id),
      supabase.from("order_status_history").select("*").eq("order_id", order.id).order("created_at", { ascending: false }),
    ]);
    setItems(its ?? []);
    setHistory(hist ?? []);
  };

  const updateStatus = async (orderId: string, newStatus: string, notes: string) => {
    await supabase.from("orders").update({ status: newStatus as any, updated_at: new Date().toISOString() }).eq("id", orderId);
    await supabase.from("order_status_history").insert([{ order_id: orderId, status: newStatus as any, notes: notes || null }]);
    // Fire notification (non-blocking)
    supabase.functions.invoke("notify-order-status", { body: { order_id: orderId, new_status: newStatus } }).catch(() => {});
    toast({ title: `Status atualizado para: ${statusLabels[newStatus]}` });

    // Auto-generate shipping label when changing to pronto_envio
    if (newStatus === "pronto_envio") {
      const orderData = orders.find(o => o.id === orderId) || selected;
      if (orderData && !orderData.tracking_code) {
        generateShippingLabel(orderData);
      }
    }

    load();
    if (selected?.id === orderId) openDetail({ ...selected, status: newStatus });
  };

  const generateShippingLabel = async (order: any) => {
    if (!order.address_zip || !order.address_city) {
      toast({ title: "Pedido sem endereço de entrega completo", variant: "destructive" });
      return;
    }

    setGeneratingLabel(true);
    try {
      // Get order items
      const { data: orderItems } = await supabase.from("order_items").select("*").eq("order_id", order.id);

      // Always quote again to find a valid service for the exact route/order
      let serviceId = order.shipping_service_id;
      try {
        const { data: quoteData } = await supabase.functions.invoke("calculate-shipping", {
          body: {
            cep_destino: (order.address_zip || "").replace(/\D/g, ""),
            cep_origem: (companySettings.cep || companySettings.shipping_origin_cep || "").replace(/\D/g, ""),
            valor: Number(order.total || order.subtotal || 0),
            peso: Math.max(
              0.3,
              (orderItems || []).reduce((sum: number, it: any) => sum + 0.3 * Number(it.quantity || 1), 0)
            ),
            altura: Math.max(2, (orderItems || []).reduce((sum: number, it: any) => sum + 2 * Number(it.quantity || 1), 0)),
            largura: 11,
            comprimento: 16,
          },
        });

        const options = quoteData?.options || [];
        if (Array.isArray(options) && options.length > 0) {
          const normalizedOrderService = (order.shipping_service || "").toLowerCase().trim();
          const match = normalizedOrderService
            ? options.find((s: any) => {
                const name = `${s.company || ""} ${s.name || ""}`.toLowerCase();
                return name.includes(normalizedOrderService) || normalizedOrderService.includes((s.name || "").toLowerCase());
              })
            : null;

          const best = match || options[0];
          if (best?.id) serviceId = best.id;
        }
      } catch {
        // Keep stored serviceId as fallback only if quoting fails
      }

      if (!serviceId) {
        toast({ title: "Não foi possível identificar a transportadora para este trecho", variant: "destructive" });
        setGeneratingLabel(false);
        return;
      }

      if (!order.shipping_service_id) {
        await supabase
          .from("orders")
          .update({ shipping_service_id: serviceId, updated_at: new Date().toISOString() })
          .eq("id", order.id);
      }

      const senderCompanyDocument = (companySettings.cnpj || "").replace(/\D/g, "");
      const senderPersonDocument = (companySettings.cpf_responsavel || "").replace(/\D/g, "");
      const destinationDocument = (order.customer_cpf_cnpj || "").replace(/\D/g, "");
      const destinationCpf = destinationDocument.length === 11 ? destinationDocument : "";
      const destinationCnpj = destinationDocument.length === 14 ? destinationDocument : "";
      const isSameCompanyDocument = Boolean(destinationCnpj) && destinationCnpj === senderCompanyDocument;
      const fallbackDestinationCpf = !destinationCpf && isSameCompanyDocument ? senderPersonDocument : "";

      const { data, error } = await supabase.functions.invoke("generate-shipping-label", {
        body: {
          order_id: order.id,
          service_id: serviceId,
          from: {
            name: companySettings.company_name || "Gráfica ImPlotter",
            phone: companySettings.phone || "",
            email: companySettings.email || "",
            document: senderPersonDocument,
            company_document: senderCompanyDocument,
            state_register: "",
            address: companySettings.address || "",
            complement: "",
            number: companySettings.address_number || "S/N",
            district: companySettings.neighborhood || "",
            city: companySettings.city || "",
            state_abbr: companySettings.state || "",
            postal_code: (companySettings.cep || companySettings.shipping_origin_cep || "01001000").replace(/\D/g, ""),
          },
          to: {
            name: order.customer_name,
            phone: order.customer_phone || "",
            email: order.customer_email,
            document: destinationCpf || fallbackDestinationCpf,
            company_document: isSameCompanyDocument ? "" : destinationCnpj,
            state_register: "",
            address: order.address_street || "",
            complement: order.address_complement || "",
            number: order.address_number || "S/N",
            district: order.address_neighborhood || "",
            city: order.address_city,
            state_abbr: order.address_state || "",
            postal_code: (order.address_zip || "").replace(/\D/g, ""),
          },
          products: (orderItems || []).map((it: any) => ({
            name: it.product_name,
            quantity: it.quantity,
            unitary_value: Number(it.unit_price),
            height: 2,
            width: 11,
            length: 16,
            weight: 0.3,
          })),
        },
      });

      if (error || data?.error) {
        toast({ title: "Erro ao gerar etiqueta", description: data?.error || error?.message, variant: "destructive" });
        return;
      }

      toast({ title: "Pedido criado no Melhor Envio!", description: "Acesse o carrinho do Melhor Envio para pagar e gerar a etiqueta." });

      if (data?.melhor_envio_url) {
        window.open(data.melhor_envio_url, "_blank");
      }

      load();
      if (selected?.id === order.id) {
        openDetail({ ...order });
      }
    } catch (err: any) {
      toast({ title: "Erro ao gerar etiqueta", description: err.message, variant: "destructive" });
    } finally {
      setGeneratingLabel(false);
    }
  };

  const deleteOrder = async (orderId: string) => {
    await supabase.from("order_status_history").delete().eq("order_id", orderId);
    await supabase.from("order_items").delete().eq("order_id", orderId);
    const { error } = await supabase.from("orders").delete().eq("id", orderId);
    if (error) {
      toast({ title: "Erro ao excluir pedido", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Pedido excluído com sucesso" });
      if (selected?.id === orderId) setSelected(null);
      load();
    }
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

      setSelected((prev: any) => prev ? { ...prev, [field]: publicUrl } : prev);
      toast({ title: field === "pix_receipt_url" ? "Recibo PIX anexado!" : "Nota Fiscal anexada!" });
    } catch (err: any) {
      toast({ title: "Erro ao enviar arquivo", description: err.message, variant: "destructive" });
    } finally {
      setUploadingDoc(null);
    }
  };

  const whatsappTemplates = {
    pagamento: (order: any) => `Olá ${order.customer_name}! 🖐️ Percebemos que o pagamento do seu pedido #${order.order_number} ainda não foi confirmado. Precisa de suporte ou da chave Pix novamente? Estamos à disposição!`,
    arte: (order: any) => `Olá ${order.customer_name}! 👋 Sua arte para o pedido #${order.order_number} já está em conferência técnica. Em breve te avisaremos sobre o próximo passo!`,
    producao: (order: any) => `Olá ${order.customer_name}! 🚀 Boas notícias: o seu pedido #${order.order_number} foi aprovado e entrou em produção!`,
    retirada: (order: any) => `Olá ${order.customer_name}! 🥳 O seu pedido #${order.order_number} está pronto para retirada! Você já pode vir buscá-lo na ${companySettings.company_name || "ImPlotter"}. Te esperamos!`,
    envio: (order: any) => `Olá ${order.customer_name}! 📦 Seu pedido #${order.order_number} foi postado! O código de rastreio é ${order.tracking_code || "em processamento"}. Acompanhe a entrega!`,
    avaliacao: (order: any) => `Olá ${order.customer_name}! 😊 Esperamos que tenha gostado do seu pedido #${order.order_number}! Sua opinião é muito importante para nós. Poderia nos avaliar aqui? Ficaremos muito gratos!`,
  };

  const openWhatsApp = (order: any, type: keyof typeof whatsappTemplates | "custom" = "custom") => {
    if (!order.customer_phone) {
      toast({ title: "Cliente sem telefone cadastrado", variant: "destructive" });
      return;
    }
    const phone = order.customer_phone.replace(/\D/g, "");
    let msg = "";
    
    if (type === "custom") {
      msg = `Olá ${order.customer_name}, referente ao seu pedido #${order.order_number}, o status atual é: ${statusLabels[order.status] || order.status}.`;
    } else {
      msg = whatsappTemplates[type](order);
    }
    
    window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <AdminLayout>
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-3xl font-bold text-foreground">Pedidos</h1>
          <Button variant="outline" size="sm" onClick={() => exportToCSV(orders.map(o => ({
            Numero: o.order_number, Cliente: o.customer_name, Email: o.customer_email,
            Total: o.total, Status: statusLabels[o.status] || o.status,
            Data: new Date(o.created_at).toLocaleDateString("pt-BR"),
          })), "pedidos")}>
            <Download className="w-4 h-4 mr-1" /> Exportar CSV
          </Button>
        </div>
        
        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-card p-4 rounded-xl border border-border shadow-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por nome, email ou ID..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <select value={filter} onChange={e => setFilter(e.target.value)} className="rounded-lg border border-input bg-background px-3 py-2 text-sm">
            <option value="">Todos os Status</option>
            {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <Input 
            type="date" 
            value={dateFrom} 
            onChange={(e) => setDateFrom(e.target.value)} 
            className="text-sm"
          />
          <Input 
            type="date" 
            value={dateTo} 
            onChange={(e) => setDateTo(e.target.value)} 
            className="text-sm"
          />
        </div>

        {/* Bulk Actions */}
        {selectedOrders.size > 0 && (
          <div className="flex items-center gap-3 bg-primary/5 p-3 rounded-lg border border-primary/20 animate-in fade-in slide-in-from-top-2">
            <span className="text-sm font-medium text-primary ml-2">{selectedOrders.size} pedidos selecionados</span>
            <select value={bulkStatus} onChange={e => setBulkStatus(e.target.value)} className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm ml-auto">
              <option value="">Alterar Status...</option>
              {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <Button size="sm" onClick={handleBulkUpdate} disabled={!bulkStatus}>Aplicar Status</Button>
            <Button size="sm" variant="outline" onClick={generateBulkPackingSlip}>
              <CheckSquare className="w-4 h-4 mr-2" /> Gerar Romaneio
            </Button>
          </div>
        )}
      </div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-card rounded-xl border border-border overflow-hidden shadow-card border-gradient-premium"
      >
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
          <table className="w-full text-sm min-w-[900px]">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-3 w-10 text-center">
                <input 
                  type="checkbox" 
                  checked={orders.length > 0 && selectedOrders.size === orders.length}
                  onChange={toggleSelectAll}
                  className="rounded border-primary text-primary focus:ring-primary"
                />
              </th>
              <th className="text-left p-3 font-medium text-muted-foreground">#</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Cliente</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Total</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Data</th>
              <th className="text-right p-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.id} className={`border-t border-border hover:bg-muted/30 transition-colors ${selectedOrders.has(o.id) ? "bg-primary/5" : ""}`}>
                <td className="p-3 text-center">
                  <input 
                    type="checkbox" 
                    checked={selectedOrders.has(o.id)}
                    onChange={() => toggleSelect(o.id)}
                    className="rounded border-primary text-primary focus:ring-primary"
                  />
                </td>
                <td className="p-3 font-medium text-foreground">#{o.order_number}</td>
                <td className="p-3 text-foreground">
                  <div className="flex flex-col">
                    <span className="font-medium">{o.customer_name}</span>
                    <div className="flex items-center gap-2 mt-1">
                      {o.pix_receipt_url && <span title="Recibo Anexado"><Receipt className="w-3 h-3 text-highlight" /></span>}
                      {o.invoice_url && <span title="NF Anexada"><FileText className="w-3 h-3 text-success" /></span>}
                      {o.customer_phone && (
                        <button onClick={() => openWhatsApp(o)} className="text-muted-foreground hover:text-success transition-colors" title="WhatsApp">
                          <MessageCircle className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </td>
                <td className="p-3 text-foreground">R$ {Number(o.total).toFixed(2)}</td>
                <td className="p-3"><span className="text-xs px-2 py-0.5 rounded-full bg-highlight/20 text-highlight">{statusLabels[o.status] || o.status}</span></td>
                <td className="p-3 text-muted-foreground">{new Date(o.created_at).toLocaleDateString("pt-BR")}</td>
                <td className="p-3 text-right flex items-center justify-end gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openDetail(o)}><Eye className="w-4 h-4" /></Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir pedido #{o.order_number}?</AlertDialogTitle>
                        <AlertDialogDescription>Esta ação não pode ser desfeita. O pedido e todos os itens/histórico serão removidos permanentemente.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteOrder(o.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </td>
              </tr>
            ))}
            {orders.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Nenhum pedido encontrado</td></tr>}
          </tbody>
        </table>
        </div>
      </motion.div>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Pedido #{selected?.order_number}</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Cliente:</span> <span className="font-medium text-foreground">{selected.customer_name}</span></div>
                <div><span className="text-muted-foreground">Email:</span> <span className="text-foreground">{selected.customer_email}</span></div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Telefone:</span> 
                  <span className="text-foreground">{selected.customer_phone || "—"}</span>
                  {selected.customer_phone && (
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-success hover:text-success hover:bg-success/10" onClick={() => openWhatsApp(selected)}>
                      <MessageCircle className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <div><span className="text-muted-foreground">Total:</span> <span className="font-bold text-foreground">R$ {Number(selected.total).toFixed(2)}</span></div>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">Itens</h3>
                {items.map(it => (
                  <div key={it.id} className="flex justify-between text-sm border-b border-border py-2">
                    <span>{it.product_name} <span className="text-muted-foreground">x{it.quantity}</span></span>
                    <span className="font-medium">R$ {Number(it.subtotal).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">Atualizar Status</h3>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  updateStatus(selected.id, fd.get("status") as string, fd.get("notes") as string);
                }} className="space-y-3">
                  <select name="status" defaultValue={selected.status} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                    {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <Textarea name="notes" placeholder="Observação (opcional)" rows={2} />
                  <Button type="submit" variant="highlight" className="w-full">Atualizar</Button>
                 </form>
               </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">Gerar Documento</h3>
                <div className="flex flex-wrap gap-2">
                  {["recibo", "comprovante"].map((type) => (
                    <Button key={type} variant="outline" size="sm" onClick={() => {
                      generateReceiptPDF({
                        type: type as "recibo" | "comprovante",
                        documentNumber: selected.order_number,
                        date: selected.created_at,
                        customer: { name: selected.customer_name, email: selected.customer_email, phone: selected.customer_phone, cpf_cnpj: selected.customer_cpf_cnpj },
                        items: items.map(it => ({ description: it.product_name, quantity: it.quantity, unitPrice: Number(it.unit_price), subtotal: Number(it.subtotal) })),
                        subtotal: Number(selected.subtotal),
                        discount: Number(selected.discount),
                        total: Number(selected.total),
                        paymentMethod: selected.payment_method,
                        notes: selected.notes,
                      });
                    }}>
                      <FileText className="w-4 h-4 mr-1" /> {type === "recibo" ? "Recibo" : "Comprovante"}
                    </Button>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => {
                    generateOrderDocument({
                      orderNumber: selected.order_number,
                      date: selected.created_at,
                      company: {
                        name: companySettings.company_name || "Gráfica ImPlotter",
                        cnpj: companySettings.cnpj || "",
                        phone: companySettings.phone || "",
                        email: companySettings.email || "",
                        address: companySettings.address || "",
                        city: companySettings.city || "",
                      },
                      customer: {
                        name: selected.customer_name,
                        cpf_cnpj: selected.customer_cpf_cnpj,
                        email: selected.customer_email,
                        phone: selected.customer_phone,
                        address: selected.address_street ? {
                          street: selected.address_street, number: selected.address_number,
                          complement: selected.address_complement, neighborhood: selected.address_neighborhood,
                          city: selected.address_city, state: selected.address_state, zip: selected.address_zip,
                        } : null,
                      },
                      items: items.map(it => ({ description: it.product_name, quantity: it.quantity, unitPrice: Number(it.unit_price), subtotal: Number(it.subtotal) })),
                      subtotal: Number(selected.subtotal),
                      discount: Number(selected.discount),
                      total: Number(selected.total),
                      paymentMethod: selected.payment_method,
                      notes: selected.notes,
                    });
                  }}>
                    <Printer className="w-4 h-4 mr-1" /> Documento de Venda
                  </Button>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">Etiquetas de Produção</h3>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => {
                    const labelOrder: LabelOrder = { id: selected.id, order_number: selected.order_number, customer_name: selected.customer_name, customer_phone: selected.customer_phone, status: selected.status, created_at: selected.created_at, notes: selected.notes };
                    const labelItems: LabelItem[] = items.map(it => ({ product_name: it.product_name, quantity: it.quantity, item_width: it.item_width, item_height: it.item_height, item_area: it.item_area, instructions: it.instructions, pricing_type: it.pricing_type }));
                    generateOrderLabel(labelOrder, labelItems);
                  }}>
                    <Tag className="w-4 h-4 mr-1" /> Etiqueta Geral
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => {
                    const labelOrder: LabelOrder = { id: selected.id, order_number: selected.order_number, customer_name: selected.customer_name, customer_phone: selected.customer_phone, status: selected.status, created_at: selected.created_at, notes: selected.notes };
                    const labelItems: LabelItem[] = items.map(it => ({ product_name: it.product_name, quantity: it.quantity, item_width: it.item_width, item_height: it.item_height, item_area: it.item_area, instructions: it.instructions, pricing_type: it.pricing_type }));
                    generateAllItemLabels(labelOrder, labelItems);
                  }}>
                    <Tags className="w-4 h-4 mr-1" /> Etiquetas por Item
                  </Button>
                </div>
               </div>

              {/* Shipping Label */}
              <div>
                <h3 className="font-semibold text-foreground mb-2">Etiqueta de Envio</h3>
                {selected.tracking_code ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Rastreio: <span className="font-mono font-semibold text-foreground">{selected.tracking_code}</span>
                      {selected.shipping_service && <span> • {selected.shipping_service}</span>}
                    </p>
                    <Button variant="outline" size="sm" onClick={() => generateShippingLabel(selected)} disabled={generatingLabel}>
                      <Truck className="w-4 h-4 mr-1" /> {generatingLabel ? "Gerando..." : "Gerar Nova Etiqueta"}
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="highlight"
                    size="sm"
                    onClick={() => generateShippingLabel(selected)}
                    disabled={generatingLabel || !selected.address_zip}
                  >
                    <Truck className="w-4 h-4 mr-1" /> {generatingLabel ? "Gerando etiqueta..." : "Gerar Etiqueta de Envio"}
                  </Button>
                )}
                {!selected.address_zip && (
                  <p className="text-xs text-destructive mt-1">Pedido sem CEP de entrega cadastrado.</p>
                )}
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">Comunicação Rápida (WhatsApp)</h3>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" className="hover:bg-success/10 hover:text-success border-success/30" onClick={() => openWhatsApp(selected, "pagamento")}>
                    <MessageCircle className="w-4 h-4 mr-1 text-success" /> Cobrar Pagamento
                  </Button>
                  <Button variant="outline" size="sm" className="hover:bg-success/10 hover:text-success border-success/30" onClick={() => openWhatsApp(selected, "arte")}>
                    <MessageCircle className="w-4 h-4 mr-1 text-success" /> Aviso de Arte
                  </Button>
                  <Button variant="outline" size="sm" className="hover:bg-success/10 hover:text-success border-success/30" onClick={() => openWhatsApp(selected, "producao")}>
                    <MessageCircle className="w-4 h-4 mr-1 text-success" /> Em Produção
                  </Button>
                  <Button variant="outline" size="sm" className="hover:bg-success/10 hover:text-success border-success/30" onClick={() => openWhatsApp(selected, "retirada")}>
                    <MessageCircle className="w-4 h-4 mr-1 text-success" /> Pronto p/ Retirada
                  </Button>
                  {selected.tracking_code && (
                    <Button variant="outline" size="sm" className="hover:bg-success/10 hover:text-success border-success/30" onClick={() => openWhatsApp(selected, "envio")}>
                      <MessageCircle className="w-4 h-4 mr-1 text-success" /> Aviso de Envio
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="hover:bg-success/10 hover:text-success border-success/30" onClick={() => openWhatsApp(selected, "avaliacao")}>
                    <MessageCircle className="w-4 h-4 mr-1 text-success" /> Pedir Avaliação
                  </Button>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">Anexos do Pedido</h3>
                <input type="file" ref={pixInputRef} className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file && selected) uploadDocument(selected.id, "pix_receipt_url", file);
                  e.target.value = "";
                }} />
                <input type="file" ref={nfInputRef} className="hidden" accept=".pdf,.jpg,.jpeg,.png,.xml" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file && selected) uploadDocument(selected.id, "invoice_url", file);
                  e.target.value = "";
                }} />
                <div className="flex flex-wrap gap-2">
                  {selected.pix_receipt_url ? (
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" asChild>
                        <a href={selected.pix_receipt_url} target="_blank" rel="noreferrer">
                          <Receipt className="w-4 h-4 mr-1" /> Recibo PIX <ExternalLink className="w-3 h-3 ml-1" />
                        </a>
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => pixInputRef.current?.click()} disabled={uploadingDoc === "pix_receipt_url"}>
                        {uploadingDoc === "pix_receipt_url" ? "Enviando..." : "Substituir"}
                      </Button>
                    </div>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => pixInputRef.current?.click()} disabled={uploadingDoc === "pix_receipt_url"}>
                      <Upload className="w-4 h-4 mr-1" /> {uploadingDoc === "pix_receipt_url" ? "Enviando..." : "Anexar Recibo PIX"}
                    </Button>
                  )}
                  {selected.invoice_url ? (
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" asChild>
                        <a href={selected.invoice_url} target="_blank" rel="noreferrer">
                          <FileText className="w-4 h-4 mr-1" /> Nota Fiscal <ExternalLink className="w-3 h-3 ml-1" />
                        </a>
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => nfInputRef.current?.click()} disabled={uploadingDoc === "invoice_url"}>
                        {uploadingDoc === "invoice_url" ? "Enviando..." : "Substituir"}
                      </Button>
                    </div>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => nfInputRef.current?.click()} disabled={uploadingDoc === "invoice_url"}>
                      <Upload className="w-4 h-4 mr-1" /> {uploadingDoc === "invoice_url" ? "Enviando..." : "Anexar Nota Fiscal"}
                    </Button>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-4">Histórico Visual</h3>
                <div className="relative border-l-2 border-border ml-3 space-y-6">
                  {history.map((h, i) => (
                    <div key={h.id} className="relative pl-6">
                      <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-background ${i === 0 ? "bg-highlight" : "bg-muted-foreground"}`}></div>
                      <p className={`font-medium text-sm ${i === 0 ? "text-highlight" : "text-foreground"}`}>{statusLabels[h.status] || h.status}</p>
                      {h.notes && <p className="text-sm text-muted-foreground mt-0.5">{h.notes}</p>}
                      <p className="text-xs text-muted-foreground mt-1">{new Date(h.created_at).toLocaleString("pt-BR")}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminPedidos;
