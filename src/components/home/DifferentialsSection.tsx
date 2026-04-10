import { motion } from "framer-motion";
import { Award, Heart, Zap, Layers, Headphones, BarChart3 } from "lucide-react";

const items = [
  { icon: Award, title: "Qualidade Profissional", desc: "Materiais e equipamentos de ponta para resultados impecáveis em cada projeto." },
  { icon: Heart, title: "Atendimento Humanizado", desc: "Suporte próximo e dedicado do início ao fim, pensando no melhor para sua marca." },
  { icon: Zap, title: "Agilidade na Entrega", desc: "Processos otimizados para entregas rápidas sem comprometer a qualidade." },
  { icon: Layers, title: "Variedade de Produtos", desc: "Amplo catálogo de materiais gráficos para todas as necessidades do seu negócio." },
  { icon: Headphones, title: "Suporte Especializado", desc: "Equipe técnica pronta para tirar dúvidas e orientar na melhor escolha." },
  { icon: BarChart3, title: "Acompanhamento Real-time", desc: "Acompanhe cada etapa da produção do seu pedido com status em tempo real." },
];

const DifferentialsSection = () => {
  return (
    <section className="py-24 bg-background relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-highlight/3 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-highlight text-sm font-semibold tracking-wider uppercase mb-3 block">Por que nos escolher</span>
          <h2 className="font-display text-3xl md:text-5xl font-bold text-foreground mb-4">
            Nossos Diferenciais
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto text-lg">
            Motivos para confiar na Gráfica ImPlotter para destacar sua marca
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              viewport={{ once: true }}
              className="group p-7 rounded-2xl glass-card glass-card-hover transition-all duration-500"
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-accent flex items-center justify-center mb-5 shadow-lg shadow-highlight/20 group-hover:shadow-highlight/40 transition-shadow">
                <item.icon className="w-7 h-7 text-accent-foreground" />
              </div>
              <h3 className="font-display font-bold text-foreground text-lg mb-2">{item.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default DifferentialsSection;
