import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import PublicLayout from "@/components/layout/PublicLayout";
import { supabase } from "@/integrations/supabase/client";
import { Package, CheckCircle, Clock, Truck, Scissors, Palette, CreditCard, FileSearch, Eye, Printer, Box, XCircle, MapPin } from "lucide-react";
import { motion } from "framer-motion";

const ALL_STATUSES = [
  { key: "pedido_recebido", label: "Pedido Recebido", icon: Package },
  { key: "aguardando_pagamento", label: "Aguardando Pagamento", icon: CreditCard },
  { key: "pagamento_confirmado", label: "Pagamento Confirmado", icon: CheckCircle },
  { key: "em_analise", label: "Em Análise", icon: FileSearch },
  { key: "aguardando_arte", label: "Aguardando Arte", icon: Palette },
  { key: "arte_em_conferencia", label: "Arte em Conferência", icon: Eye },
  { key: "aprovado_producao", label: "Aprovado p/ Produção", icon: Printer },
  { key: "em_producao", label: "Em Produção", icon: Printer },
  { key: "em_acabamento", label: "Em Acabamento", icon: Scissors },
  { key: "pronto_envio", label: "Pronto para Envio", icon: Box },
  { key: "finalizado", label: "Finalizado", icon: Truck },
];

interface TrackingEvent {
  status: string;
  date: string;
  locale: string;
  message: string;
}

