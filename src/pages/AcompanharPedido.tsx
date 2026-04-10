import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import PublicLayout from "@/components/layout/PublicLayout";
import { supabase } from "@/integrations/supabase/client";
import { 
  Check, Package, CreditCard, CheckCircle2, 
  Search, Palette, Eye, Printer, Scissors, 
  Box, Truck, XCircle, ArrowLeft, Clock, MapPin
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const STEPS = [
  { key: "pedido_recebido", label: "Recebemos seu pedido", description: "Iniciando processamento administrativo", icon: Package },
  { key: "aguardando_pagamento", label: "Aguardando pagamento", description: "Aguardando confirmação bancária", icon: CreditCard },
  { key: "pagamento_confirmado", label: "Pagamento confirmado", description: "Seu pedido entrou na fila oficial", icon: CheckCircle2 },
  { key: "em_analise", label: "Análise de arquivo", description: "Verificando qualidade da arte", icon: Search },
  { key: "aguardando_arte", label: "Aguardando arte", description: "Aguardando envio do arquivo", icon: Palette },
  { key: "arte_em_conferencia", label: "Arte em conferência", description: "Designers revisando detalhes", icon: Eye },
  { key: "aprovado_producao", label: "Aguardando produção", description: "Aprovado para a oficina", icon: Printer },
  { key: "em_producao", label: "Em produção", description: "Sua arte ganhando vida", icon: Printer },
  { key: "em_acabamento", label: "Em acabamento", description: "Corte e refinamentos finais", icon: Scissors },
  { key: "pronto_envio", label: "Pronto para envio", description: "Embalado e pronto para a transportadora", icon: Box },
  { key: "finalizado", label: "Entrega a caminho", description: "Seu pacote foi enviado", icon: Truck },
];

const AcompanharPedido = () => {
  const { orderId } = useParams();
  const [order, setOrder] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;
    const load = async () => {
      const [{ data: o }, { data: h }] = await Promise.all([
        supabase.from("orders").select("*").eq("id", orderId).maybeSingle(),
        supabase.from("order_status_history").select("*").eq("order_id", orderId).order("created_at", { ascending: true }),
      ]);
      setOrder(o);
      setHistory(h ?? []);
      setLoading(false);
    };
    load();
  }, [orderId]);

  if (loading) {
    return (
      <PublicLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </PublicLayout>
    );
  }

  if (!order) {
    return (
      <PublicLayout>
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
           <XCircle className="w-16 h-16 text-muted-foreground/20 mb-4" />
           <h1 className="font-display text-2xl font-bold mb-2">Pedido Não Encontrado</h1>
           <p className="text-muted-foreground mb-8">Não conseguimos localizar as informações deste pedido.</p>
           <Link to="/loja">
              <Button variant="outline" className="rounded-2xl">Voltar para a Loja</Button>
           </Link>
        </div>
      </PublicLayout>
    );
  }

  const currentStatusIdx = STEPS.findIndex(s => s.key === order.status);
  const completedStatuses = new Set(history.map(h => h.status));

  return (
    <PublicLayout>
      <div className="bg-slate-50 min-h-screen py-12 md:py-20">
        <div className="container mx-auto px-4 max-w-4xl">
           {/* Header Minimalist */}
           <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
              <div className="space-y-1">
                 <Link to="/minha-conta" className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary transition-colors mb-4 uppercase tracking-widest">
                    <ArrowLeft className="w-3 h-3" /> Voltar para Meus Pedidos
                 </Link>
                 <h1 className="font-display text-4xl font-black text-slate-900 tracking-tight">Status do Pedido</h1>
                 <p className="text-slate-500 font-medium">Identificador: <span className="font-bold text-slate-900">#{order.order_number}</span> • {new Date(order.created_at).toLocaleDateString("pt-BR")}</p>
              </div>
              <div className="bg-white px-6 py-4 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-4">
                 <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <Package className="w-5 h-5" />
                 </div>
                 <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 leading-none mb-1">Status Atual</p>
                    <p className="font-bold text-slate-900 leading-none capitalize">{order.status.replace(/_/g, " ")}</p>
                 </div>
              </div>
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              {/* Vertical Stepper */}
              <div className="lg:col-span-8 bg-white rounded-[2.5rem] p-8 md:p-12 shadow-xl shadow-slate-200/50 border border-slate-100">
                 <h3 className="font-display font-black text-xl mb-10 text-slate-900 flex items-center gap-3">
                    <Clock className="w-5 h-5 text-primary" /> Jornada de Produção
                 </h3>
                 
                 <div className="space-y-0">
                    {STEPS.map((step, i) => {
                      const isCompleted = completedStatuses.has(step.key) || i < currentStatusIdx;
                      const isCurrent = step.key === order.status;
                      const isFuture = i > currentStatusIdx && !isCompleted;
                      const histEntry = history.find(h => h.status === step.key);

                      return (
                        <div key={step.key} className="flex gap-6 relative group">
                           {/* Line */}
                           {i < STEPS.length - 1 && (
                             <div className={cn(
                               "absolute left-[19px] top-10 w-[2px] h-[calc(100%-20px)] transition-all duration-500",
                               isCompleted ? "bg-primary" : "bg-slate-100"
                             )} />
                           )}

                           {/* Bullet */}
                           <div className="flex flex-col items-center shrink-0">
                              <motion.div 
                                initial={false}
                                animate={{ 
                                  scale: isCurrent ? 1.2 : 1,
                                  backgroundColor: isCurrent || isCompleted ? "var(--tw-primary)" : "transparent"
                                }}
                                className={cn(
                                  "w-10 h-10 rounded-full flex items-center justify-center border-2 z-10 transition-all duration-300",
                                  isCurrent ? "border-primary text-white shadow-lg shadow-primary/20" : 
                                  isCompleted ? "border-primary text-white" : 
                                  "border-slate-200 text-slate-300"
                                )}
                              >
                                {isCompleted && !isCurrent ? <Check className="w-5 h-5" /> : <step.icon className="w-5 h-5" />}
                              </motion.div>
                           </div>

                           {/* Content */}
                           <div className="pb-10 pt-1">
                              <h4 className={cn(
                                "text-sm font-bold tracking-tight transition-colors",
                                isCurrent ? "text-primary text-base" : isCompleted ? "text-slate-900" : "text-slate-400"
                              )}>
                                 {step.label}
                                 {isCurrent && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-primary/10 text-primary uppercase font-black tracking-normal">Em Andamento</span>}
                              </h4>
                              <p className="text-xs text-slate-500 mt-1 max-w-sm leading-relaxed">
                                 {step.description}
                              </p>
                              {histEntry && (
                                <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-tight">
                                   {new Date(histEntry.created_at).toLocaleDateString("pt-BR", { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                </p>
                              )}
                           </div>
                        </div>
                      );
                    })}
                 </div>
              </div>

              {/* Sidebar Info */}
              <div className="lg:col-span-4 space-y-6">
                 {order.tracking_code && (
                    <div className="bg-slate-900 rounded-[2rem] p-8 text-white shadow-2xl overflow-hidden relative">
                       <div className="absolute top-0 right-0 p-8 opacity-10">
                          <Truck className="w-32 h-32" />
                       </div>
                       <h4 className="font-display font-bold text-lg mb-6 flex items-center gap-2">
                          <Truck className="w-5 h-5 text-highlight" /> Entrega
                       </h4>
                       <div className="space-y-4 relative z-10">
                          <div>
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Código de Rastreio</p>
                             <p className="font-mono font-bold text-highlight">{order.tracking_code}</p>
                          </div>
                          <Link to={`/rastrear`}>
                             <Button className="w-full bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/10 mt-2 h-12 text-xs font-bold">
                                Consultar Detalhes
                             </Button>
                          </Link>
                       </div>
                    </div>
                 )}

                 <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-xl shadow-slate-200/50">
                    <h4 className="font-display font-bold text-slate-900 mb-6 flex items-center gap-2">
                       <MapPin className="w-5 h-5 text-primary" /> Endereço
                    </h4>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                       {order.shipping_address}<br />
                       {order.shipping_city} / {order.shipping_state}
                    </p>
                 </div>

                 <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-xl shadow-slate-200/50">
                    <h4 className="font-display font-bold text-slate-900 mb-6">Resumo Global</h4>
                    <div className="space-y-3">
                       <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Subtotal</span>
                          <span className="font-bold text-slate-900">R$ {Number(order.total).toFixed(2)}</span>
                       </div>
                       <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Envio</span>
                          <span className="font-bold text-success">Grátis</span>
                       </div>
                       <div className="pt-3 border-t border-slate-100 flex justify-between items-end">
                          <span className="text-[10px] font-black uppercase text-slate-400">Total Pago</span>
                          <span className="text-2xl font-black text-slate-900 tracking-tighter">R$ {Number(order.total).toFixed(2)}</span>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </PublicLayout>
  );
};

export default AcompanharPedido;
