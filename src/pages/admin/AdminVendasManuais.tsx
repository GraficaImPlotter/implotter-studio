import { useEffect, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Clock, Calendar } from "lucide-react";
import { generatePixCode } from "@/lib/pix";
import { generateReceiptPDF } from "@/lib/receipt-pdf";
import { useSettings } from "@/hooks/use-settings";

// New Components
import ManualSalesStats from "@/components/admin/manual-sales/ManualSalesStats";
import ManualSalesTable from "@/components/admin/manual-sales/ManualSalesTable";
import ManualSalesForm from "@/components/admin/manual-sales/ManualSalesForm";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const statusColors: Record<string, string> = {
  pedido_recebido: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  aguardando_pagamento: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  pagamento_confirmado: "bg-green-500/10 text-green-500 border-green-500/20",
  em_producao: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  finalizado: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  cancelado: "bg-red-500/10 text-red-500 border-red-500/20",
};

const statusLabels: Record<string, string> = {
  pedido_recebido: "Recebido",
  aguardando_pagamento: "Aguardando Pag.",
  pagamento_confirmado: "Pago",
  em_producao: "Em Produção",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
};

const AdminVendasManuais = () => {
  const { toast } = useToast();
  const [orders, setOrders] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const { data: companySettings = {} } = useSettings();

  const load = async () => {
    const { data } = await supabase
      .from("orders")
      .select("*")
      .in("origin", ["manual", "orcamento"])
      .order("created_at", { ascending: false });
    setOrders(data ?? []);
  };

  useEffect(() => { load(); }, []);

  const getCompanyData = () => ({
    name: companySettings.company_name || "Gráfica ImPlotter",
    phone: companySettings.phone || "",
    email: companySettings.email || "",
    address: companySettings.address || "",
    city: companySettings.city || "",
  });

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
    const customerData: any = { 
      name: order.customer_name, 
      email, 
      phone: order.customer_phone || null,
      cpf_cnpj: order.customer_cpf_cnpj || null,
    };
    
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

  const openWhatsApp = (order: any) => {
    if (!order.customer_phone) {
      toast({ title: "Cliente sem telefone cadastrado", variant: "destructive" });
      return;
    }
    const phone = order.customer_phone.replace(/\D/g, "");
    const msg = encodeURIComponent(`Olá ${order.customer_name}, sua venda #${order.order_number} no valor de R$ ${Number(order.total).toFixed(2)} foi registrada.`);
    window.open(`https://wa.me/55${phone}?text=${msg}`, "_blank");
  };

  const handlePixCode = async (order: any) => {
    const pixKey = companySettings.pix_key;
    const pixName = companySettings.pix_receiver_name;
    const pixCity = companySettings.pix_city;
    if (!pixKey || !pixName || !pixCity) {
      toast({ title: "Configure a chave PIX nas configurações", variant: "destructive" });
      return;
    }
    const code = generatePixCode({ pixKey, receiverName: pixName, city: pixCity, amount: Number(order.total) });
    await navigator.clipboard.writeText(code);
    toast({ title: "Código PIX copiado!", description: "Envie para o cliente para facilitar o pagamento." });
  };

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="font-display text-4xl font-black text-foreground tracking-tight">Vendas Avulsas</h1>
          <p className="text-muted-foreground mt-1 text-base">Gerencie vendas diretas, manuais e orçamentos aprovados de forma premium.</p>
        </div>
        <Button variant="hero" size="lg" onClick={() => { setEditing(null); setOpen(true); }} className="shadow-glow-strong animate-float-gentle">
          <Plus className="w-5 h-5 mr-2" /> Registrar Nova Venda
        </Button>
      </div>

      <ManualSalesStats orders={orders} />

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6">
        <div className="flex bg-muted/50 p-1 rounded-xl border border-border/50">
          {[
            { id: "todos", label: "Todos" },
            { id: "aguardando_pagamento", label: "Pendentes" },
            { id: "pagamento_confirmado", label: "Pagos" },
            { id: "em_producao", label: "Produção" },
            { id: "finalizado", label: "Finalizados" },
            { id: "agenda", label: "📅 Agenda" }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setStatusFilter(t.id)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                statusFilter === t.id ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por cliente ou #..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-background/50 focus:bg-background transition-colors"
          />
        </div>
      </div>

      {statusFilter === "agenda" ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4">
             {/* Simple Weekly View or Sorted List */}
             {orders
               .filter(o => o.due_date)
               .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
               .map(o => (
                 <div key={o.id} className="bg-white p-4 rounded-2xl border border-border shadow-sm hover:shadow-md transition-all cursor-pointer" onClick={() => { setEditing(o); setOpen(true); }}>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-black text-primary uppercase">{new Date(o.due_date).toLocaleDateString("pt-BR", { day: '2-digit', month: 'short' })}</span>
                      <Badge className={`text-[8px] h-4 ${statusColors[o.status] || ""}`}>{statusLabels[o.status] || o.status}</Badge>
                    </div>
                    <h4 className="text-xs font-bold text-foreground line-clamp-1">{o.customer_name}</h4>
                    <p className="text-[10px] text-muted-foreground">#{o.order_number} • R$ {Number(o.total).toFixed(2)}</p>
                 </div>
               ))}
             {orders.filter(o => o.due_date).length === 0 && (
               <div className="col-span-full p-12 text-center bg-muted/20 rounded-3xl border border-dashed border-border">
                  <p className="text-muted-foreground font-medium">Nenhum pedido com data de entrega definida.</p>
               </div>
             )}
          </div>
        </div>
      ) : (
        <ManualSalesTable 
          orders={orders.filter(o => {
            const matchStatus = statusFilter === "todos" || o.status === statusFilter;
            const matchSearch = !searchTerm || 
              o.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              o.order_number?.toString().includes(searchTerm);
            return matchStatus && matchSearch;
          })} 
          onEdit={(o) => { setEditing(o); setOpen(true); }}
          onDuplicate={(o) => { setEditing({ ...o, id: undefined, order_number: undefined }); setOpen(true); }}
          onView={() => {}} 
          onWhatsApp={openWhatsApp}
          onReceipt={handleReceipt}
          onPix={handlePixCode}
        />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto border-glow shadow-elevated">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              {editing && editing.id ? `Editar Pedido #${editing.order_number}` : "Nova Venda Manual"}
            </DialogTitle>
          </DialogHeader>
          <ManualSalesForm 
            editingOrder={editing} 
            onSuccess={() => { setOpen(false); load(); }} 
          />
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminVendasManuais;
