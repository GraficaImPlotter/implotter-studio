import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/layout/AdminLayout";
import { 
  ShoppingCart, RefreshCcw, MessageSquare, 
  Trash2, User, Clock, Package, ExternalLink 
} from "lucide-react";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function AdminAbandonedCarts() {
  const { toast } = useToast();

  const { data: carts = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-abandoned-carts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_carts")
        .select(`
          *,
          profile:profiles(full_name, phone, email)
        `)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return data || [];
    }
  });

  const handleRecover = (cart: any) => {
    if (!cart.profile?.phone) {
      toast({ title: "Sem telefone", description: "Este cliente não possui telefone cadastrado.", variant: "destructive" });
      return;
    }
    const phone = cart.profile.phone.replace(/\D/g, "");
    const name = cart.profile.full_name?.split(' ')[0] || "Cliente";
    const msg = encodeURIComponent(`Olá ${name}! 👋 Vi que você deixou alguns itens no seu carrinho na ImPlotter Studio. 🎨\n\nPosso te ajudar com alguma dúvida técnica ou te oferecer um cupom de desconto para finalizar hoje?`);
    window.open(`https://wa.me/55${phone}?text=${msg}`, "_blank");
  };

  const getCartTotal = (cartData: any) => {
    if (!Array.isArray(cartData)) return 0;
    return cartData.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0);
  };

  return (
    <AdminLayout>
      <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-highlight/10 flex items-center justify-center border border-highlight/20 text-highlight shadow-glow-sm">
              <ShoppingCart className="w-7 h-7" />
            </div>
            <div>
              <h1 className="font-display text-4xl font-black text-foreground tracking-tight">CARRINHOS <span className="text-highlight">SAVED</span></h1>
              <p className="text-muted-foreground text-sm font-medium">Recuperação ativa de vendas perdidas</p>
            </div>
          </div>
          <button 
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all border border-white/5 text-[10px] font-black uppercase tracking-widest text-muted-foreground"
          >
            <RefreshCcw className="w-4 h-4" /> Atualizar
          </button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <div key={i} className="h-64 bg-card animate-pulse rounded-3xl" />)}
          </div>
        ) : carts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-card/40 rounded-[32px] border border-dashed border-white/10 opacity-40">
             <ShoppingCart className="w-20 h-20 mb-4" />
             <p className="text-xl font-bold uppercase tracking-widest">Nenhum carrinho salvo no momento</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {carts.map((cart: any) => (
              <motion.div
                key={cart.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-card-premium rounded-[32px] p-6 border-white/5 flex flex-col h-full relative overflow-hidden group shadow-xl"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-highlight/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-highlight/10 transition-all" />
                
                <div className="flex items-start justify-between mb-6 relative">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/5 shadow-sm">
                    <User className="w-6 h-6 text-highlight" />
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="bg-white/5 border-white/10 text-[9px] font-black tracking-widest uppercase">
                       {formatDistanceToNow(new Date(cart.updated_at), { addSuffix: true, locale: ptBR })}
                    </Badge>
                  </div>
                </div>

                <div className="mb-6 relative">
                  <h3 className="text-lg font-black text-foreground truncate mb-1">
                    {cart.profile?.full_name || "Assiduo Visitante"}
                  </h3>
                  <p className="text-xs text-muted-foreground font-medium truncate">{cart.profile?.email || "Email não disponível"}</p>
                </div>

                <div className="bg-white/5 rounded-2xl p-4 mb-6 flex-1 border border-white/5 group-hover:border-highlight/20 transition-all">
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-3 opacity-60">Conteúdo do Carrinho</p>
                  <div className="space-y-3">
                    {Array.isArray(cart.cart_data) && cart.cart_data.slice(0, 3).map((item: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                           <div className="w-6 h-6 rounded bg-highlight/20 flex items-center justify-center shrink-0">
                              <Package className="w-3 h-3 text-highlight" />
                           </div>
                           <span className="text-[11px] font-bold text-foreground/80 truncate">{item.name}</span>
                        </div>
                        <span className="text-[10px] font-black text-highlight shrink-0">x{item.quantity}</span>
                      </div>
                    ))}
                    {Array.isArray(cart.cart_data) && cart.cart_data.length > 3 && (
                      <p className="text-[10px] text-muted-foreground font-bold text-center mt-2">
                        + {cart.cart_data.length - 3} itens adicionais
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5 mt-auto flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-40 mb-1 leading-none">Potencial</p>
                    <p className="text-xl font-black text-foreground tracking-tighter">
                      R$ {getCartTotal(cart.cart_data).toFixed(2)}
                    </p>
                  </div>
                  <Button 
                    onClick={() => handleRecover(cart)}
                    className="w-12 h-12 rounded-2xl bg-success/10 text-success hover:bg-success hover:text-white transition-all border border-success/20 p-0 shadow-lg shadow-success/10"
                  >
                    <MessageSquare className="w-5 h-5" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
