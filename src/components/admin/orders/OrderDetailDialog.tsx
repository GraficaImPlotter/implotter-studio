import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Receipt, FileText, MessageCircle, ExternalLink, Printer, Tag, Tags, Truck, Upload, User, MapPin, History, Package } from "lucide-react";
import { ORDER_STATUS_LABELS } from "@/lib/order-status";
import { generateReceiptPDF } from "@/lib/receipt-pdf";
import { generateOrderDocument } from "@/lib/order-document-pdf";
import { generateOrderLabel, generateAllItemLabels } from "@/lib/production-label";
import { generateDeliveryLabelPDF } from "@/lib/delivery-label-pdf";
import { useOrderDetails, useUpdateOrderStatus } from "@/hooks/use-orders";

interface OrderDetailDialogProps {
  order: any | null;
  onOpenChange: (open: boolean) => void;
  onUploadDocument: (field: "pix_receipt_url" | "invoice_url", file: File) => void;
  uploadingDoc: string | null;
  generateShippingLabel: (order: any) => void;
  generatingLabel: boolean;
  openWhatsApp: (order: any, type?: any) => void;
  companySettings: Record<string, string>;
}

const OrderDetailDialog = ({
  order,
  onOpenChange,
  onUploadDocument,
  uploadingDoc,
  generateShippingLabel,
  generatingLabel,
  openWhatsApp,
  companySettings,
}: OrderDetailDialogProps) => {
  const pixInputRef = useRef<HTMLInputElement>(null);
  const nfInputRef = useRef<HTMLInputElement>(null);
  const { data: details, isLoading } = useOrderDetails(order?.id);
  const updateStatusMutation = useUpdateOrderStatus();

  const handleUpdateStatus = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!order) return;
    const fd = new FormData(e.currentTarget);
    updateStatusMutation.mutate({
      orderId: order.id,
      status: fd.get("status") as string,
      notes: fd.get("notes") as string,
    });
  };

  if (!order) return null;

  return (
    <Dialog open={!!order} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden p-0 bg-background border-border shadow-2xl flex flex-col">
        <DialogHeader className="p-6 pb-2 shrink-0 bg-gradient-to-r from-highlight/5 to-transparent">
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 text-primary">
                <Package className="w-6 h-6" />
             </div>
             <div>
               <DialogTitle className="font-display font-bold text-2xl flex items-center gap-2">
                 Pedido <span className="text-primary">#{order.order_number}</span>
               </DialogTitle>
               <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest mt-0.5">
                 Criado em {new Date(order.created_at).toLocaleString("pt-BR")}
               </p>
             </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="geral" className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 border-b border-border/50 bg-muted/20">
            <TabsList className="bg-transparent h-12 gap-6 p-0">
              <TabsTrigger value="geral" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none h-full px-0 font-bold transition-all text-xs uppercase tracking-wider">
                <User className="w-3.5 h-3.5 mr-2" /> Geral
              </TabsTrigger>
              <TabsTrigger value="itens" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none h-full px-0 font-bold transition-all text-xs uppercase tracking-wider">
                <Package className="w-3.5 h-3.5 mr-2" /> Itens
              </TabsTrigger>
              <TabsTrigger value="envio" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none h-full px-0 font-bold transition-all text-xs uppercase tracking-wider">
                <Truck className="w-3.5 h-3.5 mr-2" /> Envio & Docs
              </TabsTrigger>
              <TabsTrigger value="historico" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none h-full px-0 font-bold transition-all text-xs uppercase tracking-wider">
                <History className="w-3.5 h-3.5 mr-2" /> Histórico
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
            <TabsContent value="geral" className="m-0 space-y-8 animate-in fade-in slide-in-from-bottom-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                    <User className="w-3 h-3" /> Dados do Cliente
                  </h3>
                  <div className="bg-muted/30 p-4 rounded-2xl border border-border/50 space-y-2.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Nome:</span>
                      <span className="font-bold">{order.customer_name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Email:</span>
                      <span>{order.customer_email}</span>
                    </div>
                    <div className="flex justify-between text-sm items-center">
                      <span className="text-muted-foreground">Telefone:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{order.customer_phone || "—"}</span>
                        {order.customer_phone && (
                          <button onClick={() => openWhatsApp(order)} className="text-success hover:scale-110 transition-transform">
                            <MessageCircle className="w-4 h-4 fill-success/10" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                    <MapPin className="w-3 h-3" /> Endereço de Entrega
                  </h3>
                  <div className="bg-muted/30 p-4 rounded-2xl border border-border/50 text-sm space-y-1">
                    {order.address_street ? (
                      <>
                        <p className="font-bold">{order.address_street}, {order.address_number}</p>
                        <p className="text-muted-foreground">{order.address_neighborhood} {order.address_complement ? `— ${order.address_complement}` : ""}</p>
                        <p className="text-muted-foreground">{order.address_city} - {order.address_state}</p>
                        <p className="text-muted-foreground font-mono">{order.address_zip}</p>
                      </>
                    ) : (
                      <p className="text-muted-foreground italic">Nenhum endereço cadastrado</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Gerenciamento de Status</h3>
                <form onSubmit={handleUpdateStatus} className="bg-card p-4 rounded-2xl border border-primary/20 shadow-glow-sm space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground">Novo Status</label>
                      <select name="status" defaultValue={order.status} className="w-full rounded-xl border border-input bg-background/50 px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none">
                        {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground">Observações</label>
                      <Textarea name="notes" placeholder="Adicionar nota ao histórico..." rows={1} className="min-h-[42px] px-3 py-2.5 rounded-xl bg-background/50 focus:bg-background transition-all" />
                    </div>
                  </div>
                  <Button type="submit" variant="highlight" className="w-full rounded-xl font-bold uppercase tracking-widest text-xs h-12 shadow-glow" disabled={updateStatusMutation.isPending}>
                    {updateStatusMutation.isPending ? "Atualizando..." : "Confirmar Alteração de Status"}
                  </Button>
                </form>
              </div>
            </TabsContent>

            <TabsContent value="itens" className="m-0 space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <div className="bg-card rounded-2xl border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b border-border/50">
                    <tr>
                      <th className="text-left p-4 font-bold text-muted-foreground text-[10px] uppercase">Produto</th>
                      <th className="text-center p-4 font-bold text-muted-foreground text-[10px] uppercase">Qtd</th>
                      <th className="text-right p-4 font-bold text-muted-foreground text-[10px] uppercase">Preço</th>
                      <th className="text-right p-4 font-bold text-muted-foreground text-[10px] uppercase">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {details?.items.map(it => (
                      <tr key={it.id} className="hover:bg-muted/10 transition-colors">
                        <td className="p-4">
                          <span className="font-bold text-foreground block">{it.product_name}</span>
                          {it.instructions && <span className="text-[10px] text-muted-foreground block mt-1 italic">{it.instructions}</span>}
                        </td>
                        <td className="p-4 text-center font-mono font-bold">x{it.quantity}</td>
                        <td className="p-4 text-right text-muted-foreground">R$ {Number(it.unit_price).toFixed(2)}</td>
                        <td className="p-4 text-right font-bold text-foreground">R$ {Number(it.subtotal).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted/10 border-t border-border/50">
                    <tr>
                      <td colSpan={3} className="p-4 text-right font-medium text-muted-foreground">Subtotal:</td>
                      <td className="p-4 text-right font-medium">R$ {Number(order.subtotal).toFixed(2)}</td>
                    </tr>
                    {Number(order.discount) > 0 && (
                      <tr>
                        <td colSpan={3} className="p-4 text-right font-medium text-destructive">Desconto:</td>
                        <td className="p-4 text-right font-medium text-destructive">- R$ {Number(order.discount).toFixed(2)}</td>
                      </tr>
                    )}
                    <tr className="border-t border-border/50">
                      <td colSpan={3} className="p-4 text-right font-bold text-foreground">Total:</td>
                      <td className="p-4 text-right font-display font-black text-lg text-primary">R$ {Number(order.total).toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="space-y-4">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Etiquetas de Produção</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                   <Button variant="outline" className="border-border/50 hover:bg-highlight/10 hover:border-highlight/30 hover:text-highlight transition-all h-11 rounded-xl" onClick={() => generateOrderLabel(order, details?.items || [])}>
                    <Tag className="w-4 h-4 mr-2" /> Etiqueta Geral do Pedido
                  </Button>
                  <Button variant="outline" className="border-border/50 hover:bg-highlight/10 hover:border-highlight/30 hover:text-highlight transition-all h-11 rounded-xl" onClick={() => generateAllItemLabels(order, details?.items || [])}>
                    <Tags className="w-4 h-4 mr-2" /> Etiquetas por Item
                  </Button>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="envio" className="m-0 space-y-8 animate-in fade-in slide-in-from-bottom-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Documentação Fiscal</h3>
                  <div className="space-y-3">
                    <input type="file" ref={pixInputRef} className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) onUploadDocument("pix_receipt_url", file);
                      e.target.value = "";
                    }} />
                    <input type="file" ref={nfInputRef} className="hidden" accept=".pdf,.jpg,.jpeg,.png,.xml" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) onUploadDocument("invoice_url", file);
                      e.target.value = "";
                    }} />
                    
                    <div className="flex flex-col gap-2">
                      {order.pix_receipt_url ? (
                        <div className="flex gap-1">
                          <Button variant="outline" className="flex-1 rounded-xl border-highlight/30 bg-highlight/5 text-highlight hover:bg-highlight/10" asChild>
                            <a href={order.pix_receipt_url} target="_blank" rel="noreferrer">
                              <Receipt className="w-4 h-4 mr-2" /> Recibo PIX <ExternalLink className="w-3 h-3 ml-2" />
                            </a>
                          </Button>
                          <Button variant="ghost" size="icon" className="h-11 w-11 rounded-xl" onClick={() => pixInputRef.current?.click()} disabled={uploadingDoc === "pix_receipt_url"}>
                             <Upload className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button variant="outline" className="w-full h-11 rounded-xl border-dashed border-2 hover:bg-muted/50 transition-all font-bold text-xs uppercase" onClick={() => pixInputRef.current?.click()} disabled={uploadingDoc === "pix_receipt_url"}>
                          <Upload className="w-4 h-4 mr-2" /> {uploadingDoc === "pix_receipt_url" ? "Enviando..." : "Anexar Recibo PIX"}
                        </Button>
                      )}

                      {order.invoice_url ? (
                        <div className="flex gap-1">
                          <Button variant="outline" className="flex-1 rounded-xl border-success/30 bg-success/5 text-success hover:bg-success/10" asChild>
                            <a href={order.invoice_url} target="_blank" rel="noreferrer">
                              <FileText className="w-4 h-4 mr-2" /> Nota Fiscal <ExternalLink className="w-3 h-3 ml-2" />
                            </a>
                          </Button>
                          <Button variant="ghost" size="icon" className="h-11 w-11 rounded-xl" onClick={() => nfInputRef.current?.click()} disabled={uploadingDoc === "invoice_url"}>
                             <Upload className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button variant="outline" className="w-full h-11 rounded-xl border-dashed border-2 hover:bg-muted/50 transition-all font-bold text-xs uppercase" onClick={() => nfInputRef.current?.click()} disabled={uploadingDoc === "invoice_url"}>
                          <Upload className="w-4 h-4 mr-2" /> {uploadingDoc === "invoice_url" ? "Enviando..." : "Anexar Nota Fiscal"}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Logística & Envio</h3>
                  
                  <Button
                    variant="outline"
                    className="w-full h-12 rounded-2xl font-black uppercase tracking-tighter text-xs border-2 border-yellow-400 bg-yellow-400/10 text-yellow-600 hover:bg-yellow-400/20"
                    onClick={() => generateDeliveryLabelPDF({
                      orderNumber: order.order_number,
                      date: order.created_at,
                      customer: {
                        name: order.customer_name,
                        phone: order.customer_phone,
                        address: {
                          street: order.address_street,
                          number: order.address_number,
                          complement: order.address_complement,
                          neighborhood: order.address_neighborhood,
                          city: order.address_city,
                          state: order.address_state,
                          zip: order.address_zip,
                        }
                      },
                      items: details?.items.map(it => ({
                        description: it.product_name,
                        quantity: it.quantity,
                      })) || [],
                      company: {
                        name: companySettings.company_name || "Gráfica ImPlotter",
                        phone: companySettings.phone || "",
                        address: companySettings.address || "",
                      }
                    })}
                  >
                    <MapPin className="w-4 h-4 mr-2" /> Ficha de Entrega Local (Canhoto)
                  </Button>

                  <div className="h-px bg-border/50 my-2" />

                  {order.tracking_code ? (
                    <div className="bg-muted/30 p-4 rounded-xl border border-border/50 space-y-3">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-70">Código de Rastreio</span>
                        <span className="font-mono font-bold text-highlight text-lg tracking-wider">{order.tracking_code}</span>
                        {order.shipping_service && <span className="text-xs text-muted-foreground mt-0.5">{order.shipping_service}</span>}
                      </div>
                      <Button variant="outline" size="sm" className="w-full rounded-lg" onClick={() => generateShippingLabel(order)} disabled={generatingLabel}>
                         {generatingLabel ? "Consultando Melhor Envio..." : "Recalcular/Atualizar Etiqueta"}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="highlight"
                      className="w-full h-14 rounded-2xl font-black uppercase tracking-tighter text-sm shadow-glow"
                      onClick={() => generateShippingLabel(order)}
                      disabled={generatingLabel || !order.address_zip}
                    >
                      <Truck className="w-5 h-5 mr-2" /> {generatingLabel ? "Gerando etiqueta..." : "Gerar Etiqueta de Envio"}
                    </Button>
                  )}
                  {!order.address_zip && (
                    <p className="text-[10px] text-destructive font-bold uppercase p-2 border border-destructive/20 bg-destructive/5 rounded-lg">
                      Atenção: CEP de entrega não cadastrado.
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Ações de Documento</h3>
                <div className="flex flex-wrap gap-2">
                  {["recibo", "comprovante"].map((type) => (
                    <Button key={type} variant="outline" className="flex-1 rounded-xl h-11 text-xs" onClick={() => {
                      generateReceiptPDF({
                        type: type as "recibo" | "comprovante",
                        documentNumber: order.order_number,
                        date: order.created_at,
                        customer: { name: order.customer_name, email: order.customer_email, phone: order.customer_phone, cpf_cnpj: order.customer_cpf_cnpj },
                        items: details?.items.map(it => ({ description: it.product_name, quantity: it.quantity, unitPrice: Number(it.unitPrice), subtotal: Number(it.subtotal) })) || [],
                        subtotal: Number(order.subtotal),
                        discount: Number(order.discount),
                        total: Number(order.total),
                        paymentMethod: order.payment_method,
                        notes: order.notes,
                      });
                    }}>
                      <Printer className="w-4 h-4 mr-2" /> {type === "recibo" ? "Recibo" : "Comprovante"}
                    </Button>
                  ))}
                  <Button variant="outline" className="flex-1 rounded-xl h-11 text-xs" onClick={() => {
                    generateOrderDocument({
                      orderNumber: order.order_number,
                      date: order.created_at,
                      company: {
                        name: companySettings.company_name || "Gráfica ImPlotter",
                        cnpj: companySettings.cnpj || "",
                        phone: companySettings.phone || "",
                        email: companySettings.email || "",
                        address: companySettings.address || "",
                        city: companySettings.city || "",
                      },
                      customer: {
                        name: order.customer_name,
                        cpf_cnpj: order.customer_cpf_cnpj,
                        email: order.customer_email,
                        phone: order.customer_phone,
                        address: order.address_street ? {
                          street: order.address_street, number: order.address_number,
                          complement: order.address_complement, neighborhood: order.address_neighborhood,
                          city: order.address_city, state: order.address_state, zip: order.address_zip,
                        } : null,
                      },
                      items: details?.items.map(it => ({ description: it.product_name, quantity: it.quantity, unitPrice: Number(it.unitPrice), subtotal: Number(it.subtotal) })) || [],
                      subtotal: Number(order.subtotal),
                      discount: Number(order.discount),
                      total: Number(order.total),
                      paymentMethod: order.payment_method,
                      notes: order.notes,
                    });
                  }}>
                    <Printer className="w-4 h-4 mr-2" /> Documento de Venda
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="historico" className="m-0 animate-in fade-in slide-in-from-bottom-2">
               <div className="relative border-l border-border/50 ml-3 space-y-8 py-2">
                  {details?.history.map((h, i) => (
                    <div key={h.id} className="relative pl-7">
                      <div className={`absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full border border-background shadow-sm ${i === 0 ? "bg-primary animate-pulse shadow-glow" : "bg-muted-foreground/40"}`} />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-black uppercase tracking-tight ${i === 0 ? "text-primary" : "text-foreground"}`}>
                            {ORDER_STATUS_LABELS[h.status] || h.status}
                          </p>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {new Date(h.created_at).toLocaleString("pt-BR")}
                          </span>
                        </div>
                        {h.notes && (
                          <div className="bg-muted/20 p-3 rounded-xl border border-border/50">
                            <p className="text-xs text-muted-foreground leading-relaxed">{h.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {details?.history.length === 0 && <p className="text-sm text-muted-foreground italic text-center py-8">Nenhum evento registrado no histórico.</p>}
               </div>
            </TabsContent>
          </div>
        </Tabs>

        <div className="p-4 bg-muted/30 border-t border-border/50 shrink-0">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-3 text-center">Comunicação Rápida WhatsApp</h3>
          <div className="flex flex-wrap gap-1.5 justify-center">
            {["pagamento", "arte", "producao", "retirada", "envio", "avaliacao"].map(type => (
              <Button key={type} variant="ghost" size="sm" className={`text-[10px] h-8 rounded-lg border border-transparent hover:border-success/30 hover:bg-success/5 hover:text-success uppercase font-bold tracking-tight ${type === 'envio' && !order.tracking_code ? 'hidden' : ''}`} onClick={() => openWhatsApp(order, type)}>
                <MessageCircle className="w-3 h-3 mr-1 bg-success/10 rounded-full" /> {type}
              </Button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrderDetailDialog;
