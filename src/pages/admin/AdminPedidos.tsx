import { useState } from "react";
import { motion } from "framer-motion";
import AdminLayout from "@/components/layout/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Download, Package } from "lucide-react";
import { exportToCSV } from "@/lib/export-csv";
import { validateDocumentFile } from "@/lib/file-validation";
import { ORDER_STATUS_LABELS } from "@/lib/order-status";
import { useOrders, useBulkUpdateOrderStatus, useDeleteOrder } from "@/hooks/use-orders";
import { useSiteSettings } from "@/hooks/use-site-settings";

import OrderFilters from "@/components/admin/orders/OrderFilters";
import OrderTable from "@/components/admin/orders/OrderTable";
import OrderDetailDialog from "@/components/admin/orders/OrderDetailDialog";
import BulkActions from "@/components/admin/orders/BulkActions";
import { TableSkeleton } from "@/components/ui/table-skeleton";

const AdminPedidos = () => {
  const { toast } = useToast();
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  
  // Bulk Actions
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState("");

  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [generatingLabel, setGeneratingLabel] = useState(false);

  // Hooks
  const { data: companySettings = {} } = useSiteSettings();
  const { data: orders = [], isLoading } = useOrders({
    status: statusFilter,
    searchTerm,
    dateFrom,
    dateTo
  });
  
  const bulkUpdateMutation = useBulkUpdateOrderStatus();
  const deleteOrderMutation = useDeleteOrder();

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
    bulkUpdateMutation.mutate({ 
      ids: Array.from(selectedOrders), 
      status: bulkStatus 
    }, {
      onSuccess: (data) => {
        setSelectedOrders(new Set());
        setBulkStatus("");
        
        // Feature: Google Review Booster
        if (bulkStatus === "finalizado") {
          toast({
            title: "Pedido Finalizado! 🎉",
            description: "Gostaria de pedir uma avaliação para este cliente no Google?",
            action: (
              <Button size="sm" variant="hero" className="h-8 text-[10px] font-black group" onClick={() => {
                const orderId = Array.isArray(selectedOrders) ? Array.from(selectedOrders)[0] : Array.from(selectedOrders)[0];
                const order = orders.find(o => o.id === orderId);
                if (order && order.customer_phone) {
                  const phone = order.customer_phone.replace(/\D/g, "");
                  const msg = encodeURIComponent(`Olá ${order.customer_name}! 😊 Esperamos que tenha amado o seu pedido #${order.order_number}! 🎨\n\nPoderia nos ajudar avaliando nosso trabalho no Google? Isso nos ajuda muito! 🙏\n\nLink: https://g.page/r/YOUR_REVIEW_LINK/review`);
                  window.open(`https://wa.me/55${phone}?text=${msg}`, "_blank");
                }
              }}>
                PEDIR AVALIAÇÃO
              </Button>
            )
          });
        }
      }
    });
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

  const generateShippingLabel = async (order: any) => {
    if (!order.address_zip || !order.address_city) {
      toast({ title: "Pedido sem endereço de entrega completo", variant: "destructive" });
      return;
    }

    setGeneratingLabel(true);
    try {
      const { data: orderItems } = await supabase.from("order_items").select("*").eq("order_id", order.id);

      let serviceId = order.shipping_service_id;
      try {
        const { data: quoteData } = await supabase.functions.invoke("calculate-shipping", {
          body: {
            cep_destino: (order.address_zip || "").replace(/\D/g, ""),
            cep_origem: (companySettings.cep || companySettings.shipping_origin_cep || "").replace(/\D/g, ""),
            valor: Number(order.total || 0),
            peso: Math.max(0.3, (orderItems || []).reduce((sum: number, it: any) => sum + 0.3 * Number(it.quantity || 1), 0)),
            altura: Math.max(2, (orderItems || []).reduce((sum: number, it: any) => sum + 2 * Number(it.quantity || 1), 0)),
            largura: 11,
            comprimento: 16,
          },
        });

        const options = quoteData?.options || [];
        if (Array.isArray(options) && options.length > 0) {
          const normalizedOrderService = (order.shipping_service || "").toLowerCase().trim();
          const match = normalizedOrderService
            ? options.find((s: any) => `${s.company || ""} ${s.name || ""}`.toLowerCase().includes(normalizedOrderService))
            : null;

          const best = match || options[0];
          if (best?.id) serviceId = best.id;
        }
      } catch { }

      const senderPersonDocument = (companySettings.cpf_responsavel || "").replace(/\D/g, "");
      const senderCompanyDocument = (companySettings.cnpj || "").replace(/\D/g, "");
      const destinationDocument = (order.customer_cpf_cnpj || "").replace(/\D/g, "");
      const destinationCpf = destinationDocument.length === 11 ? destinationDocument : "";
      const destinationCnpj = destinationDocument.length === 14 ? destinationDocument : "";

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
            address: companySettings.address || "",
            number: companySettings.address_number || "S/N",
            district: companySettings.neighborhood || "",
            city: companySettings.city || "",
            state_abbr: companySettings.state || "",
            postal_code: (companySettings.cep || "").replace(/\D/g, ""),
          },
          to: {
            name: order.customer_name,
            phone: order.customer_phone || "",
            email: order.customer_email,
            document: destinationCpf || senderPersonDocument,
            company_document: destinationCnpj,
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
            height: 2, width: 11, length: 16, weight: 0.3,
          })),
        },
      });

      if (error || data?.error) throw new Error(data?.error || error?.message);

      toast({ title: "Pedido criado no Melhor Envio!" });
      if (data?.melhor_envio_url) window.open(data.melhor_envio_url, "_blank");
      
    } catch (err: any) {
      toast({ title: "Erro ao gerar etiqueta", description: err.message, variant: "destructive" });
    } finally {
      setGeneratingLabel(false);
    }
  };

  const uploadDocument = async (orderId: string, field: "pix_receipt_url" | "invoice_url", file: File) => {
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

      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, [field]: publicUrl });
      }
      toast({ title: field === "pix_receipt_url" ? "Recibo PIX anexado!" : "Nota Fiscal anexada!" });
    } catch (err: any) {
      toast({ title: "Erro ao enviar arquivo", description: err.message, variant: "destructive" });
    } finally {
      setUploadingDoc(null);
    }
  };

  const openWhatsApp = (order: any, type: string = "custom") => {
    if (!order.customer_phone) {
      toast({ title: "Cliente sem telefone cadastrado", variant: "destructive" });
      return;
    }
    const phone = order.customer_phone.replace(/\D/g, "");
    
    const templates: Record<string, string> = {
      pagamento: `Olá ${order.customer_name}! 🖐️ Percebemos que o pagamento do seu pedido #${order.order_number} ainda não foi confirmado...`,
      arte: `Olá ${order.customer_name}! 👋 Sua arte para o pedido #${order.order_number} já está em conferência técnica...`,
      producao: `Olá ${order.customer_name}! 🚀 Boas notícias: o seu pedido #${order.order_number} foi aprovado e entrou em produção!`,
      retirada: `Olá ${order.customer_name}! 🥳 O seu pedido #${order.order_number} está pronto para retirada!`,
      envio: `Olá ${order.customer_name}! 📦 Seu pedido #${order.order_number} foi postado! Tracking: ${order.tracking_code}`,
      avaliacao: `Olá ${order.customer_name}! 😊 Esperamos que tenha gostado do seu pedido #${order.order_number}! Poderia nos avaliar?`,
    };
    
    const msg = templates[type] || `Olá ${order.customer_name}, referente ao seu pedido #${order.order_number}, o status atual é: ${ORDER_STATUS_LABELS[order.status] || order.status}.`;
    window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 rounded-2xl bg-highlight/10 flex items-center justify-center border border-highlight/20 text-highlight">
                <Package className="w-6 h-6" />
             </div>
             <div className="space-y-0.5">
              <h1 className="font-display text-3xl font-bold text-foreground">Pedidos</h1>
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-widest opacity-70">Logística & Produção</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => exportToCSV(orders, "pedidos")} 
            className="rounded-xl font-bold transition-all hover:bg-highlight hover:text-white border-highlight/30 text-highlight h-10 px-4"
          >
            <Download className="w-4 h-4 mr-2" /> Exportar CSV
          </Button>
        </div>
        
        <OrderFilters 
          searchTerm={searchTerm} setSearchTerm={setSearchTerm}
          status={statusFilter} setStatus={setStatusFilter}
          dateFrom={dateFrom} setDateFrom={setDateFrom}
          dateTo={dateTo} setDateTo={setDateTo}
        />

        <BulkActions 
          selectedCount={selectedOrders.size}
          bulkStatus={bulkStatus}
          setBulkStatus={setBulkStatus}
          handleBulkUpdate={handleBulkUpdate}
          generateBulkPackingSlip={generateBulkPackingSlip}
        />
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {isLoading ? (
          <TableSkeleton rows={8} />
        ) : (
          <OrderTable 
            orders={orders}
            selectedOrders={selectedOrders}
            toggleSelect={toggleSelect}
            toggleSelectAll={toggleSelectAll}
            openDetail={setSelectedOrder}
            deleteOrder={(id) => deleteOrderMutation.mutate(id)}
            openWhatsApp={openWhatsApp}
          />
        )}
      </motion.div>

      <OrderDetailDialog 
        order={selectedOrder}
        onOpenChange={(open) => !open && setSelectedOrder(null)}
        onUploadDocument={uploadDocument}
        uploadingDoc={uploadingDoc}
        generateShippingLabel={generateShippingLabel}
        generatingLabel={generatingLabel}
        openWhatsApp={openWhatsApp}
        companySettings={companySettings as any}
      />
    </AdminLayout>
  );
};

export default AdminPedidos;
