import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Printer, Scissors, CheckCircle2, Layers, 
  AlertTriangle, Clock, Maximize2, Minimize2 
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";

const STATUS_CONFIG: Record<string, { label: string, icon: any, color: string }> = {
  aprovado_producao: { label: "FILA", icon: Layers, color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  aguardando_arte: { label: "ARTE", icon: Clock, color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
  arte_em_conferencia: { label: "CONFERIR", icon: Clock, color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
  em_producao: { label: "IMPRESSÃO", icon: Printer, color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  em_acabamento: { label: "ACABAMENTO", icon: Scissors, color: "text-orange-400 bg-orange-500/10 border-orange-500/20" },
  pronto_envio: { label: "PRONTO", icon: CheckCircle2, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
};

export default function AdminProducaoMonitor() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["production-monitor-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, customer_name, status, created_at, order_items(product_name, quantity)")
        .in("status", Object.keys(STATUS_CONFIG))
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 15000, // Sync every 15 seconds
  });

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-highlight border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6 font-sans selection:bg-highlight selection:text-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-6">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-[24px] bg-highlight/10 flex items-center justify-center border-2 border-highlight/20 shadow-glow-strong">
            <Printer className="w-8 h-8 text-highlight" />
          </div>
          <div>
            <h1 className="text-5xl font-black tracking-tighter uppercase leading-none">
              MONITOR <span className="text-highlight">PRODUÇÃO</span>
            </h1>
            <p className="text-muted-foreground font-black text-xs uppercase tracking-[0.4em] mt-2 opacity-50">
              Fluxo em tempo real • {orders.length} pedidos ativos
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-right">
           <div className="flex flex-col">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Última Atualização</span>
              <span className="text-xl font-mono font-bold text-highlight">{format(new Date(), "HH:mm:ss")}</span>
           </div>
           <button 
            onClick={toggleFullscreen}
            className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all border border-white/5"
           >
             {isFullscreen ? <Minimize2 className="w-6 h-6" /> : <Maximize2 className="w-6 h-6" />}
           </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
        {orders.map((order) => {
          const config = STATUS_CONFIG[order.status] || { label: "N/A", icon: Clock, color: "text-gray-400" };
          const daysAgo = differenceInDays(new Date(), new Date(order.created_at));
          const isLate = daysAgo > 3;

          return (
            <div 
              key={order.id}
              className={`relative bg-card/40 backdrop-blur-3xl border ${isLate ? 'border-destructive/40 bg-destructive/5' : 'border-white/5'} rounded-[32px] p-6 shadow-2xl transition-all animate-in fade-in zoom-in duration-500`}
            >
              {isLate && (
                <div className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-destructive flex items-center justify-center shadow-glow-strong animate-bounce">
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
              )}

              <div className="flex items-center justify-between mb-4">
                <div className={`px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${config.color}`}>
                   <config.icon className="w-3.5 h-3.5" />
                   {config.label}
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-muted-foreground uppercase opacity-40 leading-none mb-1 tracking-tighter">Entrada</p>
                  <p className="text-sm font-bold font-mono text-white/60">{format(new Date(order.created_at), "dd/MM")}</p>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-4xl font-black tracking-tighter text-white mb-2">#{order.order_number}</h3>
                <p className="text-lg font-bold text-highlight truncate opacity-90">{order.customer_name}</p>
              </div>

              <div className="space-y-3 mb-6 min-h-[100px]">
                {order.order_items.map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between bg-white/5 px-4 py-3 rounded-2xl border border-white/5">
                    <span className="text-xs font-bold text-white/80 truncate w-[70%]">{item.product_name}</span>
                    <span className="text-sm font-black text-highlight">x{item.quantity}</span>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-white/5">
                 <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                       <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-40 mb-1">Atraso</span>
                       <span className={`text-xl font-black ${isLate ? 'text-destructive' : 'text-white/60'}`}>
                          {daysAgo} DIAS
                       </span>
                    </div>
                    {isLate && (
                      <Badge variant="destructive" className="animate-pulse px-3 py-1 text-[10px] font-black tracking-widest uppercase">
                        CRÍTICO
                      </Badge>
                    )}
                 </div>
              </div>
            </div>
          );
        })}
      </div>

      {orders.length === 0 && (
        <div className="flex flex-col items-center justify-center p-20 opacity-20 filter grayscale">
           <Printer className="w-40 h-40 mb-6" />
           <p className="text-3xl font-black uppercase tracking-[0.3em]">Fila Limpa</p>
        </div>
      )}

      {/* Footer Info */}
      <div className="fixed bottom-6 left-6 right-6 flex items-center justify-between pointer-events-none opacity-40">
         <p className="text-[10px] font-black uppercase tracking-[0.4em]">Gráfica ImPlotter Studio • Sistema de Produção v2.4</p>
         <div className="flex gap-4">
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div> <span className="text-[10px] font-black uppercase tracking-widest">Normal</span></div>
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-destructive animate-pulse"></div> <span className="text-[10px] font-black uppercase tracking-widest">Atrasado</span></div>
         </div>
      </div>
    </div>
  );
}
