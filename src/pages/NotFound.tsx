import PublicLayout from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <PublicLayout>
      <section className="py-32 text-center">
        <div className="container mx-auto px-4">
          <h1 className="font-display text-8xl font-bold text-gradient-accent mb-4">404</h1>
          <h2 className="font-display text-2xl font-bold text-foreground mb-4">Página não encontrada</h2>
          <p className="text-muted-foreground mb-8">A página que você procura não existe ou foi movida.</p>
          <Button variant="hero" size="lg" asChild>
            <Link to="/">Voltar à Home</Link>
          </Button>
        </div>
      </section>
    </PublicLayout>
  );
};

export default NotFound;
