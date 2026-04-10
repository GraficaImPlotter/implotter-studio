import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const fallbackFaqs = [
  { question: "Qual o prazo de produção?", answer: "O prazo varia de acordo com o produto e quantidade. Em geral, de 2 a 7 dias úteis após a confirmação do pagamento e aprovação da arte." },
  { question: "Quais formas de pagamento?", answer: "Atualmente aceitamos pagamento via PIX. É rápido, seguro e sem taxas adicionais para você." },
  { question: "Como funciona a entrega?", answer: "A entrega é combinada diretamente com a equipe. Trabalhamos com retirada no local e envio para determinadas regiões." },
  { question: "Preciso enviar a arte pronta?", answer: "Não necessariamente. Podemos ajudar a desenvolver ou ajustar sua arte. Entre em contato para mais detalhes." },
  { question: "Vocês trabalham com pedidos em grande escala?", answer: "Sim! Temos condições especiais para grandes quantidades. Entre em contato para um orçamento personalizado." },
];

const FAQSection = () => {
  const [faqs, setFaqs] = useState<any[]>(fallbackFaqs);

  useEffect(() => {
    supabase
      .from("faq_items")
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
      .limit(6)
      .then(({ data }) => {
        if (data && data.length > 0) setFaqs(data);
      });
  }, []);

  const faqSchema = useMemo(() => {
    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": faqs.map(faq => ({
        "@type": "Question",
        "name": faq.question || faq.q,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": faq.answer || faq.a
        }
      }))
    };
  }, [faqs]);

  return (
    <section className="py-24 bg-background">
      <SEOHead jsonLd={faqSchema} />
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <span className="text-highlight text-sm font-semibold tracking-wider uppercase mb-3 block">Tire suas dúvidas</span>
            <h2 className="font-display text-3xl md:text-5xl font-bold text-foreground mb-5">
              Perguntas
              <br />
              <span className="text-gradient-accent">Frequentes</span>
            </h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-md">
              Encontre respostas para as dúvidas mais comuns sobre nossos serviços, prazos e processos.
            </p>
            <Button variant="hero-outline" size="lg" asChild>
              <Link to="/faq">
                Ver todas as perguntas <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            viewport={{ once: true }}
          >
            <Accordion type="single" collapsible className="space-y-3">
              {faqs.map((faq, i) => (
                <AccordionItem
                  key={faq.id || i}
                  value={`faq-${i}`}
                  className="glass-card rounded-xl px-6 border-0 data-[state=open]:border-glow data-[state=open]:shadow-glow"
                >
                  <AccordionTrigger className="text-left font-display font-semibold text-foreground hover:no-underline hover:text-highlight transition-colors py-5">
                    {faq.question || faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed pb-5">
                    {faq.answer || faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
