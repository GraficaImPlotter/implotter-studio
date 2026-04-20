import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ShoppingBag, Calendar, CheckCircle2, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CustomerPurchaseHistoryProps {
  customerEmail?: string;
  customerCpfCnpj?: string;
}

const CustomerPurchaseHistory = ({ customerEmail, customerCpfCnpj }: CustomerPurchaseHistoryProps) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!customerEmail && !customerCpfCnpj) {
        setOrders([]);
        return;
      }

      setLoading(true);
      try {
        let query = supabase
          .from("orders")
          .select("order_number, total, status, created_at")
          .order("created_at", { ascending: false })
          .limit(3);

        if (customerCpfCnpj) {
          query = query.eq("customer_cpf_cnpj", customerCpfCnpj);
        } else if (customerEmail) {
          query = query.eq("customer_email", customerEmail);
        }

        const { data } = await query;
        setOrders(data || []);
      } catch (error) {
        console.error("Erro ao buscar histórico:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [customerEmail, customerCpfCnpj]);

  if (!customerEmail && !customerCpfCnpj) return null;
  if (loading) return <div className="animate-pulse h-20 bg-muted/20 rounded-lg" />;
  if (orders.length === 0) return null;

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        <ShoppingBag className="w-4 h-4" />
        <span>Últimas Compras do Cliente</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <AnimatePresence>
          {orders.map((order, i) => (
            <motion.div
              key={order.order_number}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className="bg-muted/30 border border-border rounded-xl p-3"
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-mono font-bold text-foreground">#{order.order_number}</span>
                <span className="text-xs font-bold text-primary">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(order.total)}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1">
                <Calendar className="w-3 h-3" />
                {format(new Date(order.created_at), "dd/MM/yyyy", { locale: ptBR })}
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-medium">
                {order.status === "finalizado" || order.status === "pagamento_confirmado" ? (
                  <CheckCircle2 className="w-3 h-3 text-success" />
                ) : (
                  <Clock className="w-3 h-3 text-warning" />
                )}
                <span className="capitalize">{order.status.replace(/_/g, " ")}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CustomerPurchaseHistory;
