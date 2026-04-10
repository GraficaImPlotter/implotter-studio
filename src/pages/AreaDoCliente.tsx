import PublicLayout from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const AreaDoCliente = () => {
  return (
    <PublicLayout>
      <section className="py-20">
        <div className="container mx-auto px-4 max-w-md">
          <div className="bg-card rounded-xl border border-border p-8 shadow-elevated text-center">
            <h1 className="font-display text-3xl font-bold text-foreground mb-4">Área do Cliente</h1>
            <p className="text-muted-foreground mb-8">Faça login para acessar seus pedidos e dados.</p>
            <div className="space-y-3">
              <Button variant="hero" size="lg" className="w-full" asChild>
                <Link to="/login">Entrar</Link>
              </Button>
              <Button variant="outline" size="lg" className="w-full" asChild>
                <Link to="/cadastro">Criar Conta</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
};

export default AreaDoCliente;
