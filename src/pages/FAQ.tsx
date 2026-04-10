import { useEffect, useState } from "react";
import PublicLayout from "@/components/layout/PublicLayout";
import { supabase } from "@/integrations/supabase/client";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const fallbackFaqs = [
  { question: "Qual o prazo de produção?", answer: "O prazo varia de 2 a 7 dias úteis, dependendo do produto e quantidade." },
  { question: "Quais formas de pagamento?", answer: "Aceitamos pagamento via PIX." },
  { question: "Como funciona a entrega?", answer: "Retirada no local ou envio conforme a região." },
  { question: "Preciso enviar a arte pronta?", answer: "Não necessariamente. Podemos ajudar com a arte." },
  { question: "Como acompanho meu pedido?", answer: "Na área do cliente, você acompanha cada etapa da produção." },
  { question: "Vocês fazem orçamento personalizado?", answer: "Sim! Entre em contato pelo WhatsApp ou formulário." },
];

const FAQ = () => {
  const [faqs, setFaqs] = useState<any[]>(fallbackFaqs);

  useEffect(() => {
    supabase
      .from("faq_items")
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => {
        if (data && data.length > 0) setFaqs(data);
      });
  }, []);

  return (
    <PublicLayout>
      <section className="py-12">
        <div className="container mx-auto px-4 max-w-2xl">
          <h1 className="font-display text-4xl font-bold text-foreground mb-8">Perguntas Frequentes</h1>
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, i) => (
              <AccordionItem key={faq.id || i} value={`faq-${i}`} className="bg-card rounded-xl border border-border px-6 shadow-card">
                <AccordionTrigger className="text-left font-display font-semibold text-foreground hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>
    </PublicLayout>
  );
};

export default FAQ;
