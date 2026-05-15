import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Eye,
  Pencil,
  MessageCircle,
  FileText,
  QrCode,
  Copy,
  ChevronRight,
  ExternalLink,
  Receipt,
  Info,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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

interface ManualSalesTableProps {
  orders: any[];
  onEdit: (order: any) => void;
  onDuplicate: (order: any) => void;
  onView: (order: any) => void;
  onWhatsApp: (order: any) => void;
  onReceipt: (order: any) => void;
  onPix: (order: any) => void;
}

const ManualSalesTable = ({
  orders,
  onEdit,
  onDuplicate,
  onView,
  onWhatsApp,
  onReceipt,
  onPix,
}: ManualSalesTableProps) => {
  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(v);

  return (
    <TooltipProvider>
      <div className="glass-card rounded-2xl border-glow">
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-white/5">
          <table className="w-full text-sm min-w-[1000px]">
            <thead>
              <tr className="bg-muted/50 border-b border-border/50">
                <th className="text-left p-4 font-bold text-muted-foreground uppercase tracking-wider text-[10px]">
                  Pedido
                </th>
                <th className="text-left p-4 font-bold text-muted-foreground uppercase tracking-wider text-[10px]">
                  Cliente
                </th>
                <th className="text-left p-4 font-bold text-muted-foreground uppercase tracking-wider text-[10px]">
                  Valor
                </th>
                <th className="text-left p-4 font-bold text-muted-foreground uppercase tracking-wider text-[10px]">
                  Origem
                </th>
                <th className="text-left p-4 font-bold text-muted-foreground uppercase tracking-wider text-[10px]">
                  Status
                </th>
                <th className="text-left p-4 font-bold text-muted-foreground uppercase tracking-wider text-[10px]">
                  Data
                </th>
                <th className="text-right p-4 font-bold text-muted-foreground uppercase tracking-wider text-[10px]">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              <AnimatePresence>
                {orders.map((o, idx) => (
                  <motion.tr
                    key={o.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="group hover:bg-muted/30 transition-colors"
                  >
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-mono font-bold text-foreground">
                          #{o.order_number}
                        </span>
                        {o.payment_method && (
                          <span className="text-[10px] text-muted-foreground uppercase">
                            {o.payment_method}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground">
                          {o.customer_name}
                        </span>
                        <span className="text-[10px] text-muted-foreground line-clamp-1">
                          {o.customer_email || "Sem email"}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 font-bold text-primary">
                      {formatCurrency(o.total)}
                    </td>
                    <td className="p-4">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-normal ${o.origin === "orcamento" ? "border-info/30 text-info" : "border-muted-foreground/30 text-muted-foreground"}`}
                      >
                        {o.origin === "orcamento" ? "Orçamento" : "Manual"}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <Badge
                        className={`rounded-full px-2.5 py-0.5 border ${statusColors[o.status] || "bg-muted text-muted-foreground"}`}
                      >
                        {statusLabels[o.status] || o.status}
                      </Badge>
                    </td>
                    <td className="p-4 text-muted-foreground text-xs">
                      {format(new Date(o.created_at), "dd/MM/yyyy", {
                        locale: ptBR,
                      })}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-1 transition-opacity">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-highlight/10 hover:text-highlight"
                              onClick={() => onEdit(o)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Editar Pedido</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-success/10 hover:text-success"
                              onClick={() => onWhatsApp(o)}
                            >
                              <MessageCircle className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>WhatsApp</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                              onClick={() => onReceipt(o)}
                            >
                              <FileText className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Gerar Recibo</TooltipContent>
                        </Tooltip>

                        {o.payment_method === "pix" && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:bg-highlight-glow/10 hover:text-highlight-glow"
                                onClick={() => onPix(o)}
                              >
                                <QrCode className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Código PIX</TooltipContent>
                          </Tooltip>
                        )}

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={() => onDuplicate(o)}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Duplicar Venda</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={() => onEdit(o)}
                            >
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Ver Detalhes</TooltipContent>
                        </Tooltip>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
              {orders.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="p-12 text-center text-muted-foreground"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Info className="w-8 h-8 opacity-20" />
                      <p>Nenhuma venda manual registrada no período.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default ManualSalesTable;
