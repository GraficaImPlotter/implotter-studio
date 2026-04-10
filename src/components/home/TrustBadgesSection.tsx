import { motion } from "framer-motion";
import { Shield, Clock, Award, Truck, CreditCard, Headphones } from "lucide-react";

const badges = [
  { icon: Shield, title: "Compra 100% Segura", desc: "Seus dados protegidos com criptografia" },
  { icon: Clock, title: "Prazo Garantido", desc: "Entregamos dentro do prazo combinado" },
  { icon: Award, title: "Qualidade Premium", desc: "Materiais de primeira linha" },
  { icon: Truck, title: "Entrega Cuidadosa", desc: "Embalagem especial para proteção" },
  { icon: CreditCard, title: "PIX sem Taxas", desc: "Pagamento rápido e sem custo extra" },
  { icon: Headphones, title: "Suporte Dedicado", desc: "Atendimento personalizado" },
];

const TrustBadgesSection = () => {
  return (
    <section className="py-16 bg-card/30 border-y border-border">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {badges.map((badge, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.4 }}
              viewport={{ once: true }}
              className="text-center group"
            >
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-highlight/10 flex items-center justify-center group-hover:bg-highlight/20 transition-colors">
                <badge.icon className="w-6 h-6 text-highlight" />
              </div>
              <h3 className="font-display font-bold text-foreground text-sm mb-0.5">{badge.title}</h3>
              <p className="text-xs text-muted-foreground">{badge.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrustBadgesSection;
