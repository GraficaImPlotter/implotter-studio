import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import PublicLayout from "@/components/layout/PublicLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { FileText, CheckCircle, Share2, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";

const OrcamentoPublico = () => {
  const { quoteId } = useParams();
  const { toast } = useToast();
  const [quote, setQuote] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!quoteId) return;
    const load = async () => {
      const [{ data: q }, { data: it }] = await Promise.all([
        supabase.from("quotes").select("*").eq("id", quoteId).maybeSingle(),
        supabase.from("quote_items").select("*").eq("quote_id", quoteId).order("sort_order"),
      ]);
      setQuote(q);
      setItems(it ?? []);
      setLoading(false);
    };
    load();
  }, [quoteId]);

  const handleAccept = async () => {
    if (!quote) return;
    setAccepting(true);
    await supabase.from("quotes").update({ status: "aceito", updated_at: new Date().toISOString() }).eq("id", quote.id);
    setQuote({ ...quote, status: "aceito" });
    toast({ title: "Orçamento aceito com sucesso!" });
    setAccepting(false);
  };

  const shareWhatsApp = () => {
    const url = window.location.href;
    const text = `Veja o orçamento #${quote?.quote_number} da Gráfica ImPlotter: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({ title: "Link copiado!" });
  };

  if (loading) {
    return (
      <PublicLayout>
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </PublicLayout>
    );
  }

  if (!quote) {
    return (
      <PublicLayout>
        <div className="py-20 text-center">
          <h1 className="font-display text-2xl font-bold text-foreground mb-4">Orçamento não encontrado</h1>
        </div>
      </PublicLayout>
    );
  }

  const isExpired = quote.valid_until && new Date(quote.valid_until + "T23:59:59") < new Date();
  const isAccepted = quote.status === "aceito";
  const isRecusado = quote.status === "recusado";

  return (
    <PublicLayout>
      <section className="py-8 md:py-12">
        <div className="container mx-auto px-4 max-w-2xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-6 md:p-8">
            <div className="text-center mb-6">
              <div className="mx-auto bg-primary/10 p-3 rounded-full mb-3 w-fit">
                <FileText className="w-8 h-8 text-primary" />
              </div>
              <h1 className="font-display text-2xl font-bold text-foreground">
                Orçamento <span className="text-primary">#{quote.quote_number}</span>
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                Para: {quote.customer_name} • {new Date(quote.created_at).toLocaleDateString("pt-BR")}
              </p>
              {quote.valid_until && (
                <p className={`text-xs mt-1 ${isExpired ? "text-destructive" : "text-muted-foreground"}`}>
                  Válido até: {new Date(quote.valid_until + "T12:00:00").toLocaleDateString("pt-BR")}
                  {isExpired && " (Vencido)"}
                </p>
              )}
            </div>

            {/* Status badge */}
            {isAccepted && (
              <div className="flex items-center gap-2 bg-success/10 border border-success/20 rounded-xl p-3 mb-6 justify-center">
                <CheckCircle className="w-5 h-5 text-success" />
                <span className="text-success font-semibold">Orçamento Aceito</span>
              </div>
            )}

            {/* Items */}
            <div className="space-y-2 mb-6">
              {items.map((item: any, i: number) => (
                <div key={item.id || i} className="flex justify-between text-sm py-2.5 border-b border-border last:border-0">
                  <div>
                    <span className="text-foreground font-medium">{item.product_name}</span>
                    {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
                    <span className="text-xs text-muted-foreground"> x{item.quantity}</span>
                  </div>
                  <span className="font-semibold text-foreground">R$ {Number(item.subtotal).toFixed(2)}</span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="border-t border-border pt-4 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-foreground">R$ {Number(quote.subtotal).toFixed(2)}</span>
              </div>
              {Number(quote.discount) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Desconto</span>
                  <span className="text-success">-R$ {Number(quote.discount).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold pt-2 border-t border-border">
                <span className="text-foreground">Total</span>
                <span className="text-foreground">R$ {Number(quote.total).toFixed(2)}</span>
              </div>
            </div>

            {quote.notes && (
              <div className="mt-4 bg-secondary/50 rounded-xl p-3">
                <p className="text-xs text-muted-foreground font-semibold mb-1">Observações:</p>
                <p className="text-sm text-foreground">{quote.notes}</p>
              </div>
            )}

            {/* Actions */}
            <div className="mt-6 space-y-3">
              {!isAccepted && !isRecusado && !isExpired && (
                <Button variant="hero" size="lg" className="w-full" onClick={handleAccept} disabled={accepting}>
                  <CheckCircle className="w-5 h-5" /> {accepting ? "Aceitando..." : "Aceitar Orçamento"}
                </Button>
              )}

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={shareWhatsApp}>
                  <MessageCircle className="w-4 h-4" /> WhatsApp
                </Button>
                <Button variant="outline" className="flex-1" onClick={copyLink}>
                  <Share2 className="w-4 h-4" /> Copiar Link
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </PublicLayout>
  );
};

export default OrcamentoPublico;
