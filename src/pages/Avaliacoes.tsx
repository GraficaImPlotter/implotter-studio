import { useEffect, useState } from "react";
import PublicLayout from "@/components/layout/PublicLayout";
import { supabase } from "@/integrations/supabase/client";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useSearchParams } from "react-router-dom";
import PageHero from "@/components/layout/PageHero";

const Avaliacoes = () => {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const token = searchParams.get("token");

  useEffect(() => {
    supabase
      .from("reviews_public")
      .select("id, name, rating, comment, city, company, is_featured, created_at")
      .eq("is_approved", true)
      .eq("is_hidden", false)
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false })
      .then(({ data }) => { setReviews(data ?? []); setLoading(false); });
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const { error } = await supabase.from("reviews").insert([{
      name: fd.get("name") as string,
      company: fd.get("company") as string || null,
      city: fd.get("city") as string || null,
      rating: parseInt(fd.get("rating") as string) || 5,
      comment: fd.get("comment") as string,
      review_token: token || null,
    }]);
    setSubmitting(false);
    if (error) {
      toast({ title: "Erro ao enviar avaliação", variant: "destructive" });
    } else {
      toast({ title: "Avaliação enviada!", description: "Obrigado! Sua avaliação será analisada pela equipe." });
      (e.target as HTMLFormElement).reset();
    }
  };

  return (
    <PublicLayout>
      <PageHero 
        title="Avaliações de Clientes" 
        badge="Nossa Reputação"
      >
        <p className="text-white/70 max-w-lg mx-auto">Veja o que nossos clientes dizem sobre nossos serviços e a qualidade da nossa impressão.</p>
      </PageHero>

      <section className="py-16 bg-background">
        <div className="container mx-auto px-4 max-w-4xl">

          {/* Form */}
          <div className="bg-card rounded-xl border border-border p-6 shadow-card mb-10">
            <h2 className="font-display text-xl font-bold text-foreground mb-4">Deixe sua avaliação</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><label className="text-sm font-medium">Nome *</label><Input name="name" required /></div>
                <div><label className="text-sm font-medium">Empresa</label><Input name="company" /></div>
                <div><label className="text-sm font-medium">Cidade</label><Input name="city" /></div>
              </div>
              <div>
                <label className="text-sm font-medium">Nota *</label>
                <select name="rating" className="w-full mt-1 rounded-lg border border-input bg-background px-3 py-2 text-sm">
                  <option value="5">⭐⭐⭐⭐⭐ Excelente</option>
                  <option value="4">⭐⭐⭐⭐ Muito bom</option>
                  <option value="3">⭐⭐⭐ Bom</option>
                  <option value="2">⭐⭐ Regular</option>
                  <option value="1">⭐ Ruim</option>
                </select>
              </div>
              <div><label className="text-sm font-medium">Comentário *</label><Textarea name="comment" rows={3} required /></div>
              <Button type="submit" variant="hero" disabled={submitting}>{submitting ? "Enviando..." : "Enviar Avaliação"}</Button>
            </form>
          </div>

          {/* List */}
          {loading ? (
            <p className="text-muted-foreground">Carregando avaliações...</p>
          ) : reviews.length === 0 ? (
            <p className="text-muted-foreground">Nenhuma avaliação publicada ainda.</p>
          ) : (
            <div className="space-y-4">
              {reviews.map(r => (
                <div key={r.id} className="bg-card rounded-xl border border-border p-6 shadow-card">
                  <div className="flex gap-1 mb-2">
                    {Array.from({ length: r.rating }).map((_, j) => (
                      <Star key={j} className="w-4 h-4 fill-warning text-warning" />
                    ))}
                  </div>
                  <p className="text-foreground mb-3">"{r.comment}"</p>
                  <p className="text-sm text-muted-foreground">{r.name}{r.company && ` — ${r.company}`}{r.city && ` • ${r.city}`}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </PublicLayout>
  );
};

export default Avaliacoes;
