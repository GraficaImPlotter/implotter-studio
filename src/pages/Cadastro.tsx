import PublicLayout from "@/components/layout/PublicLayout";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, Link } from "react-router-dom";

const Cadastro = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      options: {
        data: { full_name: formData.get("name") as string },
        emailRedirectTo: window.location.origin,
      },
    });
    setLoading(false);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Conta criada!", description: "Verifique seu email para confirmar." });
      navigate("/login");
    }
  };

  return (
    <PublicLayout>
      <section className="py-20">
        <div className="container mx-auto px-4 max-w-md">
          <div className="bg-card rounded-xl border border-border p-8 shadow-elevated">
            <h1 className="font-display text-3xl font-bold text-foreground mb-6 text-center">Criar Conta</h1>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">Nome completo</label>
                <Input name="name" required className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Email</label>
                <Input name="email" type="email" required className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Senha</label>
                <Input name="password" type="password" required minLength={6} className="mt-1" />
              </div>
              <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
                {loading ? "Criando..." : "Criar Conta"}
              </Button>
            </form>
            <p className="text-center text-sm text-muted-foreground mt-4">
              Já tem conta? <Link to="/login" className="text-highlight hover:underline">Entrar</Link>
            </p>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
};

export default Cadastro;
