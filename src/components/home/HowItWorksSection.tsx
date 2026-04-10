import { motion } from "framer-motion";
import { ShoppingCart, Paintbrush, CreditCard, Eye, Package } from "lucide-react";

const steps = [
  { icon: ShoppingCart, title: "Escolha o produto", desc: "Navegue pela loja e selecione o material ideal para sua necessidade." },
  { icon: Paintbrush, title: "Envie sua arte", desc: "Envie seu arquivo ou solicite ajuda com a criação da arte." },
  { icon: CreditCard, title: "Pague via PIX", desc: "Pagamento rápido e seguro com QR Code PIX, sem taxas." },
  { icon: Eye, title: "Acompanhe", desc: "Veja cada etapa do seu pedido em tempo real no painel." },
  { icon: Package, title: "Receba", desc: "Material entregue com qualidade profissional garantida." },
];

const HowItWorksSection = () => {
  return (
    <section className="py-24 bg-card/50 border-y border-border">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-highlight text-sm font-semibold tracking-wider uppercase mb-3 block">Processo Simples</span>
          <h2 className="font-display text-3xl md:text-5xl font-bold text-foreground mb-4">
            Como Funciona
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto text-lg">
            Do pedido à entrega em 5 passos simples e transparentes
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.12, duration: 0.5 }}
              viewport={{ once: true }}
              className="relative text-center group"
            >
              {/* Connector line */}
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-px bg-gradient-to-r from-highlight/30 to-transparent" />
              )}

              <div className="relative z-10 mb-4">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-accent flex items-center justify-center shadow-lg shadow-highlight/20 group-hover:shadow-highlight/40 transition-all group-hover:scale-110">
                  <step.icon className="w-7 h-7 text-accent-foreground" />
                </div>
                <div className="absolute -top-2 -right-2 md:right-[calc(50%-2.5rem)] w-7 h-7 rounded-full bg-background border-2 border-highlight text-highlight text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </div>
              </div>
              <h3 className="font-display font-bold text-foreground mb-1">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
