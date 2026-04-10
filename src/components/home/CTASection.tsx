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
      {/* Background decorations */}
      <div className="absolute inset-0 bg-gradient-to-b from-highlight/5 via-transparent to-transparent" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-highlight/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center"
        >
          <div className="glass-card rounded-3xl p-12 md:p-16 border-glow relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-highlight/5 to-highlight-glow/5" />
            <div className="relative">
              <span className="text-highlight text-sm font-semibold tracking-wider uppercase mb-4 block">Vamos conversar</span>
              <h2 className="font-display text-3xl md:text-5xl font-bold text-foreground mb-5">
                Precisa de ajuda para
                <br />
                <span className="text-gradient-accent">escolher seu material?</span>
              </h2>
              <p className="text-muted-foreground text-lg mb-10 max-w-xl mx-auto">
                Nossa equipe de especialistas está pronta para ajudar você a encontrar a solução ideal para destacar sua marca.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Button variant="hero" size="xl" asChild>
                  <Link to="/fale-conosco">
                    Fale Conosco <ArrowRight className="w-5 h-5" />
                  </Link>
                </Button>
                <Button variant="premium" size="xl" asChild>
                  <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="w-5 h-5" /> WhatsApp
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
