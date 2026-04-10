import { useEffect, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const statusLabels: Record<string, string> = { novo: "Novo", em_atendimento: "Em Atendimento", convertido: "Convertido", perdido: "Perdido" };

const AdminLeads = () => {
  const { toast } = useToast();
  const [leads, setLeads] = useState<any[]>([]);
  const [filter, setFilter] = useState("");

  const load = async () => {
    let q = supabase.from("leads").select("*").order("created_at", { ascending: false });
    if (filter) q = q.eq("status", filter as any);
    const { data } = await q;
    setLeads(data ?? []);
  };
  useEffect(() => { load(); }, [filter]);

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("leads").update({ status: status as any, updated_at: new Date().toISOString() }).eq("id", id);
    toast({ title: "Status atualizado" }); load();
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="font-display text-3xl font-bold text-foreground">Leads</h1>
        <select value={filter} onChange={e => setFilter(e.target.value)} className="rounded-lg border border-input bg-background px-3 py-2 text-sm">
          <option value="">Todos</option>
          {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50"><tr><th className="text-left p-3 font-medium text-muted-foreground">Nome</th><th className="text-left p-3 font-medium text-muted-foreground">Email</th><th className="text-left p-3 font-medium text-muted-foreground">Telefone</th><th className="text-left p-3 font-medium text-muted-foreground">Assunto</th><th className="text-left p-3 font-medium text-muted-foreground">Status</th><th className="text-left p-3 font-medium text-muted-foreground">Data</th></tr></thead>
          <tbody>
            {leads.map(l => (
              <tr key={l.id} className="border-t border-border hover:bg-muted/30">
                <td className="p-3 font-medium text-foreground">{l.name}</td>
                <td className="p-3 text-muted-foreground">{l.email}</td>
                <td className="p-3 text-muted-foreground">{l.phone || "—"}</td>
                <td className="p-3 text-muted-foreground">{l.subject || "—"}</td>
                <td className="p-3">
                  <select value={l.status} onChange={e => updateStatus(l.id, e.target.value)} className="rounded border border-input bg-background px-2 py-1 text-xs">
                    {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </td>
                <td className="p-3 text-muted-foreground">{new Date(l.created_at).toLocaleDateString("pt-BR")}</td>
              </tr>
            ))}
            {leads.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhum lead</td></tr>}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
};

export default AdminLeads;
