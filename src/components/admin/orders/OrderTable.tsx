import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Eye, Trash2, Receipt, FileText, MessageCircle } from "lucide-react";
import { ORDER_STATUS_LABELS } from "@/lib/order-status";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface OrderTableProps {
  orders: any[];
  selectedOrders: Set<string>;
  toggleSelect: (id: string) => void;
  toggleSelectAll: () => void;
  openDetail: (order: any) => void;
  deleteOrder: (id: string) => void;
  openWhatsApp: (order: any) => void;
}

const OrderTable = ({
  orders,
  selectedOrders,
  toggleSelect,
  toggleSelectAll,
  openDetail,
  deleteOrder,
  openWhatsApp,
}: OrderTableProps) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-xl border border-border overflow-hidden shadow-card border-gradient-premium"
    >
      <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
        <table className="w-full text-sm min-w-[900px]">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-4 w-12 text-center">
                <input 
                  type="checkbox" 
                  checked={orders.length > 0 && selectedOrders.size === orders.length}
                  onChange={toggleSelectAll}
                  className="rounded border-primary text-primary focus:ring-primary h-4 w-4"
                />
              </th>
              <th className="text-left p-4 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]"># Pedido</th>
              <th className="text-left p-4 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Cliente</th>
              <th className="text-left p-4 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Total</th>
              <th className="text-left p-4 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Status</th>
              <th className="text-left p-4 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Data</th>
              <th className="text-right p-4 uppercase tracking-wider text-[10px]">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {orders.map(o => (
              <tr 
                key={o.id} 
                className={`group hover:bg-muted/30 transition-colors ${selectedOrders.has(o.id) ? "bg-primary/5" : ""}`}
              >
                <td className="p-4 text-center">
                  <input 
                    type="checkbox" 
                    checked={selectedOrders.has(o.id)}
                    onChange={() => toggleSelect(o.id)}
                    className="rounded border-primary text-primary focus:ring-primary h-4 w-4"
                  />
                </td>
                <td className="p-4 font-bold text-foreground">#{o.order_number}</td>
                <td className="p-4 text-foreground">
                  <div className="flex flex-col">
                    <span className="font-semibold">{o.customer_name}</span>
                    <div className="flex items-center gap-2 mt-1 opacity-60 group-hover:opacity-100 transition-opacity">
                      {o.pix_receipt_url && (
                        <span title="Recibo Anexado" className="flex items-center gap-1 text-[10px] bg-highlight/10 text-highlight px-1.5 py-0.5 rounded uppercase font-bold">
                          <Receipt className="w-3 h-3" /> PIX
                        </span>
                      )}
                      {o.invoice_url && (
                        <span title="NF Anexada" className="flex items-center gap-1 text-[10px] bg-success/10 text-success px-1.5 py-0.5 rounded uppercase font-bold">
                          <FileText className="w-3 h-3" /> NF
                        </span>
                      )}
                      {o.customer_phone && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); openWhatsApp(o); }} 
                          className="text-muted-foreground hover:text-success transition-colors p-1" 
                          title="WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </td>
                <td className="p-4 font-bold text-foreground">R$ {Number(o.total).toFixed(2)}</td>
                <td className="p-4">
                  <span className="text-[11px] px-2.5 py-1 rounded-full bg-highlight/10 text-highlight font-bold uppercase tracking-tight">
                    {ORDER_STATUS_LABELS[o.status] || o.status}
                  </span>
                </td>
                <td className="p-4 text-muted-foreground font-medium">
                  {new Date(o.created_at).toLocaleDateString("pt-BR")}
                </td>
                <td className="p-4 text-right flex items-center justify-end gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => openDetail(o)}
                    className="h-8 w-8 hover:bg-highlight/10 hover:text-highlight"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="glass-card-premium border-gradient-premium">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="font-display font-bold">Excluir pedido #{o.order_number}?</AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground">
                          Esta ação não pode ser desfeita. O pedido e todos os itens/histórico serão removidos permanentemente.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => deleteOrder(o.id)} 
                          className="bg-destructive text-white hover:bg-destructive/90 rounded-xl font-bold"
                        >
                          Excluir Pedido
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={7} className="p-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                      <FileText className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground font-medium">Nenhum pedido encontrado</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};

export default OrderTable;
