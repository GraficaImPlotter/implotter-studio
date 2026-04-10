import { useState, useEffect } from "react";
import { 
  Bell, ShoppingCart, MessageSquare, DollarSign, 
  Clock, CheckCircle2, Package, UserPlus 
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

type Notification = {
  id: string;
  type: "order" | "message" | "lead" | "payment";
  title: string;
  description: string;
  time: Date;
  read: boolean;
};

export const NotificationHub = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [hasNew, setHasNew] = useState(false);

  useEffect(() => {
    // 1. Load initial notifications (simulated or from real aggregated data)
    const loadInitial = async () => {
      const [orders, leads, msgs] = await Promise.all([
        supabase.from("orders").select("id, order_number, customer_name, created_at").order("created_at", { ascending: false }).limit(3),
        supabase.from("leads").select("id, name, created_at").order("created_at", { ascending: false }).limit(2),
        supabase.from("chat_messages").select("id, content, created_at").eq("sender_type", "client").order("created_at", { ascending: false }).limit(2)
      ]);

      const items: Notification[] = [];
      
      orders.data?.forEach(o => items.push({
        id: `order-${o.id}`,
        type: "order",
        title: "Novo Pedido",
        description: `${o.customer_name} fez o pedido #${o.order_number}`,
        time: new Date(o.created_at),
        read: false
      }));

      leads.data?.forEach(l => items.push({
        id: `lead-${l.id}`,
        type: "lead",
        title: "Novo Lead",
        description: `${l.name} captado pelo sistema`,
        time: new Date(l.created_at),
        read: false
      }));

      msgs.data?.forEach(m => items.push({
        id: `msg-${m.id}`,
        type: "message",
        title: "Nova Mensagem",
        description: m.content.length > 40 ? m.content.slice(0, 40) + "..." : m.content,
        time: new Date(m.created_at),
        read: false
      }));

      setNotifications(items.sort((a, b) => b.time.getTime() - a.time.getTime()));
    };

    loadInitial();

    // 2. Realtime subscription
    const channel = supabase
      .channel('system_notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
        setHasNew(true);
        // Refresh or add manually
        setNotifications(prev => [{
          id: `order-${payload.new.id}`,
          type: "order",
          title: "Novo Pedido Realtime",
          description: `Pedido #${payload.new.order_number} recebido!`,
          time: new Date(payload.new.created_at),
          read: false
        }, ...prev].slice(0, 10));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const getIcon = (type: Notification["type"]) => {
    switch (type) {
      case "order": return <ShoppingCart className="w-3.5 h-3.5" />;
      case "message": return <MessageSquare className="w-3.5 h-3.5" />;
      case "lead": return <UserPlus className="w-3.5 h-3.5" />;
      case "payment": return <DollarSign className="w-3.5 h-3.5" />;
    }
  };

  const getColors = (type: Notification["type"]) => {
    switch (type) {
      case "order": return "bg-primary/10 text-primary border-primary/20";
      case "message": return "bg-highlight/10 text-highlight border-highlight/20";
      case "lead": return "bg-amber-400/10 text-amber-500 border-amber-400/20";
      case "payment": return "bg-success/10 text-success border-success/20";
    }
  };

  return (
    <Popover onOpenChange={(open) => open && setHasNew(false)}>
      <PopoverTrigger asChild>
        <button className="relative p-2 text-muted-foreground hover:text-highlight transition-all hover:bg-white/5 rounded-xl group overflow-hidden">
          <Bell className={cn("w-5 h-5", hasNew && "animate-shake")} />
          {hasNew && (
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-highlight rounded-full border border-background shadow-glow" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 glass-card-premium border-white/5 shadow-2xl rounded-2xl overflow-hidden mt-2" align="end">
        <div className="p-4 border-b border-white/5 bg-white/5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase tracking-widest text-foreground">Alertas do Sistema</h4>
            <span className="text-[10px] bg-highlight/20 text-highlight px-2 py-0.5 rounded-full font-bold">{notifications.length} novos</span>
          </div>
        </div>
        <div className="max-h-[350px] overflow-y-auto scrollbar-thin">
          <AnimatePresence initial={false}>
            {notifications.map((n) => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-4 hover:bg-white/5 border-b border-white/5 last:border-0 transition-colors cursor-pointer group"
              >
                <div className="flex gap-3">
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 transition-transform group-hover:scale-110", getColors(n.type))}>
                    {getIcon(n.type)}
                  </div>
                  <div className="space-y-1 overflow-hidden">
                    <p className="text-sm font-bold text-foreground leading-none">{n.title}</p>
                    <p className="text-[11px] text-muted-foreground truncate leading-tight">{n.description}</p>
                    <p className="text-[9px] text-muted-foreground/60 font-medium flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" /> {formatDistanceToNow(n.time, { addSuffix: true, locale: ptBR })}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {notifications.length === 0 && (
            <div className="p-12 text-center">
               <CheckCircle2 className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
               <p className="text-xs text-muted-foreground font-medium">Sistema limpo por aqui!</p>
            </div>
          )}
        </div>
        <div className="p-2 border-t border-white/5 bg-white/5">
           <button className="w-full py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-highlight transition-colors">
              Limpar Notificações
           </button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
