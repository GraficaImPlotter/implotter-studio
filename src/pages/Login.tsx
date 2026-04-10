import PublicLayout from "@/components/layout/PublicLayout";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, Link } from "react-router-dom";

const Login = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setLoading(true);
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: formData.get("email") as string,
      password: formData.get("password") as string,
    });
    
    if (error) {
      setLoading(false);
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }

    // Check if user is admin to redirect accordingly
    const userId = authData.user?.id;
    if (userId) {
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();

      setLoading(false);
      if (roleData) {
        navigate("/admin", { replace: true });
      } else {
        navigate("/minha-conta", { replace: true });
      }
    } else {
      setLoading(false);
      navigate("/minha-conta", { replace: true });
    }
  };

  return (
    <PublicLayout>
      <section className="py-20">
        <div className="container mx-auto px-4 max-w-md">
          <div className="bg-card rounded-xl border border-border p-8 shadow-elevated">
            <h1 className="font-display text-3xl font-bold text-foreground mb-6 text-center">Entrar</h1>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">Email</label>
                <Input name="email" type="email" required className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Senha</label>
                <Input name="password" type="password" required className="mt-1" />
              </div>
              <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
                {loading ? "Entrando..." : "Entrar"}
              </Button>
            </form>
            <p className="text-center text-sm text-muted-foreground mt-4">
              Não tem conta? <Link to="/cadastro" className="text-highlight hover:underline">Criar conta</Link>
            </p>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
};

export default Login;
