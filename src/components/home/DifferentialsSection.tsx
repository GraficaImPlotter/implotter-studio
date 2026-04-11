import { motion } from "framer-motion";
import { Award, Zap, MessageCircle, Image, MapPin, Headphones } from "lucide-react";

const items = [
  { icon: Award, title: "Alta Qualidade", desc: "Impressão de alta definição com cores vibrantes e acabamento profissional em todos os materiais." },
  { icon: Zap, title: "Entrega Rápida", desc: "Produção otimizada para que seu material chegue no menor tempo possível, sem atrasos." },
  { icon: MessageCircle, title: "Atendimento WhatsApp", desc: "Suporte direto via WhatsApp para tirar dúvidas e acompanhar seu pedido em tempo real." },
  { icon: Image, title: "Arte Facilitada", desc: "Auxiliamos na verificação e fechamento correto dos seus arquivos para uma impressão perfeita." },
  { icon: MapPin, title: "Produção Local", desc: "Tecnologia de ponta em nossa unidade própria, garantindo controle total sobre cada etapa." },
  { icon: Headphones, title: "Suporte Personalizado", desc: "Uma equipe de especialistas pronta para sugerir as melhores soluções para o seu negócio." },
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
          <h2 className="font-display text-3xl md:text-5xl font-black text-[#111827] mb-6 tracking-tighter leading-tight">
            Por que escolher a <span className="text-secondary text-gradient-primary">ImPlotter</span>?
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto text-lg font-medium">
            Combinamos tecnologia de última geração com atendimento humanizado para entregar o melhor resultado para sua marca.
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
              <div className="w-16 h-16 rounded-[1.25rem] bg-secondary flex items-center justify-center mb-6 shadow-xl shadow-secondary/20 group-hover:rotate-6 transition-transform duration-500">
                <item.icon className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-display font-black text-[#111827] text-xl mb-3 tracking-tight group-hover:text-secondary transition-colors">{item.title}</h3>
              <p className="text-gray-500 font-medium leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default DifferentialsSection;
