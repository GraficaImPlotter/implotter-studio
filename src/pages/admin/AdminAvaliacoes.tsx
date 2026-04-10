import { useEffect, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Star, Check, EyeOff, Eye, Sparkles, MessageSquare } from "lucide-react";

const AdminAvaliacoes = () => {
  const [reviews, setReviews] = useState<any[]>([]);
  const [filter, setFilter] = useState("pending");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    let q = supabase.from("reviews").select("*").order("created_at", { ascending: false });
    if (filter === "pending") q = q.eq("is_approved", false).eq("is_hidden", false);
    else if (filter === "approved") q = q.eq("is_approved", true).eq("is_hidden", false);
    else if (filter === "hidden") q = q.eq("is_hidden", true);
    const { data } = await q;
    setReviews(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  const update = async (id: string, fields: Record<string, any>, msg: string) => {
    const { error } = await supabase.from("reviews").update(fields).eq("id", id);
    if (error) { toast.error("Erro ao atualizar"); return; }
    toast.success(msg);
    load();
  };

  return (
    <AdminLayout>
      <div className="max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-highlight" />
              Avaliações
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Gerencie as avaliações dos clientes
            </p>
          </div>
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="pending">Pendentes</option>
            <option value="approved">Aprovadas</option>
            <option value="hidden">Ocultas</option>
            <option value="all">Todas</option>
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center text-muted-foreground py-12 bg-card border border-border rounded-2xl">
            Nenhuma avaliação nesta categoria.
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map(r => (
              <div key={r.id} className="bg-card border border-border rounded-2xl p-5 hover:shadow-card transition">
                {/* Header: stars + badges */}
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Star key={j} className={`w-4 h-4 ${j < r.rating ? "fill-warning text-warning" : "text-muted-foreground/30"}`} />
                    ))}
                  </div>
                  {r.is_approved && <Badge variant="outline" className="text-success border-success/30 bg-success/10 text-xs">Aprovada</Badge>}
                  {!r.is_approved && !r.is_hidden && <Badge variant="outline" className="text-warning border-warning/30 bg-warning/10 text-xs">Pendente</Badge>}
                  {r.is_hidden && <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/10 text-xs">Oculta</Badge>}
                  {r.is_featured && <Badge variant="outline" className="text-highlight border-highlight/30 bg-highlight/10 text-xs gap-1"><Sparkles className="w-3 h-3" />Destaque</Badge>}
                </div>

                {/* Comment */}
                <p className="text-foreground/90 leading-relaxed mb-3">"{r.comment}"</p>

                {/* Author info */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                    {r.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{r.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.company && `${r.company} • `}{r.city && `${r.city} • `}{new Date(r.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 flex-wrap border-t border-border pt-3">
                  {!r.is_approved && !r.is_hidden && (
                    <Button size="sm" onClick={() => update(r.id, { is_approved: true }, "Avaliação aprovada!")} className="gap-1.5">
                      <Check className="w-4 h-4" /> Aprovar
                    </Button>
                  )}

                  {/* Featured toggle */}
                  {r.is_approved && !r.is_hidden && (
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={r.is_featured}
                        onCheckedChange={(v) => update(r.id, { is_featured: v }, v ? "Avaliação destacada!" : "Destaque removido")}
                      />
                      <span className="text-sm text-muted-foreground">Destaque</span>
                    </div>
                  )}

                  {/* Visibility toggle */}
                  {r.is_approved && (
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={!r.is_hidden}
                        onCheckedChange={(v) => update(r.id, { is_hidden: !v }, v ? "Avaliação visível" : "Avaliação ocultada")}
                      />
                      <span className="text-sm text-muted-foreground">Visível</span>
                    </div>
                  )}

                  {!r.is_approved && !r.is_hidden && (
                    <Button variant="ghost" size="sm" onClick={() => update(r.id, { is_hidden: true }, "Avaliação ocultada")} className="gap-1.5 text-destructive">
                      <EyeOff className="w-4 h-4" /> Ocultar
                    </Button>
                  )}

                  {r.is_hidden && (
                    <Button variant="outline" size="sm" onClick={() => update(r.id, { is_hidden: false }, "Avaliação restaurada")} className="gap-1.5">
                      <Eye className="w-4 h-4" /> Restaurar
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminAvaliacoes;