const AcompanharPedido = () => {
  const { orderId } = useParams();
  const [order, setOrder] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [trackingEvents, setTrackingEvents] = useState<TrackingEvent[]>([]);
  const [trackingLoading, setTrackingLoading] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    const load = async () => {
      const [{ data: o }, { data: h }, { data: it }] = await Promise.all([
        supabase.from("orders").select("*").eq("id", orderId).maybeSingle(),
        supabase.from("order_status_history").select("*").eq("order_id", orderId).order("created_at", { ascending: true }),
        supabase.from("order_items").select("*").eq("order_id", orderId),
      ]);
      setOrder(o);
      setHistory(h ?? []);
      setItems(it ?? []);
      setLoading(false);

      // If order has tracking_code, fetch tracking
      if (o?.tracking_code) {
        setTrackingLoading(true);
        try {
          const { data: trackData } = await supabase.functions.invoke("melhor-envio-tracking", {
            body: { tracking_codes: [o.tracking_code] },
          });
          if (trackData?.tracking) {
            const trackingObj = trackData.tracking;
            // Melhor Envio returns an object keyed by tracking code
            const events = trackingObj[o.tracking_code] || trackingObj[Object.keys(trackingObj)[0]];
            if (Array.isArray(events)) {
              setTrackingEvents(events.map((e: any) => ({
                status: e.status || "",
                date: e.date || e.datetime || "",
                locale: e.locale || e.city || "",
                message: e.message || e.description || e.status || "",
              })));
            }
          }
        } catch (err) {
          console.error("Tracking fetch error:", err);
        }
        setTrackingLoading(false);
      }
    };
    load();
  }, [orderId]);

  if (loading) {
    return (
      <PublicLayout>
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </PublicLayout>
    );
  }

  if (!order) {
    return (
      <PublicLayout>
        <div className="py-20 text-center">
          <h1 className="font-display text-2xl font-bold text-foreground mb-4">Pedido não encontrado</h1>
          <Link to="/" className="text-primary hover:underline">Voltar ao início</Link>
        </div>
      </PublicLayout>
    );
  }

  const isCancelled = order.status === "cancelado";
  const currentIdx = ALL_STATUSES.findIndex(s => s.key === order.status);
  const completedStatuses = new Set(history.map((h: any) => h.status));

  return (
    <PublicLayout>
      <section className="py-8 md:py-12">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-8">
            <h1 className="font-display text-3xl font-bold text-foreground">
              Pedido <span className="text-primary">#{order.order_number}</span>
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {order.customer_name} • {new Date(order.created_at).toLocaleDateString("pt-BR")}
            </p>
          </div>

          {/* Production timeline */}
          <div className="glass-card rounded-2xl p-6 md:p-8 mb-8">
            <h2 className="font-display font-bold text-foreground mb-6">Acompanhamento</h2>

            {isCancelled ? (
              <div className="flex items-center gap-3 bg-destructive/10 border border-destructive/20 rounded-xl p-4">
                <XCircle className="w-6 h-6 text-destructive" />
                <div>
                  <p className="font-semibold text-destructive">Pedido Cancelado</p>
                  <p className="text-xs text-muted-foreground">Este pedido foi cancelado.</p>
                </div>
              </div>
            ) : (
              <div className="relative">
                {ALL_STATUSES.map((step, i) => {
                  const isCompleted = completedStatuses.has(step.key) || i < currentIdx;
                  const isCurrent = i === currentIdx;
                  const isFuture = i > currentIdx;
                  const Icon = step.icon;
                  const histEntry = history.find((h: any) => h.status === step.key);

                  return (
                    <motion.div
                      key={step.key}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex gap-4 relative"
                    >
                      <div className="flex flex-col items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all
                          ${isCurrent ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/30" : ""}
                          ${isCompleted && !isCurrent ? "bg-success border-success text-success-foreground" : ""}
                          ${isFuture ? "bg-muted border-border text-muted-foreground" : ""}
                        `}>
                          {isCompleted && !isCurrent ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                        </div>
                        {i < ALL_STATUSES.length - 1 && (
                          <div className={`w-0.5 h-10 ${isCompleted ? "bg-success" : "bg-border"}`} />
                        )}
                      </div>
                      <div className="pb-8">
                        <p className={`font-semibold text-sm ${isCurrent ? "text-primary" : isCompleted ? "text-foreground" : "text-muted-foreground"}`}>
                          {step.label}
                        </p>
                        {histEntry && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {new Date(histEntry.created_at).toLocaleString("pt-BR")}
                            {histEntry.notes && ` — ${histEntry.notes}`}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Shipping tracking from Melhor Envio */}
          {order.tracking_code && (
            <div className="glass-card rounded-2xl p-6 md:p-8 mb-8">
              <h2 className="font-display font-bold text-foreground mb-4 flex items-center gap-2">
                <Truck className="w-5 h-5 text-highlight" /> Rastreamento da Entrega
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Código: <span className="font-mono font-semibold text-foreground">{order.tracking_code}</span>
                {order.shipping_service && <span> • {order.shipping_service}</span>}
              </p>

              {trackingLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  Consultando rastreamento...
                </div>
              ) : trackingEvents.length > 0 ? (
                <div className="space-y-3">
                  {trackingEvents.map((evt, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex gap-3"
                    >
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border-2 ${i === 0 ? "bg-highlight border-highlight text-highlight-foreground" : "bg-muted border-border text-muted-foreground"}`}>
                          <MapPin className="w-4 h-4" />
                        </div>
                        {i < trackingEvents.length - 1 && <div className="w-0.5 h-6 bg-border" />}
                      </div>
                      <div className="pb-4">
                        <p className={`text-sm font-semibold ${i === 0 ? "text-highlight" : "text-foreground"}`}>
                          {evt.message}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {evt.locale && `${evt.locale} • `}
                          {evt.date && new Date(evt.date).toLocaleString("pt-BR")}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Ainda não há informações de rastreamento disponíveis.
                </p>
              )}
            </div>
          )}

          {/* Order items */}
          <div className="glass-card rounded-2xl p-6 mb-8">
            <h2 className="font-display font-bold text-foreground mb-4">Itens</h2>
            <div className="space-y-2">
              {items.map((it: any) => (
                <div key={it.id} className="flex justify-between text-sm py-2 border-b border-border last:border-0">
                  <span className="text-foreground">{it.product_name} <span className="text-muted-foreground">x{it.quantity}</span></span>
                  <span className="font-semibold text-foreground">R$ {Number(it.subtotal).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-border flex justify-between">
              <span className="font-display font-bold text-foreground">Total</span>
              <span className="font-display font-bold text-foreground text-lg">R$ {Number(order.total).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
};

export default AcompanharPedido;
