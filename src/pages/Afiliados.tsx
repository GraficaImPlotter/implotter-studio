import PublicLayout from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Users, DollarSign, Link2, BarChart3 } from "lucide-react";

const Afiliados = () => {
  return (
    <PublicLayout>
      <section className="py-20 bg-gradient-hero">
        <div className="container mx-auto px-4 text-center">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-hero-foreground mb-4">
            Programa de Afiliados
          </h1>
          <p className="text-hero-muted text-lg max-w-xl mx-auto mb-8">
            Indique clientes, ganhe comissão por cada venda. Simples, transparente e lucrativo.
          </p>
          <Button variant="hero" size="lg" asChild>
            <Link to="/area-do-cliente">Quero ser afiliado</Link>
          </Button>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Link2, title: "Link Único", desc: "Receba seu link exclusivo de indicação." },
              { icon: Users, title: "Indique Clientes", desc: "Compartilhe com sua rede de contatos." },
              { icon: DollarSign, title: "Ganhe Comissão", desc: "Comissão por cada venda gerada." },
              { icon: BarChart3, title: "Acompanhe", desc: "Dashboard completo com métricas." },
            ].map((item, i) => (
              <div key={i} className="bg-card rounded-xl border border-border p-6 shadow-card text-center">
                <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-highlight/10 flex items-center justify-center">
                  <item.icon className="w-7 h-7 text-highlight" />
                </div>
                <h3 className="font-display font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
};

export default Afiliados;
