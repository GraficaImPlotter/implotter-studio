import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, MessageCircle } from "lucide-react";

const CTASection = () => {
  const [whatsapp, setWhatsapp] = useState("5500000000000");

  useEffect(() => {
    supabase.from("site_settings").select("value").eq("key", "whatsapp").maybeSingle().then(({ data }) => {
      if (data?.value) setWhatsapp(data.value);
    });
  }, []);

  return (
    <section className="py-24 bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-[#111827]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-secondary/10 rounded-full blur-[120px]" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-accent/10 rounded-full blur-[100px]" />

      <div className="container mx-auto px-4 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center"
        >
          <div className="glass-card-premium rounded-[3rem] p-12 md:p-20 border-white/10 relative overflow-hidden shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
            <div className="relative">
              <span className="text-secondary font-black uppercase tracking-[0.2em] text-[11px] mb-6 block">Pronto para começar?</span>
              <h2 className="font-display text-4xl md:text-6xl font-black text-white mb-6 tracking-tighter leading-tight">
                Tire sua ideia do papel com a <span className="text-secondary text-gradient-primary">ImPlotter</span>
              </h2>
              <p className="text-white/70 text-lg font-medium mb-12 max-w-2xl mx-auto leading-relaxed">
                Nossa equipe de especialistas está pronta para ajudar você a encontrar a solução ideal para destacar o seu negócio no mercado.
              </p>
              <div className="flex flex-wrap justify-center gap-5">
                <Button asChild className="h-16 px-10 bg-secondary hover:bg-secondary/90 text-white rounded-2xl text-[13px] font-black uppercase tracking-widest shadow-xl shadow-secondary/25 active:scale-95 transition-all">
                  <Link to="/fale-conosco">
                    Solicitar Orçamento <ArrowRight className="w-5 h-5 ml-2" />
                  </Link>
                </Button>
                <Button variant="outline" asChild className="h-16 px-10 bg-white/5 hover:bg-white/10 border-white/20 text-white rounded-2xl text-[13px] font-black uppercase tracking-widest active:scale-95 transition-all outline-none">
                  <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3">
                    <MessageCircle className="w-5 h-5 fill-current" /> Falar no WhatsApp
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
