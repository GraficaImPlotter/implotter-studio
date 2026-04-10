import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import PublicLayout from "@/components/layout/PublicLayout";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart, User, LogOut, Eye, Package, Clock, CheckCircle, KeyRound, Receipt, FileText, Upload, RefreshCw, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { useCart } from "@/hooks/use-cart";
import LoyaltyWidget from "@/components/LoyaltyWidget";
import { formatCpfCnpj, formatPhone } from "@/lib/utils";
import { validateDocumentFile } from "@/lib/file-validation";

const statusLabels: Record<string, string> = {
  pedido_recebido: "Pedido Recebido", aguardando_pagamento: "Aguardando Pagamento",
  pagamento_confirmado: "Pagamento Confirmado", em_analise: "Em Análise",
  aguardando_arte: "Aguardando Arte", arte_em_conferencia: "Arte em Conferência",
  aprovado_producao: "Aprovado p/ Produção", em_producao: "Em Produção",
  em_acabamento: "Em Acabamento", pronto_envio: "Pronto p/ Envio",
  finalizado: "Finalizado", cancelado: "Cancelado",
};

const statusColors: Record<string, string> = {
  aguardando_pagamento: "bg-warning/10 text-warning border-warning/20",
  pagamento_confirmado: "bg-success/10 text-success border-success/20",
  em_producao: "bg-highlight/10 text-highlight border-highlight/20",
  finalizado: "bg-success/10 text-success border-success/20",
  cancelado: "bg-destructive/10 text-destructive border-destructive/20",
};

