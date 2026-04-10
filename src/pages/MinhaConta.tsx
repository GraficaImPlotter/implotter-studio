import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import PublicLayout from "@/components/layout/PublicLayout";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { 
  ShoppingCart, User, LogOut, Eye, Package, Clock, CheckCircle, 
  KeyRound, Receipt, FileText, Upload, RefreshCw, ExternalLink,
  ChevronRight, MapPin, ShieldCheck, Star, CreditCard
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/hooks/use-cart";
import LoyaltyWidget from "@/components/LoyaltyWidget";
import { formatCpfCnpj, formatPhone } from "@/lib/utils";
import { validateDocumentFile } from "@/lib/file-validation";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  pedido_recebido: "Recebido", aguardando_pagamento: "Aguardando Pagamento",
  pagamento_confirmado: "Pago / Fila", em_analise: "Em Análise",
  aguardando_arte: "Aguardando Arte", arte_em_conferencia: "Conferindo Arte",
  aprovado_producao: "Na Fila da Oficina", em_producao: "Sendo Produzido",
  em_acabamento: "Acabamento", pronto_envio: "Pronto p/ Envio",
  finalizado: "Finalizado", cancelado: "Cancelado",
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
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/login", { replace: true });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => {
      setProfile(data);
      if (data) {
        setAddress({
          zip: data.address_zip || "",
          street: data.address_street || "",
          number: data.address_number || "",
          complement: data.address_complement || "",
          neighborhood: data.address_neighborhood || "",
          city: data.address_city || "",
          state: data.address_state || "",
        });
      }
    });
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

  const reorderItems = async (orderId: string) => {
    const { data: items } = await supabase.from("order_items").select("*").eq("order_id", orderId);
    if (!items || items.length === 0) return;
    items.forEach((item) => {
      addItem({
        productId: item.product_id || "",
        name: item.product_name,
        price: Number(item.unit_price),
        quantity: item.quantity,
        pricingType: (item.pricing_type as any) || "fixed",
        itemWidth: item.item_width ? Number(item.item_width) : undefined,
        itemHeight: item.item_height ? Number(item.item_height) : undefined,
      });
    });
    toast({ title: "Itens adicionados ao carrinho!" });
    navigate("/carrinho");
  };

  const handleUpdatePassword = async () => {
    if (newPassword.length < 6) {
      toast({ title: "Senha muito curta", description: "A senha deve ter pelo menos 6 caracteres.", variant: "destructive" });
      return;
    }

    setUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: "Senha atualizada!", description: "Sua senha foi alterada com sucesso." });
      setShowPasswordDialog(false);
      setNewPassword("");
    } catch (error: any) {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
    } finally {
      setUpdatingPassword(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <PublicLayout>
      <div className="bg-slate-50 min-h-screen pb-20">
        {/* Profile Header */}
        <div className="bg-white border-b border-slate-200 pt-16 pb-12">
           <div className="container mx-auto px-4 max-w-5xl">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                 <div className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-[2rem] bg-slate-900 flex items-center justify-center text-white text-3xl font-black shadow-xl">
                       {profile?.full_name?.at(0) || user?.email?.at(0).toUpperCase()}
                    </div>
                    <div className="space-y-1">
                       <h1 className="text-3xl font-display font-black text-slate-900 tracking-tight">Bem-vindo, {profile?.full_name?.split(' ')[0] || "Cliente"}</h1>
                       <div className="flex items-center gap-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                          <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-success" /> Conta Verificada</span>
                          <span className="flex items-center gap-1.5"><Star className="w-3.5 h-3.5 text-amber-500" /> Membro desde {new Date(profile?.created_at || "").getFullYear()}</span>
                       </div>
                    </div>
                 </div>
                 <Button variant="ghost" className="rounded-xl px-6 text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-destructive hover:bg-destructive/5" onClick={() => { signOut(); navigate("/"); }}>
                    Sair da Conta
                 </Button>
              </div>
           </div>
        </div>

        <div className="container mx-auto px-4 max-w-5xl -mt-6">
           {/* Tab Navigation */}
           <div className="bg-white p-1 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 flex gap-1 mb-10 w-fit mx-auto md:mx-0">
              {["pedidos", "fidelidade", "perfil"].map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    "px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                    tab === t ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                  )}
                >
                  {t}
                </button>
              ))}
           </div>

           {/* Tab Content */}
           <AnimatePresence mode="wait">
             <motion.div
               key={tab}
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: -10 }}
               transition={{ duration: 0.2 }}
             >
                {tab === "pedidos" && (
                  <div className="space-y-4">
                     {orders.length === 0 ? (
                       <div className="bg-white rounded-[2.5rem] p-20 text-center border border-slate-100 shadow-xl">
                          <Package className="w-16 h-16 text-slate-100 mx-auto mb-6" />
                          <h3 className="text-xl font-bold text-slate-900 mb-2">Sem pedidos por enquanto</h3>
                          <p className="text-slate-500 mb-8 max-w-xs mx-auto">Sua história na ImPlotter começa quando você fizer seu primeiro pedido.</p>
                          <Button className="rounded-2xl px-10 h-14 font-black uppercase tracking-widest text-xs" onClick={() => navigate("/loja")}>Começar agora</Button>
                       </div>
                     ) : (
                       orders.map((o) => (
                         <div 
                           key={o.id} 
                           onClick={() => openOrder(o)}
                           className="bg-white group rounded-[2rem] p-6 border border-slate-100 shadow-md hover:shadow-xl transition-all cursor-pointer flex flex-col md:flex-row items-center justify-between gap-6"
                         >
                            <div className="flex items-center gap-5 w-full md:w-auto">
                               <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors">
                                  <ShoppingCart className="w-6 h-6" />
                               </div>
                               <div>
                                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Pedido</p>
                                  <h4 className="font-display font-black text-xl text-slate-900 leading-none">#{o.order_number}</h4>
                                  <p className="text-xs font-bold text-slate-400 mt-2">{new Date(o.created_at).toLocaleDateString("pt-BR")}</p>
                               </div>
                            </div>

                            <div className="flex items-center gap-8 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-slate-50 pt-4 md:pt-0">
                               <div className="text-center md:text-right">
                                  <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Status</p>
                                  <span className="text-xs font-black text-slate-900 uppercase">{STATUS_LABELS[o.status] || o.status}</span>
                               </div>
                               <div>
                                  <span className="text-2xl font-display font-black text-slate-900 tracking-tighter">R$ {Number(o.total).toFixed(2)}</span>
                               </div>
                               <div className="hidden sm:block">
                                  <ChevronRight className="w-5 h-5 text-slate-200 group-hover:text-primary transition-all translate-x-0 group-hover:translate-x-1" />
                               </div>
                            </div>
                         </div>
                       ))
                     )}
                  </div>
                )}

                {tab === "fidelidade" && <LoyaltyWidget />}

                {tab === "perfil" && (
                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-xl space-y-8">
                         <h3 className="text-xl font-display font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                            <User className="w-5 h-5 text-primary" /> Meus Dados
                         </h3>
                         <div className="space-y-4">
                            <div className="space-y-1.5">
                               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome Completo</label>
                               <Input defaultValue={profile?.full_name} disabled className="h-12 rounded-xl bg-slate-50 border-0 font-bold" />
                            </div>
                            <div className="space-y-1.5">
                               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email</label>
                               <Input defaultValue={user?.email} disabled className="h-12 rounded-xl bg-slate-50 border-0 font-bold" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                               <div className="space-y-1.5">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Telefone</label>
                                  <Input defaultValue={formatPhone(profile?.phone || "")} disabled className="h-12 rounded-xl bg-slate-50 border-0 font-bold" />
                               </div>
                               <div className="space-y-1.5">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CPF / CNPJ</label>
                                  <Input defaultValue={formatCpfCnpj(profile?.cpf_cnpj || "")} disabled className="h-12 rounded-xl bg-slate-50 border-0 font-bold" />
                               </div>
                            </div>
                         </div>
                         <Button variant="outline" className="w-full h-12 rounded-xl font-bold text-xs uppercase tracking-widest border-slate-100" onClick={() => toast({ title: "Entre em contato para alterar dados protegidos." })}>
                            Alterar Informações
                         </Button>
                      </div>

                       <div className="space-y-8">
                          <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-xl space-y-6">
                             <h3 className="text-xl font-display font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                                <KeyRound className="w-5 h-5 text-primary" /> Segurança
                             </h3>
                             <p className="text-xs text-slate-500 font-medium">Sua senha é protegida por criptografia de ponta para sua segurança.</p>
                             <Button className="w-full h-12 rounded-xl font-black text-[10px] uppercase tracking-widest" onClick={() => setShowPasswordDialog(true)}>Trocar Senha Agora</Button>
                          </div>
                       </div>
                    </div>
                 )}
              </motion.div>
            </AnimatePresence>
         </div>

         {/* Password Change Dialog */}
         <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
            <DialogContent className="max-w-md bg-white rounded-[2.5rem] p-10 border-0 shadow-2xl">
               <DialogHeader className="mb-6">
                  <DialogTitle className="font-display font-black text-2xl tracking-tight text-slate-900 uppercase">
                     Definir Nova Senha
                  </DialogTitle>
               </DialogHeader>
               <div className="space-y-6">
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nova Senha</label>
                     <Input 
                        type="password" 
                        placeholder="Mínimo 6 caracteres" 
                        className="h-12 rounded-xl bg-slate-50 border-0 font-bold"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                     />
                  </div>
                  <Button 
                     className="w-full h-14 rounded-2xl font-black text-xs uppercase tracking-widest"
                     onClick={handleUpdatePassword}
                     disabled={updatingPassword}
                  >
                     {updatingPassword ? "Salvando..." : "Confirmar Mudança"}
                  </Button>
               </div>
            </DialogContent>
         </Dialog>

        {/* Order Detail Modal */}
        <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
           <DialogContent className="max-w-2xl bg-white rounded-[3rem] p-8 md:p-12 border-0 shadow-2xl overflow-y-auto max-h-[90vh]">
              <DialogHeader className="mb-8">
                 <DialogTitle className="font-display font-black text-3xl tracking-tight text-slate-900 uppercase">
                    Pedido <span className="text-primary">#{selectedOrder?.order_number}</span>
                 </DialogTitle>
              </DialogHeader>

              {selectedOrder && (
                <div className="space-y-10">
                   <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-8">
                      <div className="text-center md:text-left">
                         <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Total do Investimento</p>
                         <h5 className="text-4xl font-display font-black text-slate-900 tracking-tighter">R$ {Number(selectedOrder.total).toFixed(2)}</h5>
                      </div>
                      <div className="flex flex-col items-center md:items-end gap-3">
                         <span className="px-4 py-2 bg-white border border-slate-100 rounded-xl text-xs font-black text-slate-900 uppercase tracking-widest shadow-sm">
                            {STATUS_LABELS[selectedOrder.status] || selectedOrder.status}
                         </span>
                         <Link to={`/acompanhar/${selectedOrder.id}`}>
                            <Button className="rounded-xl h-10 px-6 font-bold text-[10px] uppercase tracking-widest">
                               Rastreio Completo <ExternalLink className="w-3 h-3 ml-2" />
                            </Button>
                         </Link>
                      </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div>
                         <h4 className="font-display font-bold text-slate-900 mb-6 flex items-center gap-2">
                            <Package className="w-5 h-5 text-primary" /> Itens Contratados
                         </h4>
                         <div className="space-y-4">
                            {orderItems.map((it) => (
                              <div key={it.id} className="flex justify-between items-center group">
                                 <div>
                                    <p className="text-sm font-bold text-slate-900">{it.product_name}</p>
                                    <p className="text-xs text-slate-500">Unidades: {it.quantity}</p>
                                 </div>
                                 <span className="text-sm font-black text-slate-900">R$ {Number(it.subtotal).toFixed(2)}</span>
                              </div>
                            ))}
                         </div>
                      </div>

                      <div className="space-y-8">
                         <div>
                            <h4 className="font-display font-bold text-slate-900 mb-4">Documentação Fiscal</h4>
                            {selectedOrder.invoice_url ? (
                              <Button asChild variant="outline" className="w-full rounded-2xl h-12 font-bold text-xs border-slate-200">
                                 <a href={selectedOrder.invoice_url} target="_blank" rel="noreferrer">
                                    <Receipt className="w-4 h-4 mr-2" /> Baixar Nota Fiscal (PDF)
                                 </a>
                              </Button>
                            ) : (
                              <div className="p-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center">
                                 <p className="text-[10px] font-bold text-slate-400 uppercase">NF em Processamento</p>
                              </div>
                            )}
                         </div>

                         <div className="pt-6 border-t border-slate-100">
                            <Button className="w-full bg-slate-50 text-slate-900 hover:bg-slate-100 border border-slate-100 rounded-2xl h-14 font-black uppercase text-xs tracking-widest" onClick={() => reorderItems(selectedOrder.id)}>
                               <RefreshCw className="w-4 h-4 mr-2" /> Repetir este Pedido
                            </Button>
                         </div>
                      </div>
                   </div>
                </div>
              )}
           </DialogContent>
        </Dialog>
      </div>
    </PublicLayout>
  );
};

export default MinhaConta;
