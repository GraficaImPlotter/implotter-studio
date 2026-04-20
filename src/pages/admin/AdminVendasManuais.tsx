import { useEffect, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { generatePixCode } from "@/lib/pix";
import { generateReceiptPDF } from "@/lib/receipt-pdf";
import { useSettings } from "@/hooks/use-settings";

// New Components
import ManualSalesStats from "@/components/admin/manual-sales/ManualSalesStats";
import ManualSalesTable from "@/components/admin/manual-sales/ManualSalesTable";
import ManualSalesForm from "@/components/admin/manual-sales/ManualSalesForm";

const AdminVendasManuais = () => {
  const { toast } = useToast();
  const [orders, setOrders] = useState<any[]>([]);
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

      <ManualSalesTable 
        orders={orders} 
        onEdit={(o) => { setEditing(o); setOpen(true); }}
        onDuplicate={(o) => { setEditing({ ...o, id: undefined, order_number: undefined }); setOpen(true); }}
        onView={() => {}} // Could link to order detail page
        onWhatsApp={openWhatsApp}
        onReceipt={handleReceipt}
        onPix={handlePixCode}
      />

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
