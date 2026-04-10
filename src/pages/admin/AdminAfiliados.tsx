import { useEffect, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const AdminAfiliados = () => {
  const { toast } = useToast();
  const [affiliates, setAffiliates] = useState<any[]>([]);

  const load = async () => { const { data } = await supabase.from("affiliates").select("*").order("created_at", { ascending: false }); setAffiliates(data ?? []); };
  useEffect(() => { load(); }, []);

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("affiliates").update({ status: status as any }).eq("id", id);
    toast({ title: "Status atualizado" }); load();
  };

  return (
    <AdminLayout>
      <h1 className="font-display text-3xl font-bold text-foreground mb-6">Afiliados</h1>
      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50"><tr><th className="text-left p-3 font-medium text-muted-foreground">Nome</th><th className="text-left p-3 font-medium text-muted-foreground">Email</th><th className="text-left p-3 font-medium text-muted-foreground">Código</th><th className="text-left p-3 font-medium text-muted-foreground">Vendas</th><th className="text-left p-3 font-medium text-muted-foreground">Comissão</th><th className="text-left p-3 font-medium text-muted-foreground">Status</th><th className="text-right p-3">Ações</th></tr></thead>
          <tbody>
            {affiliates.map(a => (
              <tr key={a.id} className="border-t border-border hover:bg-muted/30">
                <td className="p-3 font-medium text-foreground">{a.name}</td>
                <td className="p-3 text-muted-foreground">{a.email}</td>
                <td className="p-3 font-mono text-foreground">{a.referral_code}</td>
                <td className="p-3 text-foreground">R$ {Number(a.total_sales).toFixed(2)}</td>
                <td className="p-3 text-foreground">R$ {Number(a.total_commission).toFixed(2)}</td>
                <td className="p-3">
                  <select value={a.status} onChange={e => updateStatus(a.id, e.target.value)} className="rounded border border-input bg-background px-2 py-1 text-xs">
                    <option value="pending">Pendente</option>
                    <option value="approved">Aprovado</option>
                    <option value="blocked">Bloqueado</option>
                  </select>
                </td>
                <td className="p-3 text-right text-xs text-muted-foreground">{a.commission_percent}%</td>
              </tr>
            ))}
            {affiliates.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Nenhum afiliado</td></tr>}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
};

export default AdminAfiliados;
