import PublicLayout from "@/components/layout/PublicLayout";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, Link } from "react-router-dom";

const validatePassword = (password: string): string | null => {
  if (password.length < 8) return "Senha deve ter pelo menos 8 caracteres";
  if (!/[A-Z]/.test(password))
    return "Senha deve conter pelo menos uma letra maiúscula";
  if (!/[a-z]/.test(password))
    return "Senha deve conter pelo menos uma letra minúscula";
  if (!/[0-9]/.test(password)) return "Senha deve conter pelo menos um número";
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password))
    return "Senha deve conter pelo menos um caractere especial";
  return null;
};

const Cadastro = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const password = formData.get("password") as string;

    // Validate password strength
    const validationError = validatePassword(password);
    if (validationError) {
      setPasswordError(validationError);
      return;
    }
    setPasswordError(null);

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: formData.get("email") as string,
      password: password,
      options: {
        data: { full_name: formData.get("name") as string },
        emailRedirectTo: window.location.origin,
      },
    });
    setLoading(false);
    if (error) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Conta criada!",
        description: "Verifique seu email para confirmar.",
      });
      navigate("/login");
    }
  };

  return (
    <PublicLayout>
      <section className="py-20">
        <div className="container mx-auto px-4 max-w-md">
          <div className="bg-card rounded-xl border border-border p-8 shadow-elevated">
            <h1 className="font-display text-3xl font-bold text-foreground mb-6 text-center">
              Criar Conta
            </h1>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">
                  Nome completo
                </label>
                <Input name="name" required className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">
                  Email
                </label>
                <Input name="email" type="email" required className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">
                  Senha
                </label>
                <Input
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  className="mt-1"
                  onChange={(e) => {
                    const error = validatePassword(e.target.value);
                    setPasswordError(error);
                  }}
                />
                {passwordError && (
                  <p className="text-xs text-destructive mt-1">
                    {passwordError}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Mínimo 8 caracteres: maiúscula, minúscula, número e especial
                  (!@#$%...)
                </p>
              </div>
              <Button
                type="submit"
                variant="hero"
                size="lg"
                className="w-full"
                disabled={loading}
              >
                {loading ? "Criando..." : "Criar Conta"}
              </Button>
            </form>
            <p className="text-center text-sm text-muted-foreground mt-4">
              Já tem conta?{" "}
              <Link to="/login" className="text-highlight hover:underline">
                Entrar
              </Link>
            </p>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
};

export default Cadastro;
