import PublicLayout from "@/components/layout/PublicLayout";
import PageHero from "@/components/layout/PageHero";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório").max(100),
  phone: z.string().trim().max(20).optional(),
  email: z.string().trim().email("Email inválido").max(255),
  subject: z.string().trim().max(200).optional(),
  message: z.string().trim().min(1, "Mensagem é obrigatória").max(2000),
});

const FaleConosco = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      phone: formData.get("phone") as string,
      email: formData.get("email") as string,
      subject: formData.get("subject") as string,
      message: formData.get("message") as string,
    };

    const result = contactSchema.safeParse(data);
    if (!result.success) {
      toast({ title: "Erro", description: result.error.errors[0].message, variant: "destructive" });
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("leads").insert({
      name: data.name,
      phone: data.phone || null,
      email: data.email,
      subject: data.subject || null,
      message: data.message,
      origin: "site",
    });
    setLoading(false);

    if (error) {
      toast({ title: "Erro", description: "Não foi possível enviar. Tente novamente.", variant: "destructive" });
    } else {
      toast({ title: "Mensagem enviada!", description: "Entraremos em contato em breve." });
      (e.target as HTMLFormElement).reset();
    }
  };

  return (
    <PublicLayout>
      <PageHero 
        title="Fale Conosco" 
        badge="Canais de Atendimento"
      >
        <p className="text-white/70 max-w-lg mx-auto">Tire suas dúvidas, solicite orçamentos ou envie sugestões. Estamos prontos para te atender.</p>
      </PageHero>

      <section className="py-16 bg-background">
        <div className="container mx-auto px-4 max-w-2xl">
          
          <form onSubmit={handleSubmit} className="bg-card rounded-xl border border-border p-8 shadow-card space-y-5">
            <div>
              <label className="text-sm font-medium text-foreground">Nome *</label>
              <Input name="name" required className="mt-1" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground">Telefone</label>
                <Input name="phone" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Email *</label>
                <Input name="email" type="email" required className="mt-1" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Assunto</label>
              <Input name="subject" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Mensagem *</label>
              <Textarea name="message" required rows={5} className="mt-1" />
            </div>
            <Button type="submit" variant="hero" size="lg" disabled={loading} className="w-full">
              {loading ? "Enviando..." : "Enviar Mensagem"}
            </Button>
          </form>
        </div>
      </section>
    </PublicLayout>
  );
};

export default FaleConosco;
