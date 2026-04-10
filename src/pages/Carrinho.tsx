import { useMemo, useState, useEffect } from "react";
import PublicLayout from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShoppingCart, Minus, Plus, Trash2, ArrowRight, ArrowLeft, Shield, Ruler, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useCart } from "@/hooks/use-cart";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { evaluateCouponForCart } from "@/lib/discounting";
import ShippingCalculator, { type ShippingOption } from "@/components/shipping/ShippingCalculator";
import PageHero from "@/components/layout/PageHero";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const Carrinho = () => {
  const { toast } = useToast();
  const { user } = useAuth();

  const {
    items,
    updateQuantity,
    removeItem,
    getSubtotal,
    getTotal,
    discount,
    discountSource,
    couponCode,
    freeShipping,
    setCoupon,
    clearCoupon,
  } = useCart();

  const [couponInput, setCouponInput] = useState("");
  const [shippingOption, setShippingOption] = useState<ShippingOption | null>(null);
  const subtotal = useMemo(() => getSubtotal(), [getSubtotal, items]);
  const shippingCost = shippingOption?.price ?? 0;
  const totalWithShipping = getTotal() + shippingCost;

  const [upsellProducts, setUpsellProducts] = useState<any[]>([]);

  useEffect(() => {
    const fetchUpsell = async () => {
      const { data } = await supabase
        .from("products_public")
        .select("id, name, slug, sale_price, price, product_images(image_url)")
        .eq("is_active", true)
        .limit(10);
      
      if (data) {
        const cartIds = items.map(i => i.productId);
        const available = data.filter(p => !cartIds.includes(p.id));
        const shuffled = available.sort(() => 0.5 - Math.random()).slice(0, 2);
        setUpsellProducts(shuffled);
      }
    };
    fetchUpsell();
  }, [items]);

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

  return (
    <PublicLayout>
      <PageHero
        title="Seu Carrinho"
        badge="Finalização de Pedido"
      >
        <p className="text-white/70 text-sm md:text-base max-w-lg mx-auto">
          Confira seus itens e escolha a melhor opção de frete para concluir sua compra com segurança.
        </p>
      </PageHero>

      <section className="py-12 md:py-24 bg-muted/30 min-h-[70vh]">
        <div className="container mx-auto px-4 max-w-7xl">

          {items.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card-premium rounded-3xl p-16 text-center border-gradient-premium max-w-2xl mx-auto"
            >
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 animate-float-gentle">
                <ShoppingCart className="w-10 h-10 text-primary" />
              </div>
              <h2 className="font-display text-2xl font-bold text-foreground mb-3">Seu carrinho está vazio</h2>
              <p className="text-muted-foreground mb-8 text-lg">Parece que você ainda não escolheu seus materiais gráficos.</p>
              <Button variant="hero" size="lg" asChild className="rounded-xl px-10 h-14 font-bold shadow-glow">
                <Link to="/loja">
                  Ir para a Loja <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
            </motion.div>
          ) : (
            <div className="flex flex-col lg:flex-row gap-8 items-start">
              <div className="w-full lg:w-2/3 space-y-4">
                {items.map((item, i) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1, duration: 0.5 }}
                    whileHover={{ x: 5, transition: { duration: 0.2 } }}
                    className="glass-card-premium rounded-2xl p-4 sm:p-6 border-gradient-premium shadow-sm"
                  >
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-secondary rounded-xl flex-shrink-0 overflow-hidden">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <ShoppingCart className="w-6 h-6" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-display font-bold text-foreground text-sm sm:text-base truncate">{item.name}</p>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItem(item.id)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0 w-8 h-8"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        {item.pricingType === "per_sqm" && item.itemWidth && item.itemHeight ? (
                          <div className="mt-1 space-y-0.5">
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Ruler className="w-3 h-3 text-highlight" />
                              {item.itemWidth}m × {item.itemHeight}m = {item.itemArea?.toFixed(2)} m²
                            </p>
                            <p className="text-xs text-muted-foreground">
                              R$ {item.pricePerSqm?.toFixed(2)}/m² × {item.itemArea?.toFixed(2)} m²
                            </p>
                          </div>
                        ) : (
                          <p className="text-xs sm:text-sm text-muted-foreground">R$ {item.price.toFixed(2)} / un</p>
                        )}
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center gap-1.5">
                            <Button
                              variant="outline"
                              size="icon"
                              className="w-8 h-8 rounded-lg"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="w-8 text-center text-sm font-bold text-foreground">{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="w-8 h-8 rounded-lg"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                          <p className="font-display font-bold text-foreground text-sm sm:text-base">
                            R$ {(item.price * item.quantity).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}

                {upsellProducts.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                    className="mt-10 space-y-4 border-t border-white/5 pt-8"
                  >
                    <h3 className="font-display font-bold text-muted-foreground uppercase tracking-widest text-xs ml-1">
                       Aproveite e leve também
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {upsellProducts.map(prod => (
                        <div key={prod.id} className="glass-card-premium border-gradient-premium rounded-2xl p-4 flex gap-4 items-center group">
                          <img src={prod.product_images?.[0]?.image_url || "/placeholder.svg"} className="w-16 h-16 rounded-xl object-cover bg-black/20" />
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm text-foreground truncate">{prod.name}</p>
                            <p className="text-highlight font-black text-sm">R$ {Number(prod.sale_price || prod.price).toFixed(2)}</p>
                          </div>
                          <Button variant="secondary" size="sm" asChild className="h-9 px-4 rounded-xl shadow-glow-sm hover:scale-105 active:scale-95 transition-all bg-white/5 border border-white/10">
                            <Link to={`/loja/${prod.slug}`}>Ver</Link>
                          </Button>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>

              <div className="w-full lg:w-1/3">
                <div className="sticky top-32 z-10">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className="glass-card-premium rounded-3xl p-6 lg:p-8 space-y-6 shadow-glow-sm border-gradient-premium max-h-[calc(100vh-160px)] overflow-y-auto mb-10"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-glow-sm">
                        <Shield className="w-5 h-5 text-primary" />
                      </div>
                      <h2 className="font-display font-black text-foreground text-xl tracking-tight uppercase">Resumo</h2>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal ({items.length} itens)</span>
                      <span className="text-foreground font-medium">R$ {subtotal.toFixed(2)}</span>
                    </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-success font-medium">
                      {discountSource === "progressive" ? "Desconto progressivo" : `Desconto (${couponCode})`}
                    </span>
                    <span className="text-success font-medium">-R$ {discount.toFixed(2)}</span>
                  </div>
                )}

                {discountSource === "coupon" && freeShipping && (
                  <div className="text-xs text-muted-foreground">Frete grátis ativado por cupom.</div>
                )}

                <ShippingCalculator
                  cartTotal={subtotal}
                  items={items}
                  onSelect={setShippingOption}
                  selected={shippingOption}
                />

                {shippingOption && !freeShipping && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Frete ({shippingOption.name})</span>
                    <span className="text-foreground font-medium">R$ {shippingCost.toFixed(2)}</span>
                  </div>
                )}

                <div className="border-t border-white/10 pt-6">
                  <div className="flex justify-between items-end">
                    <span className="font-display font-black text-xs text-muted-foreground uppercase tracking-widest pb-1">Total Geral</span>
                    <span className="font-display font-black text-3xl text-foreground tracking-tighter shadow-glow-text">
                      R$ {(freeShipping ? getTotal() : totalWithShipping).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      placeholder="Cupom de desconto"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      className="bg-muted/50 border-border h-11 pr-10 rounded-xl outline-none focus:border-primary/50 transition-colors"
                    />
                  </div>
                  {couponCode ? (
                    <Button type="button" variant="outline" size="sm" onClick={clearCoupon} className="gap-1 h-11 rounded-xl group hover:bg-destructive/10">
                      <X className="w-4 h-4 text-destructive group-hover:scale-110 transition-transform" />
                    </Button>
                  ) : (
                    <Button type="button" variant="outline" className="h-11 px-6 rounded-xl font-bold hover:bg-primary/5 transition-colors" onClick={applyCoupon}>
                      Aplicar
                    </Button>
                  )}
                </div>

                <Button variant="hero" size="lg" asChild className="w-full h-14 rounded-2xl font-bold text-lg shadow-glow hover:shadow-glow-strong active:scale-95 transition-all">
                  <Link to="/checkout" className="flex items-center justify-center gap-2">
                    Finalizar Compra <ArrowRight className="w-5 h-5" />
                  </Link>
                </Button>
                <Button variant="outline" size="default" asChild className="w-full h-12 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                  <Link to="/loja" className="flex items-center justify-center gap-2">
                    <ArrowLeft className="w-4 h-4" /> Continuar Comprando
                  </Link>
                </Button>
                <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground pt-4 uppercase tracking-widest font-semibold opacity-60">
                  <Shield className="w-3.5 h-3.5 text-success" />
                  <span>Transação 100% Criptografada</span>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      )}
        </div>
      </section>
    </PublicLayout>
  );
};

export default Carrinho;
