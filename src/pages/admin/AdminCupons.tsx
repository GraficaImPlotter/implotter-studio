import { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2 } from "lucide-react";

const parseUuidList = (raw: string) =>
  raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

const AdminCupons = () => {
  const { toast } = useToast();

  // Coupons state
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  // Categories for restrictions
  const [categories, setCategories] = useState<any[]>([]);

  // Popup offers state
  const [popups, setPopups] = useState<any[]>([]);
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupEditing, setPopupEditing] = useState<any>(null);

  // Progressive discounts
  const [rules, setRules] = useState<any[]>([]);
  const [ruleOpen, setRuleOpen] = useState(false);
  const [ruleEditing, setRuleEditing] = useState<any>(null);

  const loadCoupons = async () => {
    const { data } = await supabase.from("coupons").select("*").order("created_at", { ascending: false });
    setItems(data ?? []);
  };

  const loadPopups = async () => {
    const { data } = await supabase.from("popup_offers").select("*").order("created_at", { ascending: false });
    setPopups(data ?? []);
  };

  const loadRules = async () => {
    const { data } = await supabase
      .from("progressive_discounts")
      .select("*")
      .order("created_at", { ascending: false });
    setRules(data ?? []);
  };

  const loadCategories = async () => {
    const { data } = await supabase.from("categories").select("id, name").order("name", { ascending: true });
    setCategories(data ?? []);
  };

  useEffect(() => {
    loadCoupons();
    loadPopups();
    loadRules();
    loadCategories();
  }, []);

  const editingRestrictedCategories = useMemo(() => new Set<string>(editing?.restricted_categories ?? []), [editing]);

  // Coupon submit
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    const restricted_categories = (fd.getAll("restricted_categories") as string[]).filter(Boolean);
    const restricted_products = parseUuidList((fd.get("restricted_products") as string) || "");

    const payload = {
      code: ((fd.get("code") as string) || "").toUpperCase(),
      discount_type: fd.get("discount_type") as string,
      discount_value: parseFloat(fd.get("discount_value") as string) || 0,
      min_purchase: parseFloat(fd.get("min_purchase") as string) || 0,
      max_uses: (fd.get("max_uses") as string) ? parseInt(fd.get("max_uses") as string) : null,
      is_active: fd.get("is_active") === "on",
      first_purchase_only: fd.get("first_purchase_only") === "on",
      free_shipping: fd.get("free_shipping") === "on",
      restricted_categories: restricted_categories.length ? restricted_categories : null,
      restricted_products: restricted_products.length ? restricted_products : null,
    };

    if (!payload.code || payload.code.length < 2) {
      toast({ title: "Código inválido", variant: "destructive" });
      return;
    }

    if (editing) {
      await supabase.from("coupons").update(payload).eq("id", editing.id);
    } else {
      await supabase.from("coupons").insert(payload);
    }

    toast({ title: editing ? "Cupom atualizado!" : "Cupom criado!" });
    setOpen(false);
    setEditing(null);
    loadCoupons();
  };

  const deleteCoupon = async (id: string) => {
    if (!confirm("Excluir este cupom?")) return;
    await supabase.from("coupons").delete().eq("id", id);
    toast({ title: "Cupom excluído!" });
    loadCoupons();
  };

  // Popup submit
  const handlePopupSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const isActive = fd.get("is_active") === "on";

    const payload = {
      title: fd.get("title") as string,
      description: fd.get("description") as string,
      coupon_code: ((fd.get("coupon_code") as string) || "").toUpperCase(),
      discount_label: fd.get("discount_label") as string,
      timer_minutes: parseInt(fd.get("timer_minutes") as string) || 15,
      delay_seconds: parseInt(fd.get("delay_seconds") as string) || 3,
      require_lead_capture: fd.get("require_lead_capture") === "on",
      is_active: isActive,
    };

    // If activating, deactivate others
    if (isActive) {
      await supabase
        .from("popup_offers")
        .update({ is_active: false })
        .neq("id", popupEditing?.id || "00000000-0000-0000-0000-000000000000");
    }

    if (popupEditing) {
      await supabase.from("popup_offers").update(payload).eq("id", popupEditing.id);
    } else {
      await supabase.from("popup_offers").insert(payload);
    }
    toast({ title: popupEditing ? "Pop-up atualizado!" : "Pop-up criado!" });
    setPopupOpen(false);
    setPopupEditing(null);
    loadPopups();
  };

  const deletePopup = async (id: string) => {
    if (!confirm("Excluir este pop-up?")) return;
    await supabase.from("popup_offers").delete().eq("id", id);
    toast({ title: "Pop-up excluído!" });
    loadPopups();
  };

  const handleRuleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    const payload = {
      name: (fd.get("name") as string) || "",
      discount_type: fd.get("discount_type") as string,
      discount_value: parseFloat(fd.get("discount_value") as string) || 0,
      min_quantity: (fd.get("min_quantity") as string) ? parseInt(fd.get("min_quantity") as string) : 0,
      min_value: (fd.get("min_value") as string) ? parseFloat(fd.get("min_value") as string) : 0,
      is_active: fd.get("is_active") === "on",
    };

    if (!payload.name.trim()) {
      toast({ title: "Informe um nome", variant: "destructive" });
      return;
    }

    if (ruleEditing) await supabase.from("progressive_discounts").update(payload).eq("id", ruleEditing.id);
    else await supabase.from("progressive_discounts").insert(payload);

    toast({ title: ruleEditing ? "Regra atualizada!" : "Regra criada!" });
    setRuleOpen(false);
    setRuleEditing(null);
    loadRules();
  };

  const deleteRule = async (id: string) => {
    if (!confirm("Excluir esta regra?")) return;
    await supabase.from("progressive_discounts").delete().eq("id", id);
    toast({ title: "Regra excluída!" });
    loadRules();
  };

  return (
    <AdminLayout>
      <h1 className="font-display text-3xl font-bold text-foreground mb-6">Marketing & Cupons</h1>

      <Tabs defaultValue="coupons">
        <TabsList className="mb-6">
          <TabsTrigger value="coupons">Cupons</TabsTrigger>
          <TabsTrigger value="progressive">Descontos Progressivos</TabsTrigger>
          <TabsTrigger value="popups">Pop-ups de Oferta</TabsTrigger>
        </TabsList>

        {/* === COUPONS TAB === */}
        <TabsContent value="coupons">
          <div className="flex justify-end mb-4">
            <Dialog
              open={open}
              onOpenChange={(v) => {
                setOpen(v);
                if (!v) setEditing(null);
              }}
            >
              <DialogTrigger asChild>
                <Button variant="hero">
                  <Plus className="w-4 h-4 mr-2" /> Novo Cupom
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editing ? "Editar" : "Novo"} Cupom</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Código *</label>
                    <Input name="code" defaultValue={editing?.code} required />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Tipo</label>
                      <select
                        name="discount_type"
                        defaultValue={editing?.discount_type || "percentage"}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="percentage">Percentual (%)</option>
                        <option value="fixed">Fixo (R$)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Valor *</label>
                      <Input name="discount_value" type="number" step="0.01" defaultValue={editing?.discount_value} required />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Compra Mínima</label>
                      <Input name="min_purchase" type="number" step="0.01" defaultValue={editing?.min_purchase} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Máx. Usos</label>
                      <Input name="max_uses" type="number" defaultValue={editing?.max_uses} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border border-border rounded-xl p-3">
                      <p className="text-sm font-medium text-foreground mb-2">Restringir por categorias</p>
                      <div className="max-h-40 overflow-auto space-y-1 pr-1">
                        {categories.map((cat) => (
                          <label key={cat.id} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              name="restricted_categories"
                              value={cat.id}
                              defaultChecked={editingRestrictedCategories.has(cat.id)}
                            />
                            <span className="text-foreground">{cat.name}</span>
                          </label>
                        ))}
                        {categories.length === 0 && <p className="text-xs text-muted-foreground">Sem categorias</p>}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Restringir por produtos (IDs, vírgula)</label>
                      <Textarea
                        name="restricted_products"
                        rows={4}
                        defaultValue={(editing?.restricted_products ?? []).join(", ")}
                        placeholder="uuid1, uuid2, uuid3"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Dica: copie o ID do produto no Admin de Produtos.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="first_purchase_only" defaultChecked={editing?.first_purchase_only ?? false} />
                      Apenas 1ª compra
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="free_shipping" defaultChecked={editing?.free_shipping ?? false} />
                      Frete grátis
                    </label>
                  </div>

                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="is_active" defaultChecked={editing?.is_active ?? true} /> Ativo
                  </label>

                  <Button type="submit" variant="hero" className="w-full">
                    Salvar
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="bg-card rounded-xl border border-border overflow-hidden shadow-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-medium text-muted-foreground">Código</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Desconto</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Usos</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-right p-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.id} className="border-t border-border hover:bg-muted/30">
                    <td className="p-3 font-mono font-bold text-foreground">{c.code}</td>
                    <td className="p-3 text-foreground">
                      {c.discount_type === "percentage" ? `${c.discount_value}%` : `R$ ${Number(c.discount_value).toFixed(2)}`}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {c.used_count}
                      {c.max_uses ? `/${c.max_uses}` : ""}
                    </td>
                    <td className="p-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          c.is_active ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
                        }`}
                      >
                        {c.is_active ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <Button variant="ghost" size="icon" onClick={() => { setEditing(c); setOpen(true); }}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteCoupon(c.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      Nenhum cupom
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* === PROGRESSIVE TAB === */}
        <TabsContent value="progressive">
          <div className="flex justify-end mb-4">
            <Dialog
              open={ruleOpen}
              onOpenChange={(v) => {
                setRuleOpen(v);
                if (!v) setRuleEditing(null);
              }}
            >
              <DialogTrigger asChild>
                <Button variant="hero">
                  <Plus className="w-4 h-4 mr-2" /> Nova Regra
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{ruleEditing ? "Editar" : "Nova"} regra</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleRuleSubmit} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Nome *</label>
                    <Input name="name" defaultValue={ruleEditing?.name} required />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Tipo</label>
                      <select
                        name="discount_type"
                        defaultValue={ruleEditing?.discount_type || "percentage"}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="percentage">Percentual (%)</option>
                        <option value="fixed">Fixo (R$)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Valor *</label>
                      <Input name="discount_value" type="number" step="0.01" defaultValue={ruleEditing?.discount_value} required />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Qtd mínima</label>
                      <Input name="min_quantity" type="number" defaultValue={ruleEditing?.min_quantity ?? 0} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Valor mínimo (R$)</label>
                      <Input name="min_value" type="number" step="0.01" defaultValue={ruleEditing?.min_value ?? 0} />
                    </div>
                  </div>

                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="is_active" defaultChecked={ruleEditing?.is_active ?? true} /> Ativa
                  </label>

                  <Button type="submit" variant="hero" className="w-full">
                    Salvar
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
                  <th className="text-left p-3 font-medium text-muted-foreground">Condição</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Desconto</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-right p-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((r) => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                    <td className="p-3 font-medium text-foreground">{r.name}</td>
                    <td className="p-3 text-muted-foreground">
                      min qtd: {r.min_quantity ?? 0} • min R$: {Number(r.min_value ?? 0).toFixed(2)}
                    </td>
                    <td className="p-3 text-foreground">
                      {r.discount_type === "percentage" ? `${r.discount_value}%` : `R$ ${Number(r.discount_value).toFixed(2)}`}
                    </td>
                    <td className="p-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          r.is_active ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
                        }`}
                      >
                        {r.is_active ? "Ativa" : "Inativa"}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <Button variant="ghost" size="icon" onClick={() => { setRuleEditing(r); setRuleOpen(true); }}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteRule(r.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {rules.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      Nenhuma regra
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* === POPUPS TAB === */}
        <TabsContent value="popups">
          <div className="flex justify-end mb-4">
            <Dialog
              open={popupOpen}
              onOpenChange={(v) => {
                setPopupOpen(v);
                if (!v) setPopupEditing(null);
              }}
            >
              <DialogTrigger asChild>
                <Button variant="hero">
                  <Plus className="w-4 h-4 mr-2" /> Novo Pop-up
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>{popupEditing ? "Editar" : "Novo"} Pop-up de Oferta</DialogTitle>
                </DialogHeader>
                <form onSubmit={handlePopupSubmit} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Título *</label>
                    <Input name="title" defaultValue={popupEditing?.title} required />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Descrição *</label>
                    <Textarea name="description" defaultValue={popupEditing?.description} required rows={3} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Código do Cupom *</label>
                      <Input name="coupon_code" defaultValue={popupEditing?.coupon_code} required />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Label do Desconto</label>
                      <Input name="discount_label" defaultValue={popupEditing?.discount_label || "10% OFF"} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Timer (min)</label>
                      <Input name="timer_minutes" type="number" defaultValue={popupEditing?.timer_minutes ?? 15} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Delay (seg)</label>
                      <Input name="delay_seconds" type="number" defaultValue={popupEditing?.delay_seconds ?? 3} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="require_lead_capture" defaultChecked={popupEditing?.require_lead_capture ?? false} />
                      Exigir lead (nome+email)
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="is_active" defaultChecked={popupEditing?.is_active ?? false} />
                      Ativo (apenas 1)
                    </label>
                  </div>

                  <Button type="submit" variant="hero" className="w-full">
                    Salvar
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="bg-card rounded-xl border border-border overflow-hidden shadow-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-medium text-muted-foreground">Título</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Cupom</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Timer</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-right p-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {popups.map((p) => (
                  <tr key={p.id} className="border-t border-border hover:bg-muted/30">
                    <td className="p-3 font-medium text-foreground">{p.title}</td>
                    <td className="p-3 font-mono text-foreground">{p.coupon_code}</td>
                    <td className="p-3 text-muted-foreground">
                      {p.timer_minutes}min / {p.delay_seconds}s delay
                    </td>
                    <td className="p-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          p.is_active ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
                        }`}
                      >
                        {p.is_active ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="p-3 text-right flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setPopupEditing(p); setPopupOpen(true); }}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deletePopup(p.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {popups.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      Nenhum pop-up configurado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
};

export default AdminCupons;

