import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Quote } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const fallbackReviews = [
  { name: "Maria Silva", company: "MS Design", city: "São Paulo", rating: 5, comment: "Qualidade excepcional nos cartões de visita. Atendimento impecável e entrega antes do prazo!" },
  { name: "João Santos", company: "Santos Advocacia", city: "Campinas", rating: 5, comment: "Sempre faço meus materiais aqui. Banners de excelente qualidade e preço justo. Recomendo!" },
  { name: "Ana Oliveira", company: "Studio AO", city: "Belo Horizonte", rating: 5, comment: "O acompanhamento da produção é um diferencial incrível. Profissionalismo de verdade!" },
  { name: "Carlos Mendes", company: "Tech Solutions", city: "Rio de Janeiro", rating: 5, comment: "Adesivos perfeitos para nossa identidade visual. Qualidade de impressão excepcional." },
  { name: "Patrícia Lima", company: "PL Eventos", city: "Curitiba", rating: 5, comment: "Panfletos que realmente impressionam. A qualidade do papel e da impressão são superiores." },
  { name: "Roberto Alves", company: "RA Consultoria", city: "Brasília", rating: 5, comment: "Atendimento ágil e material de primeira qualidade. Minha gráfica de confiança!" },
];

const ReviewsSection = () => {
  const [reviews, setReviews] = useState<any[]>(fallbackReviews);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [usingFallback, setUsingFallback] = useState(true);

  useEffect(() => {
    supabase
      .from("reviews_public")
      .select("*", { count: "exact" })
      .eq("is_approved", true)
      .eq("is_hidden", false)
      .order("is_featured", { ascending: false })
      .limit(6)
      .then(({ data, count }) => {
        if (data && data.length > 0) {
          setReviews(data);
          setTotalCount(count ?? data.length);
          setUsingFallback(false);
        }
      });
  }, []);

  const avgRating = usingFallback
    ? 5
    : reviews.length > 0
      ? Math.round((reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length) * 10) / 10
      : 5;
  const displayCount = usingFallback ? null : totalCount;

  return (
    <section className="py-24 bg-card/30 border-y border-border relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-highlight/3 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-highlight text-sm font-semibold tracking-wider uppercase mb-3 block">Prova Social</span>
          <h2 className="font-display text-3xl md:text-5xl font-bold text-foreground mb-4">
            O Que Nossos Clientes Dizem
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto text-lg">
            Avaliações reais de empresas que confiam na nossa qualidade
          </p>
          {/* Overall rating */}
          {displayCount !== null && displayCount > 0 && (
            <div className="flex items-center justify-center gap-2 mt-5">
              <span className="font-display font-bold text-foreground text-lg">{avgRating.toFixed(1)}</span>
              <span className="text-muted-foreground text-sm">• {displayCount} {displayCount === 1 ? 'avaliação' : 'avaliações'}</span>
            </div>
          )}
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {reviews.map((review, i) => (
            <motion.div
              key={review.id || i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              viewport={{ once: true }}
              className="p-7 rounded-2xl glass-card glass-card-hover transition-all duration-500 relative"
            >
              <Quote className="absolute top-5 right-5 w-8 h-8 text-highlight/10" />
              <p className="text-foreground/80 leading-relaxed mb-5">"{review.comment}"</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-accent flex items-center justify-center text-accent-foreground font-bold text-sm">
                  {review.name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">{review.name}</p>
                  <p className="text-muted-foreground text-xs">{review.company && `${review.company} • `}{review.city}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ReviewsSection;
