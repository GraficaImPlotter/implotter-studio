import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PublicLayout from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Shield, Lock, CreditCard, Check, Ruler, X } from "lucide-react";
import { evaluateCouponForCart } from "@/lib/discounting";
import { z } from "zod";
import ShippingCalculator, { type ShippingOption } from "@/components/shipping/ShippingCalculator";
import { formatCpfCnpj, formatPhone } from "@/lib/utils";

const checkoutSchema = z.object({
  name: z.string().trim().min(2, "Nome deve ter ao menos 2 caracteres").max(100),
  email: z.string().trim().email("Email inválido").max(255),
  phone: z.string().trim().max(20).optional(),
  cpf_cnpj: z.string().trim().min(11, "CPF/CNPJ inválido").max(20),
  address_street: z.string().trim().max(200).optional(),
  address_number: z.string().trim().max(20).optional(),
  address_complement: z.string().trim().max(100).optional(),
  address_neighborhood: z.string().trim().max(100).optional(),
  address_city: z.string().trim().max(100).optional(),
  address_state: z.string().trim().max(2).optional(),
  address_zip: z.string().trim().max(10).optional(),
  notes: z.string().trim().max(1000).optional(),
});

const Checkout = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  const {
    items,
    getSubtotal,
    getTotal,
    discount,
    discountSource,
    couponCode,
    couponId,
    freeShipping,
    setCoupon,
    clearCoupon,
    clearCart,
    shippingOption,
    setShippingOption,
  } = useCart();

  const [loading, setLoading] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [cep, setCep] = useState("");
  const [cepLoading, setCepLoading] = useState(false);
  const [address, setAddress] = useState({ street: "", neighborhood: "", city: "", state: "" });
  const [profileData, setProfileData] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "credit_card">("pix");

  const shippingCost = freeShipping ? 0 : (shippingOption?.price || 0);
  const finalTotal = getTotal() + shippingCost;

  // Pre-fill from profile
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setProfileData(data);
          if (data.address_zip) {
            let v = data.address_zip.replace(/\D/g, "");
            if (v.length > 5) v = v.slice(0, 5) + "-" + v.slice(5);
            setCep(v);
          }
          setAddress({
            street: data.address_street || "",
            neighborhood: data.address_neighborhood || "",
            city: data.address_city || "",
            state: data.address_state || "",
          });
        }
      });
  }, [user]);

  const fetchCep = async (zip: string) => {
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${zip}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setAddress({
          street: data.logradouro || "",
          neighborhood: data.bairro || "",
          city: data.localidade || "",
          state: data.uf || "",
        });
        toast({ title: "Endereço preenchido automaticamente!" });
      }
    } catch {
      // ignore
    } finally {
      setCepLoading(false);
    }
  };

  const applyCoupon = async () => {
    if (!couponInput.trim()) return;

    const res = await evaluateCouponForCart({
      code: couponInput,
      items,
      customerId: user?.id ?? null,
    });

    if (res.ok === false) {
      toast({ title: res.message, variant: "destructive" });
      return;
    }

    setCoupon({ code: res.code, id: res.couponId, discount: res.discount, freeShipping: res.freeShipping });
    toast({ title: `Cupom ${res.code} aplicado!` });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (items.length === 0) return;

    const fd = new FormData(e.currentTarget);
    const raw = {
      name: (fd.get("name") as string) || "",
      email: (fd.get("email") as string) || "",
      phone: (fd.get("phone") as string) || undefined,
      cpf_cnpj: (fd.get("cpf_cnpj") as string) || undefined,
      address_street: (fd.get("address_street") as string) || undefined,
      address_number: (fd.get("address_number") as string) || undefined,
      address_complement: (fd.get("address_complement") as string) || undefined,
      address_neighborhood: (fd.get("address_neighborhood") as string) || undefined,
      address_city: (fd.get("address_city") as string) || undefined,
      address_state: (fd.get("address_state") as string) || undefined,
      address_zip: (fd.get("address_zip") as string) || undefined,
      notes: (fd.get("notes") as string) || undefined,
    };

    const parsed = checkoutSchema.safeParse(raw);
    if (!parsed.success) {
      toast({ title: "Erro", description: parsed.error.errors[0].message, variant: "destructive" });
      return;
    }

    const customerName = parsed.data.name;
    const customerEmail = parsed.data.email;

    setLoading(true);

    // Re-check auth state to ensure fresh session
    const { data: { user: freshUser } } = await supabase.auth.getUser();
    const customerId = freshUser?.id || null;

    // ─── ARQ-001: SERVER-SIDE PRICE VERIFICATION ─────────────────────
    // Never trust prices from the frontend. Re-fetch real prices from DB.
    const productIds = items.filter(i => i.productId).map(i => i.productId);
    let serverPrices: Record<string, number> = {};

    if (productIds.length > 0) {
      const { data: products } = await supabase
        .from("products")
        .select("id, price, sale_price")
        .in("id", productIds);

      if (products) {
        for (const p of products) {
          const realPrice = (p.sale_price && Number(p.sale_price) < Number(p.price))
            ? Number(p.sale_price)
            : Number(p.price);
          serverPrices[p.id] = realPrice;
        }
      }
    }

    // Recalculate subtotal using real DB prices
    let verifiedSubtotal = 0;
    for (const item of items) {
      const realUnitPrice = item.productId && serverPrices[item.productId]
        ? serverPrices[item.productId]
        : item.price; // fallback for custom/manual items without product_id
      verifiedSubtotal += realUnitPrice * item.quantity;
    }

    // Detect price manipulation (allow small rounding difference)
    const frontendSubtotal = getSubtotal();
    if (Math.abs(verifiedSubtotal - frontendSubtotal) > 1.0) {
      console.error(`⚠️ Price manipulation detected! Frontend: ${frontendSubtotal}, Server: ${verifiedSubtotal}`);
      toast({
        title: "Erro de validação de preços",
        description: "Os preços dos produtos mudaram. Por favor, atualize a página e tente novamente.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Use server-verified values
    const verifiedTotal = Math.max(0, verifiedSubtotal - (discount || 0)) + shippingCost;
    // ─── END PRICE VERIFICATION ──────────────────────────────────────

    const { data: order, error } = await supabase
      .from("orders")
      .insert([
        {
          customer_id: customerId,
          customer_name: customerName,
          customer_phone: parsed.data.phone || null,
          customer_email: customerEmail,
          customer_cpf_cnpj: parsed.data.cpf_cnpj || null,
          address_street: parsed.data.address_street || null,
          address_number: parsed.data.address_number || null,
          address_complement: parsed.data.address_complement || null,
          address_neighborhood: parsed.data.address_neighborhood || null,
          address_city: parsed.data.address_city || null,
          address_state: parsed.data.address_state || null,
          address_zip: parsed.data.address_zip || null,
          notes: parsed.data.notes || null,
          subtotal: verifiedSubtotal,
          discount: discount,
          total: verifiedTotal,
          shipping_service: shippingOption?.name || null,
          shipping_service_id: shippingOption?.id || null,
          coupon_id: discountSource === "coupon" ? couponId : null,
          affiliate_id: null,
          payment_method: paymentMethod,
          status: "aguardando_pagamento" as any,
          origin: "site",
        },
      ])
      .select()
      .single();

    if (error || !order) {
      console.error("Order creation error:", error);
      toast({ title: "Erro ao criar pedido", description: error?.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    const orderItems = items.map((item) => ({
      order_id: order.id,
      product_id: item.productId || null,
      product_name: item.name,
      quantity: item.quantity,
      unit_price: item.price,
      subtotal: item.price * item.quantity,
      instructions: item.instructions || null,
      item_width: item.itemWidth || null,
      item_height: item.itemHeight || null,
      item_area: item.itemArea || null,
      price_per_sqm: item.pricePerSqm || null,
      pricing_type: item.pricingType || "fixed",
    }));

    // PERF-003: Verify each sub-operation succeeds before proceeding
    const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
    if (itemsError) {
      console.error("Order items insertion error:", itemsError);
      toast({ title: "Erro ao salvar itens do pedido", description: "O pedido foi criado mas os itens podem estar incompletos. Entre em contato com o suporte.", variant: "destructive" });
      // Don't clear cart — user may need to retry
      setLoading(false);
      return;
    }

    const { error: historyError } = await supabase
      .from("order_status_history")
      .insert([{ order_id: order.id, status: "aguardando_pagamento" as any }]);
    if (historyError) {
      console.error("Status history insertion error:", historyError);
      // Non-critical — log but continue
    }

    clearCart();
    setLoading(false);
    navigate(`/pagamento/${order.id}`);
  };

  const steps = [
    { num: 1, label: "Carrinho", done: true },
    { num: 2, label: "Dados", done: false, active: true },
    { num: 3, label: "Pagamento", done: false },
  ];

  if (items.length === 0) {
    return (
      <PublicLayout>
        <section className="py-20 text-center">
          <div className="container mx-auto px-4">
            <h1 className="font-display text-3xl font-bold text-foreground mb-4">Carrinho vazio</h1>
            <p className="text-muted-foreground mb-6">Adicione produtos à sua sacola para continuar</p>
            <Button variant="hero" size="lg" onClick={() => navigate("/loja")}>Ver Produtos</Button>
          </div>
        </section>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <section className="py-8">
        <div className="container mx-auto px-4 max-w-5xl">
          {/* Progress bar */}
          <div className="flex items-center justify-center gap-2 mb-12">
            {steps.map((step, i) => (
              <div key={i} className="flex items-center gap-2">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                    step.done
                      ? "bg-success text-success-foreground"
                      : step.active
                        ? "bg-primary text-primary-foreground shadow-glow"
                        : "bg-white/5 text-muted-foreground border border-white/10"
                  }`}
                >
                  {step.done ? <Check className="w-5 h-5" strokeWidth={3} /> : step.num}
                </div>
                <span className={`text-[11px] font-black uppercase tracking-widest ${step.active ? "text-foreground" : "text-muted-foreground"}`}>
                  {step.label}
                </span>
                {i < steps.length - 1 && <div className="w-16 h-px bg-white/10 mx-3" />}
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-5">
              <div className="glass-card-premium rounded-3xl p-6 md:p-8 space-y-6 border-gradient-premium">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-glow-sm">
                    <span className="text-primary font-black">1</span>
                  </div>
                  <h2 className="font-display font-black text-foreground text-xl tracking-tight uppercase">Dados do Cliente</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-muted-foreground uppercase tracking-widest ml-1">Nome completo *</label>
                    <Input name="name" required defaultValue={profileData?.full_name || ""} className="bg-black/20 border-white/10 h-12 rounded-xl focus:border-primary/50" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-muted-foreground uppercase tracking-widest ml-1">Email *</label>
                    <Input
                      name="email"
                      type="email"
                      required
                      defaultValue={profileData?.email || user?.email || ""}
                      className="bg-black/20 border-white/10 h-12 rounded-xl focus:border-primary/50"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-muted-foreground uppercase tracking-widest ml-1">Telefone</label>
                    <Input name="phone" defaultValue={formatPhone(profileData?.phone || "")} onChange={e => { e.target.value = formatPhone(e.target.value); }} className="bg-black/20 border-white/10 h-12 rounded-xl focus:border-primary/50" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-muted-foreground uppercase tracking-widest ml-1">CPF/CNPJ *</label>
                    <Input name="cpf_cnpj" required defaultValue={formatCpfCnpj(profileData?.cpf_cnpj || "")} onChange={e => { e.target.value = formatCpfCnpj(e.target.value); }} className="bg-black/20 border-white/10 h-12 rounded-xl focus:border-primary/50" />
                  </div>
                </div>
              </div>

              <div className="glass-card-premium rounded-3xl p-6 md:p-8 space-y-6 border-gradient-premium">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-glow-sm">
                    <span className="text-primary font-black">2</span>
                  </div>
                  <h2 className="font-display font-black text-foreground text-xl tracking-tight uppercase">Endereço de Entrega</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-muted-foreground uppercase tracking-widest ml-1">CEP *</label>
                    <Input
                      name="address_zip"
                      placeholder="00000-000"
                      maxLength={9}
                      className="bg-black/20 border-white/10 h-12 rounded-xl focus:border-primary/50"
                      value={cep}
                      onChange={(e) => {
                        let v = e.target.value.replace(/\D/g, "").slice(0, 8);
                        if (v.length > 5) v = v.slice(0, 5) + "-" + v.slice(5);
                        setCep(v);
                        if (v.replace("-", "").length === 8) fetchCep(v.replace("-", ""));
                      }}
                    />
                    {cepLoading && <span className="text-[10px] text-primary animate-pulse ml-1">Buscando...</span>}
                  </div>
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-[11px] font-black text-muted-foreground uppercase tracking-widest ml-1">Rua</label>
                    <Input
                      name="address_street"
                      value={address.street}
                      onChange={(e) => setAddress((p) => ({ ...p, street: e.target.value }))}
                      className="bg-black/20 border-white/10 h-12 rounded-xl focus:border-primary/50"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-muted-foreground uppercase tracking-widest ml-1">Número</label>
                    <Input name="address_number" defaultValue={profileData?.address_number || ""} className="bg-black/20 border-white/10 h-12 rounded-xl focus:border-primary/50" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-muted-foreground uppercase tracking-widest ml-1">Complemento</label>
                    <Input
                      name="address_complement"
                      defaultValue={profileData?.address_complement || ""}
                      className="bg-black/20 border-white/10 h-12 rounded-xl focus:border-primary/50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-muted-foreground uppercase tracking-widest ml-1">Bairro</label>
                    <Input
                      name="address_neighborhood"
                      value={address.neighborhood}
                      onChange={(e) => setAddress((p) => ({ ...p, neighborhood: e.target.value }))}
                      className="bg-black/20 border-white/10 h-12 rounded-xl focus:border-primary/50"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-muted-foreground uppercase tracking-widest ml-1">Cidade</label>
                    <Input
                      name="address_city"
                      value={address.city}
                      onChange={(e) => setAddress((p) => ({ ...p, city: e.target.value }))}
                      className="bg-black/20 border-white/10 h-12 rounded-xl focus:border-primary/50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-muted-foreground uppercase tracking-widest ml-1">Estado</label>
                    <Input
                      name="address_state"
                      value={address.state}
                      onChange={(e) => setAddress((p) => ({ ...p, state: e.target.value }))}
                      className="bg-black/20 border-white/10 h-12 rounded-xl focus:border-primary/50"
                    />
                  </div>
                </div>
              </div>

              <div className="glass-card rounded-2xl p-6">
                <label className="text-sm font-semibold text-foreground mb-1 block">Observações do pedido</label>
                <Textarea name="notes" rows={3} className="bg-secondary border-border" />
              </div>
            </div>

            <div>
                <div className="glass-card-premium rounded-3xl p-6 md:p-8 space-y-6 sticky top-24 border-gradient-premium shadow-glow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-glow-sm">
                      <Shield className="w-5 h-5 text-primary" />
                    </div>
                    <h2 className="font-display font-black text-foreground text-xl tracking-tight uppercase">Resumo</h2>
                  </div>
                  <div className="space-y-4 max-h-[30vh] overflow-y-auto pr-2 scrollbar-thin">
                    {items.map((item) => (
                      <div key={item.id} className="pb-4 border-b border-white/5 last:border-0">
                        <div className="flex justify-between items-start gap-4">
                          <div className="min-w-0">
                            <p className="font-display font-bold text-foreground text-sm leading-tight truncate">{item.name}</p>
                            <p className="text-[11px] text-muted-foreground mt-1">Qtde: {item.quantity}</p>
                          </div>
                          <span className="text-foreground font-black text-sm whitespace-nowrap">R$ {(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="space-y-3 pt-2">
                    <div className="flex justify-between text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                      <span>Subtotal</span>
                      <span className="text-foreground">R$ {getSubtotal().toFixed(2)}</span>
                    </div>

                    {discount > 0 && (
                      <div className="flex justify-between text-[11px] font-black uppercase tracking-widest text-success">
                        <span>Desconto</span>
                        <span>-R$ {discount.toFixed(2)}</span>
                      </div>
                    )}

                    <div className="py-3 border-y border-white/5 my-2">
                      <ShippingCalculator
                        cartTotal={getSubtotal()}
                        items={items}
                        onSelect={setShippingOption}
                        selected={shippingOption}
                      />
                    </div>

                    {shippingOption && !freeShipping && (
                      <div className="flex justify-between text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                        <span>Frete ({shippingOption.name})</span>
                        <span className="text-foreground">R$ {shippingOption.price.toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-end border-t border-white/10 pt-6">
                    <span className="font-display font-black text-[10px] text-muted-foreground uppercase tracking-widest pb-1">Total a Pagar</span>
                    <span className="font-display font-black text-4xl text-foreground tracking-tighter shadow-glow-text">
                      R$ {finalTotal.toFixed(2)}
                    </span>
                  </div>

                <div className="flex gap-2">
                  <Input
                    placeholder="Cupom de desconto"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    className="bg-secondary border-border"
                  />
                  {couponCode ? (
                    <Button type="button" variant="outline" size="sm" onClick={clearCoupon} className="gap-1">
                      <X className="w-4 h-4" />
                      Remover
                    </Button>
                  ) : (
                    <Button type="button" variant="outline" size="sm" onClick={applyCoupon}>
                      Aplicar
                    </Button>
                  )}
                </div>

                  <div className="space-y-4">
                    <p className="text-[11px] font-black text-muted-foreground uppercase tracking-widest ml-1">Método de Pagamento</p>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod("pix")}
                        className={`group relative p-6 rounded-2xl border-2 transition-all duration-300 flex flex-col items-center justify-center gap-2 overflow-hidden
                          ${paymentMethod === "pix"
                            ? "border-primary bg-primary/5 shadow-glow-sm"
                            : "border-white/5 bg-black/20 hover:border-primary/40"
                          }`}
                      >
                        <div className="absolute top-0 right-0 w-12 h-12 bg-primary/5 rounded-bl-full group-hover:bg-primary/10 transition-colors" />
                        <CreditCard className={`w-8 h-8 ${paymentMethod === "pix" ? "text-primary shadow-glow-sm" : "text-muted-foreground"}`} />
                        <span className={`text-[12px] font-black uppercase tracking-wider ${paymentMethod === "pix" ? "text-foreground" : "text-muted-foreground"}`}>PIX</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod("credit_card")}
                        className={`group relative p-6 rounded-2xl border-2 transition-all duration-300 flex flex-col items-center justify-center gap-2 overflow-hidden
                          ${paymentMethod === "credit_card"
                            ? "border-primary bg-primary/5 shadow-glow-sm"
                            : "border-white/5 bg-black/20 hover:border-primary/40"
                          }`}
                      >
                        <div className="absolute top-0 right-0 w-12 h-12 bg-primary/5 rounded-bl-full group-hover:bg-primary/10 transition-colors" />
                        <CreditCard className={`w-8 h-8 ${paymentMethod === "credit_card" ? "text-primary shadow-glow-sm" : "text-muted-foreground"}`} />
                        <span className={`text-[12px] font-black uppercase tracking-wider ${paymentMethod === "credit_card" ? "text-foreground" : "text-muted-foreground"}`}>CARTÃO</span>
                      </button>
                    </div>
                  </div>

                <Button 
                  type="submit" 
                  variant="highlight" 
                  size="xl" 
                  className="w-full h-16 rounded-2xl font-black text-xl shadow-glow hover:shadow-glow-strong active:scale-95 transition-all" 
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-3">
                      <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
                      PROCESSANDO...
                    </span>
                  ) : (
                    <>
                      <Lock className="w-5 h-5 mr-1" /> FINALIZAR PAGAMENTO
                    </>
                  )}
                </Button>

                <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground pt-2 opacity-50">
                  <Shield className="w-3.5 h-3.5 text-success" />
                  <span>Transação 100% Criptografada</span>
                </div>
              </div>
            </div>
          </form>
        </div>
      </section>
    </PublicLayout>
  );
};

export default Checkout;