const MinhaConta = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { addItem } = useCart();
  const [tab, setTab] = useState("pedidos");
  const [profile, setProfile] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [orderHistory, setOrderHistory] = useState<any[]>([]);
  const pixInputRef = useRef<HTMLInputElement>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const [address, setAddress] = useState({
    zip: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: ""
  });

  useEffect(() => {
    if (profile) {
      setAddress({
        zip: profile.address_zip || "",
        street: profile.address_street || "",
        number: profile.address_number || "",
        complement: profile.address_complement || "",
        neighborhood: profile.address_neighborhood || "",
        city: profile.address_city || "",
        state: profile.address_state || "",
      });
    }
  }, [profile]);

  const handleZipChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, "");
    if (val.length > 8) val = val.slice(0, 8);
    let formatted = val;
    if (val.length > 5) {
      formatted = val.replace(/^(\d{5})(\d)/, "$1-$2");
    }
    setAddress(prev => ({ ...prev, zip: formatted }));

    if (val.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${val}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setAddress(prev => ({
            ...prev,
            street: data.logradouro || prev.street,
            neighborhood: data.bairro || prev.neighborhood,
            city: data.localidade || prev.city,
            state: data.uf || prev.state,
          }));
          toast({ title: "Endereço preenchido automaticamente!" });
        }
      } catch (err) {
        console.error("Erro ao buscar CEP:", err);
      }
    }
  };

  const reorderItems = async (orderId: string) => {
    const { data: items } = await supabase.from("order_items").select("*").eq("order_id", orderId);
    if (!items || items.length === 0) {
      toast({ title: "Nenhum item encontrado neste pedido", variant: "destructive" });
      return;
    }
    items.forEach((item) => {
      addItem({
        productId: item.product_id || "",
        name: item.product_name,
        price: Number(item.unit_price),
        quantity: item.quantity,
        pricingType: (item.pricing_type as any) || "fixed",
        itemWidth: item.item_width ? Number(item.item_width) : undefined,
        itemHeight: item.item_height ? Number(item.item_height) : undefined,
        itemArea: item.item_area ? Number(item.item_area) : undefined,
        pricePerSqm: item.price_per_sqm ? Number(item.price_per_sqm) : undefined,
      });
    });
    toast({ title: `${items.length} itens adicionados ao carrinho!` });
    navigate("/carrinho");
  };

  const uploadPixReceipt = async (orderId: string, file: File) => {
    // ESC-002: Validate file before upload
    const validation = validateDocumentFile(file);
    if (!validation.valid) {
      toast({ title: "Arquivo inválido", description: validation.error, variant: "destructive" });
      return;
    }

    setUploadingDoc(true);
    try {
      const ext = file.name.split('.').pop();
      const filePath = `orders/${orderId}/pix_receipt_${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(filePath);
      const { error: updateError } = await supabase.from("orders").update({ pix_receipt_url: publicUrl }).eq("id", orderId);
      if (updateError) throw updateError;

      setSelectedOrder((prev: any) => prev ? { ...prev, pix_receipt_url: publicUrl } : prev);
      setOrders(orders.map(o => o.id === orderId ? { ...o, pix_receipt_url: publicUrl } : o));
      toast({ title: "Comprovante enviado com sucesso!" });
    } catch (err: any) {
      toast({ title: "Erro ao enviar arquivo", description: err.message, variant: "destructive" });
    } finally {
      setUploadingDoc(false);
    }
  };

  useEffect(() => {
    if (!loading && !user) navigate("/login", { replace: true });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => setProfile(data));
    supabase.from("orders").select("*").eq("customer_id", user.id).order("created_at", { ascending: false }).then(({ data }) => setOrders(data ?? []));
  }, [user]);

  const openOrder = async (order: any) => {
    setSelectedOrder(order);
    const [{ data: items }, { data: hist }] = await Promise.all([
      supabase.from("order_items").select("*").eq("order_id", order.id),
      supabase.from("order_status_history").select("*").eq("order_id", order.id).order("created_at", { ascending: false }),
    ]);
    setOrderItems(items ?? []);
    setOrderHistory(hist ?? []);
  };

  const [passwordData, setPasswordData] = useState({ current: "", newPass: "", confirm: "" });
  const [savingPassword, setSavingPassword] = useState(false);

  const saveProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await supabase.from("profiles").update({
      full_name: fd.get("full_name") as string,
      phone: fd.get("phone") as string,
      cpf_cnpj: fd.get("cpf_cnpj") as string,
      address_zip: fd.get("address_zip") as string,
      address_street: fd.get("address_street") as string,
      address_number: fd.get("address_number") as string,
      address_complement: fd.get("address_complement") as string,
      address_neighborhood: fd.get("address_neighborhood") as string,
      address_city: fd.get("address_city") as string,
      address_state: fd.get("address_state") as string,
    }).eq("id", user!.id);
    toast({ title: "Perfil atualizado!" });
  };

  const changePassword = async () => {
    if (!passwordData.newPass || passwordData.newPass.length < 6) {
      toast({ title: "A nova senha deve ter pelo menos 6 caracteres", variant: "destructive" });
      return;
    }
    if (passwordData.newPass !== passwordData.confirm) {
      toast({ title: "As senhas não coincidem", variant: "destructive" });
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: passwordData.newPass });
    setSavingPassword(false);
    if (error) {
      toast({ title: "Erro ao alterar senha", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Senha alterada com sucesso!" });
      setPasswordData({ current: "", newPass: "", confirm: "" });
    }
  };

  if (loading) {
    return (
      <PublicLayout>
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-2 border-highlight border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </PublicLayout>
    );
  }

  if (!user) {
    return <PublicLayout><div className="py-20 text-center text-muted-foreground">Redirecionando...</div></PublicLayout>;
  }

  return (
    <PublicLayout>
      <section className="py-8">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground">
                Minha <span className="text-gradient-accent">Conta</span>
              </h1>
              <p className="text-muted-foreground text-sm mt-1">Olá, {profile?.full_name || "visitante"}! Gerencie seus pedidos e dados.</p>
            </div>
            <Button variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => { signOut(); navigate("/"); }}>
              <LogOut className="w-4 h-4 text-destructive" /> Sair
            </Button>
          </div>

          {/* Stats cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="glass-card rounded-2xl p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-highlight/10 flex items-center justify-center">
                <Package className="w-6 h-6 text-highlight" />
              </div>
              <div>
                <p className="font-display font-bold text-2xl text-foreground">{orders.length}</p>
                <p className="text-xs text-muted-foreground">Total de pedidos</p>
              </div>
            </div>
            <div className="glass-card rounded-2xl p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-warning" />
              </div>
              <div>
                <p className="font-display font-bold text-2xl text-foreground">{orders.filter(o => !["finalizado", "cancelado"].includes(o.status)).length}</p>
                <p className="text-xs text-muted-foreground">Em andamento</p>
              </div>
            </div>
            <div className="glass-card rounded-2xl p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="font-display font-bold text-2xl text-foreground">{orders.filter(o => o.status === "finalizado").length}</p>
                <p className="text-xs text-muted-foreground">Finalizados</p>
              </div>
            </div>
          </div>

          <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
            <Button
              variant={tab === "pedidos" ? "highlight" : "secondary"}
              onClick={() => setTab("pedidos")}
              className="rounded-xl flex-shrink-0 text-sm"
            >
              <ShoppingCart className="w-4 h-4" /> Pedidos
            </Button>
            <Button
              variant={tab === "fidelidade" ? "highlight" : "secondary"}
              onClick={() => setTab("fidelidade")}
              className="rounded-xl flex-shrink-0 text-sm"
            >
              ⭐ Fidelidade
            </Button>
            <Button
              variant={tab === "perfil" ? "highlight" : "secondary"}
              onClick={() => setTab("perfil")}
              className="rounded-xl flex-shrink-0 text-sm"
            >
              <User className="w-4 h-4" /> Perfil
            </Button>
          </div>

          {tab === "fidelidade" && (
            <LoyaltyWidget />
          )}

          {tab === "pedidos" && (
            <div className="space-y-3">
              {orders.length === 0 ? (
                <div className="glass-card rounded-2xl p-12 text-center">
                  <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground mb-4">Você ainda não fez nenhum pedido</p>
                  <Button variant="hero" asChild><a href="/loja">Explorar Produtos</a></Button>
                </div>
              ) : (
                orders.map((o, i) => (
                  <motion.div
                    key={o.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="glass-card glass-card-hover rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer"
                    onClick={() => openOrder(o)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                        <Package className="w-5 h-5 text-highlight" />
                      </div>
                      <div>
                        <p className="font-display font-bold text-foreground">Pedido #{o.order_number}</p>
                        <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString("pt-BR")}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 sm:gap-4 justify-end mt-2 sm:mt-0 w-full sm:w-auto">
                      <span className={`text-xs px-3 py-1.5 rounded-full font-semibold border ${statusColors[o.status] || "bg-highlight/10 text-highlight border-highlight/20"}`}>
                        {statusLabels[o.status] || o.status}
                      </span>
                      <span className="font-display font-bold text-foreground mx-1">R$ {Number(o.total).toFixed(2)}</span>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="text-xs shrink-0 bg-secondary/80 hover:bg-secondary border border-border/50"
                        onClick={(e) => { e.stopPropagation(); reorderItems(o.id); }}
                      >
                        <RefreshCw className="w-3 h-3" /> Repetir
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0 text-xs px-2 sm:px-3 text-muted-foreground hover:text-foreground"
                      >
                        <Eye className="w-4 h-4 shrink-0 sm:mr-1" />
                        <span className="hidden sm:inline">Detalhes</span>
                      </Button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          )}

          {tab === "perfil" && profile && (
            <div className="space-y-6">
              <form onSubmit={saveProfile} className="glass-card rounded-2xl p-5 sm:p-8 space-y-5">
                <h2 className="font-display font-bold text-foreground text-lg">Dados Pessoais</h2>
                <div><label className="text-sm font-semibold text-foreground mb-1 block">Nome completo</label><Input name="full_name" defaultValue={profile.full_name} className="bg-secondary border-border" /></div>
                <div><label className="text-sm font-semibold text-foreground mb-1 block">Email</label><Input value={profile.email || user.email} disabled className="bg-secondary/50 border-border" /></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className="text-sm font-semibold text-foreground mb-1 block">Telefone</label><Input name="phone" defaultValue={formatPhone(profile.phone || "")} onChange={e => e.target.value = formatPhone(e.target.value)} className="bg-secondary border-border" /></div>
                  <div><label className="text-sm font-semibold text-foreground mb-1 block">CPF/CNPJ</label><Input name="cpf_cnpj" defaultValue={formatCpfCnpj(profile.cpf_cnpj || "")} onChange={e => e.target.value = formatCpfCnpj(e.target.value)} className="bg-secondary border-border" /></div>
                </div>

                <h2 className="font-display font-bold text-foreground text-lg pt-2">Endereço</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div><label className="text-sm font-semibold text-foreground mb-1 block">CEP</label><Input name="address_zip" value={address.zip} onChange={handleZipChange} className="bg-secondary border-border" maxLength={9} /></div>
                  <div className="sm:col-span-2"><label className="text-sm font-semibold text-foreground mb-1 block">Rua</label><Input name="address_street" value={address.street} onChange={e => setAddress(p => ({...p, street: e.target.value}))} className="bg-secondary border-border" /></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div><label className="text-sm font-semibold text-foreground mb-1 block">Número</label><Input name="address_number" value={address.number} onChange={e => setAddress(p => ({...p, number: e.target.value}))} className="bg-secondary border-border" /></div>
                  <div><label className="text-sm font-semibold text-foreground mb-1 block">Complemento</label><Input name="address_complement" value={address.complement} onChange={e => setAddress(p => ({...p, complement: e.target.value}))} className="bg-secondary border-border" /></div>
                  <div><label className="text-sm font-semibold text-foreground mb-1 block">Bairro</label><Input name="address_neighborhood" value={address.neighborhood} onChange={e => setAddress(p => ({...p, neighborhood: e.target.value}))} className="bg-secondary border-border" /></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className="text-sm font-semibold text-foreground mb-1 block">Cidade</label><Input name="address_city" value={address.city} onChange={e => setAddress(p => ({...p, city: e.target.value}))} className="bg-secondary border-border" /></div>
                  <div><label className="text-sm font-semibold text-foreground mb-1 block">Estado</label><Input name="address_state" value={address.state} onChange={e => setAddress(p => ({...p, state: e.target.value}))} className="bg-secondary border-border" /></div>
                </div>
                <Button type="submit" variant="hero" size="lg" className="w-full sm:w-auto">Salvar Alterações</Button>
              </form>

              <div className="glass-card rounded-2xl p-5 sm:p-8 space-y-5">
                <h2 className="font-display font-bold text-foreground text-lg flex items-center gap-2"><KeyRound className="w-5 h-5 text-highlight" /> Alterar Senha</h2>
                <div><label className="text-sm font-semibold text-foreground mb-1 block">Nova senha</label><Input type="password" value={passwordData.newPass} onChange={e => setPasswordData(p => ({ ...p, newPass: e.target.value }))} className="bg-secondary border-border" placeholder="Mínimo 6 caracteres" /></div>
                <div><label className="text-sm font-semibold text-foreground mb-1 block">Confirmar nova senha</label><Input type="password" value={passwordData.confirm} onChange={e => setPasswordData(p => ({ ...p, confirm: e.target.value }))} className="bg-secondary border-border" /></div>
                <Button type="button" variant="hero" size="lg" onClick={changePassword} disabled={savingPassword} className="w-full sm:w-auto">
                  {savingPassword ? "Alterando..." : "Alterar Senha"}
                </Button>
              </div>
            </div>
          )}

          <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto glass-card border-border">
              <DialogHeader><DialogTitle className="font-display text-xl">Pedido #{selectedOrder?.order_number}</DialogTitle></DialogHeader>
              {selectedOrder && (
                <div className="space-y-6">
                  <div className="text-center">
                    <span className={`inline-block text-sm px-4 py-2 rounded-full font-semibold border ${statusColors[selectedOrder.status] || "bg-highlight/10 text-highlight border-highlight/20"}`}>
                      {statusLabels[selectedOrder.status] || selectedOrder.status}
                    </span>
                    <p className="text-3xl font-display font-bold text-foreground mt-3">R$ {Number(selectedOrder.total).toFixed(2)}</p>
                  </div>

                  <div>
                    <h3 className="font-display font-bold text-foreground mb-3">Itens do Pedido</h3>
                    <div className="space-y-2">
                      {orderItems.map(it => (
                        <div key={it.id} className="flex justify-between text-sm py-2 border-b border-border">
                          <span className="text-foreground">{it.product_name} <span className="text-muted-foreground">x{it.quantity}</span></span>
                          <span className="font-medium text-foreground">R$ {Number(it.subtotal).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-display font-bold text-foreground mb-3">Documentos</h3>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input type="file" ref={pixInputRef} className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file && selectedOrder) uploadPixReceipt(selectedOrder.id, file);
                        e.target.value = "";
                      }} />
                      
                      {selectedOrder.pix_receipt_url ? (
                        <Button variant="secondary" asChild className="justify-start">
                          <a href={selectedOrder.pix_receipt_url} target="_blank" rel="noreferrer">
                            <Receipt className="w-4 h-4 mr-2" /> Ver Comprovante PIX
                          </a>
                        </Button>
                      ) : selectedOrder.payment_method === 'pix' && selectedOrder.status === 'aguardando_pagamento' ? (
                        <Button variant="highlight" className="justify-start" onClick={() => pixInputRef.current?.click()} disabled={uploadingDoc}>
                          <Upload className="w-4 h-4 mr-2" /> {uploadingDoc ? "Enviando..." : "Anexar Comprovante PIX"}
                        </Button>
                      ) : (
                        <Button variant="secondary" disabled className="justify-start disabled:opacity-30">
                          <Receipt className="w-4 h-4 mr-2" /> PIX Pendente
                        </Button>
                      )}

                      {selectedOrder.invoice_url ? (
                        <Button variant="secondary" asChild className="justify-start">
                          <a href={selectedOrder.invoice_url} target="_blank" rel="noreferrer">
                            <FileText className="w-4 h-4 mr-2" /> Ver Nota Fiscal
                          </a>
                        </Button>
                      ) : (
                        <Button variant="secondary" disabled className="justify-start disabled:opacity-30">
                          <FileText className="w-4 h-4 mr-2" /> NF indisponível
                        </Button>
                      )}
                    </div>
                  </div>

                  {orderHistory.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-display font-bold text-foreground">Acompanhamento</h3>
                        <Button variant="secondary" size="sm" asChild>
                          <a href={`/acompanhar/${selectedOrder.id}`} target="_blank" rel="noreferrer">
                            <ExternalLink className="w-3 h-3 mr-1" /> Ver Tracking
                          </a>
                        </Button>
                      </div>
                      <div className="relative border-l-2 border-border ml-3 space-y-6">
                        {orderHistory.map((h, i) => (
                          <div key={h.id} className="relative pl-6">
                            <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-background ${i === 0 ? "bg-highlight" : "bg-muted-foreground"}`}></div>
                            <p className={`font-semibold text-sm ${i === 0 ? "text-highlight" : "text-foreground"}`}>{statusLabels[h.status] || h.status}</p>
                            {h.notes && <p className="text-xs text-muted-foreground mt-0.5">{h.notes}</p>}
                            <p className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString("pt-BR")}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </section>
    </PublicLayout>
  );
};

export default MinhaConta;
