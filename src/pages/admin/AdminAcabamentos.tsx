import { useEffect, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";

const AdminAcabamentos = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [pricingMode, setPricingMode] = useState<"fixed" | "per_unit">("fixed");
  const [groupName, setGroupName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("finishings").select("*").order("sort_order");
    setItems(data ?? []);
  };

  useEffect(() => { load(); }, []);

  const openForm = (item?: any) => {
    setEditing(item || null);
    setName(item?.name || "");
    setPrice(item?.price?.toString() || "0");
    setPricingMode(item?.pricing_mode || "fixed");
    setGroupName(item?.group_name || "");
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    const payload = { 
      name, 
      price: parseFloat(price) || 0, 
      pricing_mode: pricingMode,
      group_name: groupName || null
    };

    if (editing) {
      await supabase.from("finishings").update(payload).eq("id", editing.id);
      toast({ title: "Acabamento atualizado!" });
    } else {
      await supabase.from("finishings").insert({ ...payload, is_active: true, sort_order: items.length });
      toast({ title: "Acabamento criado!" });
    }
    setOpen(false);
    setEditing(null);
    setSubmitting(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir acabamento?")) return;
    await supabase.from("finishings").delete().eq("id", id);
    toast({ title: "Acabamento excluído" });
    load();
  };

  const toggleActive = async (item: any) => {
    await supabase.from("finishings").update({ is_active: !item.is_active }).eq("id", item.id);
    load();
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="font-display text-3xl font-bold text-foreground">Acabamentos</h1>
        <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button variant="hero" onClick={() => openForm()}><Plus className="w-4 h-4 mr-2" /> Novo Acabamento</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Editar Acabamento" : "Novo Acabamento"}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Nome *</label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Ilhós, Batente, Corte reto" required />
              </div>
              <div>
                <label className="text-sm font-medium">Modo de cobrança</label>
                <select value={pricingMode} onChange={e => setPricingMode(e.target.value as "fixed" | "per_unit")} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                  <option value="fixed">Preço fixo (cobra uma vez)</option>
                  <option value="per_unit">Por unidade (cliente informa quantidade)</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">{pricingMode === "per_unit" ? "Preço por unidade (R$)" : "Preço adicional (R$)"}</label>
                <Input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" />
              </div>
              <div>
                <label className="text-sm font-medium">Grupo (Opcional)</label>
                <Input value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="Ex: Orientação, Cor, etc." />
                <p className="text-[10px] text-muted-foreground mt-1">Acabamentos no mesmo grupo tornam-se seleção única para o cliente.</p>
              </div>
              <Button type="submit" variant="hero" className="w-full" disabled={submitting}>
                {submitting ? "Salvando..." : editing ? "Salvar" : "Criar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 font-medium text-muted-foreground">Nome</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Grupo</th>
              <th className="text-left p-3 font-medium text-muted-foreground w-[120px]">Modo</th>
              <th className="text-right p-3 font-medium text-muted-foreground w-[120px]">Preço</th>
              <th className="text-center p-3 font-medium text-muted-foreground w-[80px]">Status</th>
              <th className="text-right p-3 font-medium text-muted-foreground w-[100px]">Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Nenhum acabamento cadastrado</td></tr>
            )}
            {items.map(item => (
              <tr key={item.id} className="border-t border-border hover:bg-muted/30">
                <td className="p-3 font-medium text-foreground">{item.name}</td>
                <td className="p-3 text-left">
                  {item.group_name ? (
                    <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase italic tracking-tighter">{item.group_name}</span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground italic">-</span>
                  )}
                </td>
                <td className="p-3 text-left text-muted-foreground text-xs">{item.pricing_mode === "per_unit" ? "Por unidade" : "Fixo"}</td>
                <td className="p-3 text-right text-foreground">R$ {Number(item.price).toFixed(2)}{item.pricing_mode === "per_unit" ? "/un" : ""}</td>
                <td className="p-3 text-center">
                  <button onClick={() => toggleActive(item)} className={`text-xs px-2 py-0.5 rounded-full cursor-pointer ${item.is_active ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"}`}>
                    {item.is_active ? "Ativo" : "Inativo"}
                  </button>
                </td>
                <td className="p-3 text-right">
                  <Button variant="ghost" size="icon" onClick={() => openForm(item)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}><Trash2 className="w-4 h-4" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
};

export default AdminAcabamentos;
