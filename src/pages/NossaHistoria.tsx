import { useEffect, useState } from "react";
import PublicLayout from "@/components/layout/PublicLayout";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeHTML } from "@/lib/sanitize";
import { motion } from "framer-motion";
import SEOHead from "@/components/SEOHead";
import PageHero from "@/components/layout/PageHero";

const NossaHistoria = () => {
  const [page, setPage] = useState<{ title: string; content: string } | null>(null);

  useEffect(() => {
    supabase.from("site_pages").select("title, content").eq("slug", "nossa-historia").maybeSingle().then(({ data }) => {
      if (data) setPage(data);
    });
  }, []);

  return (
    <PublicLayout>
      <SEOHead 
        title={page?.title || "Nossa História"} 
        description="Conheça a trajetória da Gráfica ImPlotter, nosso compromisso com a qualidade e nossa paixão por impressão profissional."
        canonical="/nossa-historia"
      />
      
      <PageHero 
        title={page?.title || "Nossa História"} 
        badge="Sobre Nós"
      />

      {/* Content Section */}
      <section className="py-20 bg-background relative">
        <div className="container mx-auto px-4 max-w-4xl">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="glass-card p-6 md:p-12 rounded-3xl shadow-elevated relative overflow-visible"
          >
            {/* Decorative background element */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-highlight/5 rounded-full blur-3xl pointer-events-none" />
            
            <div
              className="prose prose-lg dark:prose-invert max-w-none text-muted-foreground leading-relaxed break-words overflow-x-hidden
                prose-headings:font-display prose-headings:font-bold prose-headings:text-foreground
                prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-6
                prose-p:mb-6
                prose-strong:text-foreground prose-strong:font-bold
                prose-ul:list-disc prose-ul:pl-6 prose-li:mb-2"
              dangerouslySetInnerHTML={{ __html: sanitizeHTML(page?.content || "<p className='text-center'>Carregando história...</p>") }}
            />
          </motion.div>

          {/* Value markers or additional aesthetic element */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {[
              { label: "Qualidade", desc: "Materiais premium em cada impressão." },
              { label: "Agilidade", desc: "Prazos rápidos que respeitam seu tempo." },
              { label: "Confiança", desc: "Anos de experiência no mercado gráfico." }
            ].map((v, i) => (
              <div key={i} className="text-center p-6 border-b border-border md:border-b-0 md:border-r last:border-0 border-border/50">
                <h3 className="font-display font-bold text-xl mb-2 text-foreground">{v.label}</h3>
                <p className="text-sm text-muted-foreground">{v.desc}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>
    </PublicLayout>
  );
};

export default NossaHistoria;
