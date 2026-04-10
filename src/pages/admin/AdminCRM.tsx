import { useEffect, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const stageLabels: Record<string, string> = {
  novo_contato: "Novo Contato", orcamento_enviado: "Orçamento Enviado",
  aguardando_retorno: "Aguardando Retorno", aprovado: "Aprovado",
  em_producao: "Em Produção", pos_venda: "Pós-Venda",
};

const AdminCRM = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [clients, setClients] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [stages, setStages] = useState<Record<string, string>>({});

  const load = async () => {
    const { data: profs } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    setClients(profs ?? []);
    const { data: stgs } = await supabase.from("customer_stages").select("*");
    const map: Record<string, string> = {};
    stgs?.forEach(s => { map[s.customer_id] = s.stage; });
    setStages(map);
  };
  useEffect(() => { load(); }, []);

  const loadNotes = async (clientId: string) => {
    setSelectedClient(clientId);
    const { data } = await supabase.from("crm_notes").select("*").eq("customer_id", clientId).order("created_at", { ascending: false });
    setNotes(data ?? []);
  };

  const addNote = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedClient) return;
    const fd = new FormData(e.currentTarget);
    await supabase.from("crm_notes").insert([{ customer_id: selectedClient, note: fd.get("note") as string, note_type: fd.get("note_type") as string, created_by: user?.id }]);
    toast({ title: "Nota adicionada" });
    (e.target as HTMLFormElement).reset();
    loadNotes(selectedClient);
  };

  const updateStage = async (clientId: string, stage: string) => {
    const existing = stages[clientId];
    if (existing) {
      await supabase.from("customer_stages").update({ stage: stage as any, updated_at: new Date().toISOString() }).eq("customer_id", clientId);
    } else {
      await supabase.from("customer_stages").insert([{ customer_id: clientId, stage: stage as any }]);
    }
    setStages(prev => ({ ...prev, [clientId]: stage }));
    toast({ title: "Etapa atualizada" });
  };

  return (
    <AdminLayout>
      <h1 className="font-display text-3xl font-bold text-foreground mb-6">CRM</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-card rounded-xl border border-border overflow-hidden shadow-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/50"><tr><th className="text-left p-3 font-medium text-muted-foreground">Cliente</th><th className="text-left p-3 font-medium text-muted-foreground">Email</th><th className="text-left p-3 font-medium text-muted-foreground">Etapa</th><th className="text-right p-3">Ações</th></tr></thead>
              <tbody>
                {clients.map(c => (
                  <tr key={c.id} className={`border-t border-border hover:bg-muted/30 cursor-pointer ${selectedClient === c.id ? "bg-highlight/5" : ""}`}>
                    <td className="p-3 font-medium text-foreground">{c.full_name || "Sem nome"}</td>
                    <td className="p-3 text-muted-foreground">{c.email}</td>
                    <td className="p-3">
                      <select value={stages[c.id] || "novo_contato"} onChange={e => updateStage(c.id, e.target.value)} className="rounded border border-input bg-background px-2 py-1 text-xs">
                        {Object.entries(stageLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </td>
                    <td className="p-3 text-right"><Button variant="ghost" size="sm" onClick={() => loadNotes(c.id)}>Notas</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          {selectedClient ? (
            <div className="bg-card rounded-xl border border-border p-6 shadow-card">
              <h3 className="font-display font-semibold text-foreground mb-4">Notas do Cliente</h3>
              <form onSubmit={addNote} className="space-y-3 mb-6">
                <select name="note_type" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                  <option value="general">Geral</option>
                  <option value="atendimento">Atendimento</option>
                  <option value="orcamento">Orçamento</option>
                  <option value="follow_up">Follow-up</option>
                </select>
                <Textarea name="note" placeholder="Adicionar nota..." rows={3} required />
                <Button type="submit" variant="highlight" className="w-full" size="sm">Adicionar</Button>
              </form>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {notes.map(n => (
                  <div key={n.id} className="border-l-2 border-highlight pl-3">
                    <span className="text-xs text-highlight font-medium">{n.note_type}</span>
                    <p className="text-sm text-foreground">{n.note}</p>
                    <p className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString("pt-BR")}</p>
                  </div>
                ))}
                {notes.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma nota</p>}
              </div>
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border p-6 shadow-card text-center text-muted-foreground">
              Selecione um cliente para ver notas
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminCRM;
