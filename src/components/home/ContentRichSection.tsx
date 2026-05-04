
import { motion } from "framer-motion";

const ContentRichSection = () => {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-3xl md:text-4xl font-display font-black text-foreground">
              Soluções Profissionais em Impressão e Comunicação Visual
            </h2>
            <div className="w-20 h-1.5 bg-primary mx-auto rounded-full" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-muted-foreground leading-relaxed">
            <div className="space-y-4">
              <p>
                Na <strong>Gráfica ImPlotter</strong>, entendemos que a comunicação visual é a alma do seu negócio. 
                Uma fachada bem sinalizada, um adesivo de vitrine atraente ou um cartão de visita elegante não são apenas 
                detalhes — são ferramentas poderosas de vendas que transmitem profissionalismo e confiança aos seus clientes.
              </p>
              <p>
                Nossa expertise em <strong>impressão digital de grande formato</strong> nos permite entregar banners 
                e lonas com cores vibrantes e alta durabilidade, ideais para eventos, promoções ou sinalização externa. 
                Utilizamos tintas eco-solventes de última geração que garantem resistência ao sol e à chuva.
              </p>
            </div>
            <div className="space-y-4">
              <p>
                Para quem busca personalização total, nossos <strong>adesivos em vinil</strong> com recorte eletrônico 
                são a escolha perfeita. Seja para rotular produtos, decorar ambientes ou personalizar frotas, 
                oferecemos acabamentos foscos ou brilhosos que elevam o padrão estético de qualquer material.
              </p>
              <p>
                Além disso, nossa linha de <strong>impressos comerciais</strong> conta com cartões de visita premium, 
                panfletos, folders e receituários. Cada projeto é tratado com rigor técnico, desde a conferência da arte 
                até o acabamento final, garantindo que o resultado impresso seja exatamente o que você idealizou.
              </p>
            </div>
          </div>

          <div className="bg-background p-8 rounded-3xl border border-border shadow-sm space-y-6">
            <h3 className="text-xl font-bold text-foreground">Por que escolher a ImPlotter?</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="space-y-2">
                <h4 className="font-bold text-primary">Tecnologia de Ponta</h4>
                <p className="text-sm">Equipamentos modernos que garantem nitidez fotográfica em cada impressão.</p>
              </div>
              <div className="space-y-2">
                <h4 className="font-bold text-primary">Agilidade na Entrega</h4>
                <p className="text-sm">Processos otimizados para que você receba seus materiais no menor tempo possível.</p>
              </div>
              <div className="space-y-2">
                <h4 className="font-bold text-primary">Suporte Técnico</h4>
                <p className="text-sm">Nossa equipe revisa seus arquivos para garantir que a impressão saia perfeita.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContentRichSection;
