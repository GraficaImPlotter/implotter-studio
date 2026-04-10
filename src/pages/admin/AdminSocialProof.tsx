import { useState, useEffect } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2, Edit2, Save, X, MessageSquareMore } from "lucide-react";

interface SocialProofMsg {
  id: string;
  customer_name: string;
  city: string | null;
  message: string;
  is_active: boolean;
  sort_order: number;
}

const AdminSocialProof = () => {
  const [messages, setMessages] = useState<SocialProofMsg[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ customer_name: "", city: "", message: "acabou de fazer um pedido" });

  const load = async () => {
    const { data } = await supabase
      .from("social_proof_messages")
      .select("*")
      .order("sort_order", { ascending: true });
    setMessages((data as SocialProofMsg[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!form.customer_name.trim()) {
      toast.error("Nome do cliente é obrigatório");
      return;
    }

    if (editingId) {
      const { error } = await supabase
        .from("social_proof_messages")
        .update({
          customer_name: form.customer_name,
          city: form.city || null,
          message: form.message,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingId);
      if (error) { toast.error("Erro ao salvar"); return; }
      toast.success("Mensagem atualizada");
    } else {
      const { error } = await supabase
        .from("social_proof_messages")
        .insert({
          customer_name: form.customer_name,
          city: form.city || null,
          message: form.message,
          sort_order: messages.length,
        });
      if (error) { toast.error("Erro ao criar"); return; }
      toast.success("Mensagem criada");
    }

    setEditingId(null);
    setForm({ customer_name: "", city: "", message: "acabou de fazer um pedido" });
    load();
  };

  const handleEdit = (msg: SocialProofMsg) => {
    setEditingId(msg.id);
    setForm({ customer_name: msg.customer_name, city: msg.city || "", message: msg.message });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta mensagem?")) return;
    await supabase.from("social_proof_messages").delete().eq("id", id);
    toast.success("Excluída");
    load();
  };

  const handleToggle = async (id: string, active: boolean) => {
    await supabase.from("social_proof_messages").update({ is_active: active }).eq("id", id);
    load();
  };

  return (
    <AdminLayout>
      <div className="max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
              <MessageSquareMore className="w-6 h-6 text-highlight" />
              Prova Social (Popups)
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Gerencie as notificações de compras exibidas para visitantes
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-6">
          <h2 className="font-semibold text-foreground mb-4">
            {editingId ? "Editar Mensagem" : "Nova Mensagem"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder="Nome do cliente (ex: João S.)"
              value={form.customer_name}
              onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
            />
            <Input
              placeholder="Cidade (opcional)"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
            <Input
              placeholder="Mensagem"
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
            />
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={handleSave} className="gap-2">
              {editingId ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {editingId ? "Salvar" : "Adicionar"}
            </Button>
            {editingId && (
              <Button
                variant="ghost"
                onClick={() => {
                  setEditingId(null);
                  setForm({ customer_name: "", city: "", message: "acabou de fazer um pedido" });
                }}
              >
                <X className="w-4 h-4 mr-1" /> Cancelar
              </Button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : messages.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Nenhuma mensagem cadastrada. Adicione acima.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {messages.map((msg) => (
                <div key={msg.id} className="flex items-center gap-4 p-4 hover:bg-secondary/30 transition">
                  <Switch
                    checked={msg.is_active}
                    onCheckedChange={(v) => handleToggle(msg.id, v)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      {msg.customer_name}
                      {msg.city && <span className="font-normal text-muted-foreground"> de {msg.city}</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">{msg.message}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(msg)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(msg.id)} className="text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminSocialProof;
