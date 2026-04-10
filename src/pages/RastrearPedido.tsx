import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PublicLayout from "@/components/layout/PublicLayout";
import SEOHead from "@/components/SEOHead";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Package, Search, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import PageHero from "@/components/layout/PageHero";

const RastrearPedido = () => {
  const navigate = useNavigate();
  const [orderNumber, setOrderNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!orderNumber.trim() || !phone.trim()) {
      setError("Preencha todos os campos.");
      return;
    }

    setLoading(true);
    try {
      const cleanPhone = phone.replace(/\D/g, "");
      const { data, error: dbErr } = await supabase
        .from("orders")
        .select("id, order_number, customer_phone")
        .eq("order_number", parseInt(orderNumber))
        .maybeSingle();

      if (dbErr || !data) {
        setError("Pedido não encontrado. Verifique o número e tente novamente.");
        setLoading(false);
        return;
      }

      const storedPhone = (data.customer_phone || "").replace(/\D/g, "");
      if (!storedPhone || !cleanPhone.endsWith(storedPhone.slice(-4))) {
        setError("Telefone não corresponde ao pedido. Verifique os dados.");
        setLoading(false);
        return;
      }

      navigate(`/acompanhar/${data.id}`);
    } catch {
      setError("Erro ao buscar pedido. Tente novamente.");
    }
    setLoading(false);
  };

  return (
    <PublicLayout>
      <SEOHead title="Rastrear Pedido" description="Acompanhe o status do seu pedido na Gráfica ImPlotter." canonical="/rastrear" />
      <PageHero 
        title="Rastrear Pedido" 
        badge="Acompanhe sua Entrega"
      >
        <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-4 backdrop-blur-md border border-white/20">
          <Package className="w-8 h-8 text-white" />
        </div>
        <p className="text-white/70 max-w-sm mx-auto">Insira o número do pedido e o telefone cadastrado para acompanhar o status em tempo real.</p>
      </PageHero>

      <section className="py-12 md:py-20 bg-background">
        <div className="container mx-auto px-4 max-w-md">

          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onSubmit={handleSubmit}
            className="glass-card rounded-2xl p-6 space-y-4"
          >
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Número do Pedido</label>
              <Input
                placeholder="Ex: 1042"
                value={orderNumber}
                onChange={e => setOrderNumber(e.target.value.replace(/\D/g, ""))}
                className="h-12"
                type="text"
                inputMode="numeric"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Telefone cadastrado</label>
              <Input
                placeholder="(00) 00000-0000"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="h-12"
                type="tel"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <Button type="submit" className="w-full h-12" disabled={loading}>
              {loading ? (
                <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" /> Rastrear
                </>
              )}
            </Button>
          </motion.form>
        </div>
      </section>
    </PublicLayout>
  );
};

export default RastrearPedido;
