import { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import PublicLayout from "@/components/layout/PublicLayout";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeHTML } from "@/lib/sanitize";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCart } from "@/hooks/use-cart";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart, ArrowLeft, Shield, Clock, Award, Truck, Ruler, AlertTriangle, ChevronRight, Home, HelpCircle, Layers, FileDown, Palette, Plus, CheckCircle2, Check, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import RelatedProducts from "@/components/product/RelatedProducts";
import SmartRecommendations from "@/components/product/SmartRecommendations";
import ArtEditor from "@/components/product/ArtEditor";
import { generateClientQuotePDF } from "@/lib/quote-client-pdf";
import SEOHead from "@/components/SEOHead";
import QuantityPriceTable from "@/components/product/QuantityPriceTable";
import ShippingCalculator, { type ShippingOption } from "@/components/shipping/ShippingCalculator";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface CatalogNode {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
}

const buildNodePath = (nodes: CatalogNode[], nodeId: string): CatalogNode[] => {
  const path: CatalogNode[] = [];
  let current = nodes.find(n => n.id === nodeId);
  while (current) {
    path.unshift(current);
    current = current.parent_id ? nodes.find(n => n.id === current!.parent_id) : undefined;
  }
  return path;
};

const SITE_URL = "https://graficaimplotter.shop";

const Produto = () => {
  const { slug } = useParams();
  const { toast } = useToast();
  const { addItem } = useCart();
  const [product, setProduct] = useState<any>(null);
  const [images, setImages] = useState<any[]>([]);
  const [selectedImage, setSelectedImage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [catalogNodes, setCatalogNodes] = useState<CatalogNode[]>([]);
  const [faqs, setFaqs] = useState<{ question: string; answer: string }[]>([]);
  const [availableFinishings, setAvailableFinishings] = useState<any[]>([]);
  const [selectedFinishings, setSelectedFinishings] = useState<string[]>([]);
  const [finishingQuantities, setFinishingQuantities] = useState<Record<string, number>>({});
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [quantityMultiplier, setQuantityMultiplier] = useState(1);
  const [quoteDialogOpen, setQuoteDialogOpen] = useState(false);
  const [quoteCustomer, setQuoteCustomer] = useState({ name: "", email: "", phone: "", cpfCnpj: "", company: "" });
  const [companySettings, setCompanySettings] = useState({ name: "", cnpj: "", address: "", phone: "", email: "", website: "" });
  const [showSticky, setShowSticky] = useState(false);
  const [configValues, setConfigValues] = useState<Record<string, any>>({});
  const [selectedShipping, setSelectedShipping] = useState<ShippingOption | null>(null);
  const [selectedQuantity, setSelectedQuantity] = useState<number>(1);

  useEffect(() => {
    const handleScroll = () => setShowSticky(window.scrollY > 450);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!slug) return;
    const load = async () => {
      const [{ data }, { data: nodes }] = await Promise.all([
        supabase
          .from("products")
          .select("id, name, slug, short_description, full_description, specifications, price, sale_price, pricing_type, sale_unit, price_per_sqm, min_width, max_width, min_height, max_height, min_area, max_area, catalog_node_id, category_id, subcategory_id, is_active, is_featured, estimated_days, video_url, keywords, meta_title, meta_description, product_code, color_mode, default_quantity, sort_order, configuration_schema, created_at, updated_at, categories(name, slug), subcategories(name), product_images(id, image_url, alt_text, sort_order)")
          .eq("slug", slug)
          .eq("is_active", true)
          .maybeSingle(),
        supabase.from("catalog_nodes").select("*").order("name"),
      ]);
      setProduct(data);
      if (data?.default_quantity) setSelectedQuantity(data.default_quantity);
      setImages(data?.product_images?.sort((a: any, b: any) => a.sort_order - b.sort_order) || []);
      setCatalogNodes((nodes ?? []) as CatalogNode[]);
      if (data?.id) {
        const [{ data: faqData }, { data: pfData }] = await Promise.all([
          supabase.from("faq_items").select("question, answer").eq("product_id", data.id).eq("is_active", true).order("sort_order"),
          supabase.from("product_finishings").select("finishing_id, finishings(id, name, price, pricing_mode)").eq("product_id", data.id),
        ]);
        setFaqs(faqData ?? []);
        setAvailableFinishings((pfData ?? []).map((pf: any) => pf.finishings).filter(Boolean));
        setSelectedFinishings([]);
        setFinishingQuantities({});
      }
      setLoading(false);
    };
    load();
  }, [slug]);

  useEffect(() => {
    supabase.from("site_settings").select("key, value")
      .in("key", ["company_name", "cnpj", "address", "address_number", "neighborhood", "city", "state", "phone", "email", "whatsapp"])
      .then(({ data }) => {
        if (data) {
          const map: Record<string, string> = {};
          data.forEach(s => { map[s.key] = s.value || ""; });
          const fullAddress = [map.address, map.address_number, map.neighborhood, map.city, map.state].filter(Boolean).join(", ");
          setCompanySettings({
            name: map.company_name || "Gráfica ImPlotter",
            cnpj: map.cnpj || "",
            address: fullAddress,
            phone: map.phone || map.whatsapp || "",
            email: map.email || "contato@graficaimplotter.com.br",
            website: "graficaimplotter.shop",
          });
        }
      });
  }, []);

  const isSqm = product?.pricing_type === "per_sqm";
  const pricePerSqm = Number(product?.price_per_sqm) || 0;
  const wNum = parseFloat(width) || 0;
  const hNum = parseFloat(height) || 0;
  const area = wNum * hNum;
  
  const finishingsTotal = useMemo(() => {
    return availableFinishings.filter(f => selectedFinishings.includes(f.id)).reduce((sum, f) => {
      return sum + Number(f.price);
    }, 0);
  }, [selectedFinishings, availableFinishings]);

  const baseUnitPrice = Number(product?.sale_price || product?.price) || 0;

  const calculatedPrice = useMemo(() => {
    let total = 0;
    if (isSqm) {
      total = area * pricePerSqm;
    } else {
      const unitPrice = baseUnitPrice * (selectedQuantity >= 1000 ? 0.8 : selectedQuantity >= 500 ? 0.9 : 1);
      total = unitPrice * selectedQuantity;
    }
    
    if (product?.configuration_schema) {
      product.configuration_schema.forEach((item: any) => {
        const val = configValues[item.id];
        if (item.ui_type === 'checkbox' && Array.isArray(val)) {
           val.forEach((v: string) => {
             const opt = item.options?.find((o: any) => o.name === v);
             if (opt) total += (opt.price_adj || 0);
           });
        } else if (val) {
          const opt = item.options?.find((o: any) => o.name === val);
          if (opt) total += (opt.price_adj || 0);
        }
      });
    }

    return total + finishingsTotal;
  }, [isSqm, area, pricePerSqm, baseUnitPrice, selectedQuantity, product?.configuration_schema, configValues, finishingsTotal]);

  const dimensionError = useMemo(() => {
    if (!isSqm || !wNum || !hNum) return null;
    const minW = Number(product?.min_width) || 0;
    const maxW = Number(product?.max_width) || Infinity;
    const minH = Number(product?.min_height) || 0;
    const maxH = Number(product?.max_height) || Infinity;
    const minA = Number(product?.min_area) || 0;
    const maxA = Number(product?.max_area) || Infinity;
    if (wNum < minW) return `Largura mínima: ${minW}m`;
    if (wNum > maxW) return `Largura máxima: ${maxW}m`;
    if (hNum < minH) return `Altura mínima: ${minH}m`;
    if (hNum > maxH) return `Altura máxima: ${maxH}m`;
    if (area < minA) return `Área mínima: ${minA}m²`;
    if (area > maxA) return `O limite máximo é ${maxA}m².`;
    return null;
  }, [isSqm, wNum, hNum, area, product]);

  const canAddToCart = isSqm ? (wNum > 0 && hNum > 0 && !dimensionError) : true;

  const handleAddToCart = () => {
    if (!product || !canAddToCart) return;
    
    const selectedFinishingNames = availableFinishings
      .filter(f => selectedFinishings.includes(f.id))
      .map(f => f.name);

    const configDetails = product.configuration_schema?.map((item: any) => {
      const val = configValues[item.id];
      if (!val) return null;
      return `${item.label}: ${Array.isArray(val) ? val.join(", ") : val}`;
    }).filter(Boolean);

    addItem({
      productId: product.id,
      name: product.name + (!isSqm ? ` (${selectedQuantity} un)` : ""),
      price: calculatedPrice,
      quantity: 1,
      image: images[0]?.image_url,
      pricingType: product.pricing_type,
      saleUnit: product.sale_unit,
      pricePerSqm: isSqm ? pricePerSqm : undefined,
      itemWidth: isSqm ? wNum : undefined,
      itemHeight: isSqm ? hNum : undefined,
      itemArea: isSqm ? area : undefined,
      finishings: [
        ...(selectedFinishingNames.length > 0 ? selectedFinishingNames : []),
        ...(configDetails || [])
      ],
      finishingsTotal: finishingsTotal > 0 ? finishingsTotal : undefined,
      shippingWeight: Number(product.shipping_weight) || 0.3,
      shippingHeight: Number(product.shipping_height) || 2,
      shippingWidth: Number(product.shipping_width) || 11,
      shippingLength: Number(product.shipping_length) || 16,
    });
    toast({ title: `${product.name} adicionado ao carrinho!` });
  };

  const nodePath = useMemo(() => {
    if (!product?.catalog_node_id || catalogNodes.length === 0) return [];
    return buildNodePath(catalogNodes, product.catalog_node_id);
  }, [product, catalogNodes]);

  const trustItems = [
    { icon: Shield, text: "Compra segura" },
    { icon: Clock, text: "Prazo garantido" },
    { icon: Award, text: "Qualidade premium" },
    { icon: Truck, text: "Entrega cuidadosa" },
  ];

  if (loading) return <PublicLayout><div className="py-20 text-center animate-pulse">Carregando...</div></PublicLayout>;
  if (!product) return <PublicLayout><div className="py-20 text-center">Produto não encontrado</div></PublicLayout>;

  return (
    <PublicLayout>
      <SEOHead title={product.name} description={product.short_description} />
      
      <article className="py-8 container mx-auto px-4 max-w-6xl">
        <nav className="flex items-center gap-1.5 text-sm mb-8 flex-wrap">
          <Link to="/loja" className="text-muted-foreground hover:text-highlight transition-colors flex items-center gap-1">
            <Home className="w-3.5 h-3.5" /> Loja
          </Link>
          {nodePath.map((node) => (
            <span key={node.id} className="flex items-center gap-1.5">
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
              <Link to={`/loja?node=${node.id}`} className="text-muted-foreground hover:text-highlight">{node.name}</Link>
            </span>
          ))}
          <span className="flex items-center gap-1.5">
            <ChevronRight className="w-3 h-3 text-muted-foreground" />
            <span className="text-foreground font-medium">{product.name}</span>
          </span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <div className="aspect-square rounded-3xl overflow-hidden glass-card-premium border-gradient-premium shadow-2xl group">
              <motion.img
                key={selectedImage}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                src={images[selectedImage]?.image_url || "/placeholder.svg"}
                className="w-full h-full object-cover"
              />
            </div>
            {images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
                {images.map((img: any, i: number) => (
                  <button key={img.id} onClick={() => setSelectedImage(i)} className={`w-20 h-20 rounded-2xl overflow-hidden border-2 transition-all ${i === selectedImage ? "border-primary" : "border-transparent opacity-50"}`}>
                    <img src={img.image_url} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <h1 className="font-display text-2xl sm:text-4xl font-bold text-foreground mb-4">{product.name}</h1>
            <p className="text-muted-foreground text-sm mb-6">{product.short_description}</p>

            <div className="glass-card rounded-2xl p-6 mb-6">
              {isSqm ? (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">Valor por m²: <span className="text-highlight font-bold">R$ {pricePerSqm.toFixed(2)}</span></p>
                    <Badge variant="outline" className="bg-highlight/10 text-highlight"><Ruler className="w-3 h-3 mr-1" /> M²</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5"><Label className="text-xs">Largura (m)</Label><Input type="number" value={width} onChange={e => setWidth(e.target.value)} placeholder="0.00" /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Altura (m)</Label><Input type="number" value={height} onChange={e => setHeight(e.target.value)} placeholder="0.00" /></div>
                  </div>
                  {dimensionError && <div className="text-xs text-destructive bg-destructive/10 p-2 rounded-lg border border-destructive/20">{dimensionError}</div>}
                  {wNum > 0 && hNum > 0 && !dimensionError && (
                    <div className="flex items-center justify-between pt-2 border-t border-border/50">
                       <span className="text-sm text-muted-foreground">Área: {area.toFixed(2)}m²</span>
                       <span className="text-2xl font-black text-foreground">R$ {calculatedPrice.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                   {product.sale_price && <p className="text-sm text-muted-foreground line-through">R$ {Number(product.price).toFixed(2)}</p>}
                   <p className="text-3xl font-black text-foreground">R$ {calculatedPrice.toFixed(2)}</p>
                   <p className="text-xs text-muted-foreground font-bold">{selectedQuantity.toLocaleString()} unidades</p>
                </div>
              )}
              <div className="mt-4 pt-4 border-t border-border/50 flex flex-col gap-2">
                <p className="text-sm text-success font-semibold">Pagamento via PIX • Sem taxas</p>
                {product.estimated_days && <p className="text-sm text-muted-foreground flex items-center gap-2"><Clock className="w-4 h-4 text-highlight" /> Prazo: ~{product.estimated_days} dias úteis</p>}
              </div>
            </div>

            <div className="space-y-6 mb-8">
              {product.configuration_schema?.filter((it: any) => it.ui_type !== 'checkbox').map((item: any) => (
                <div key={item.id} className="space-y-2">
                  <Label className="text-sm font-bold">{item.label}</Label>
                  {item.ui_type === 'pills' ? (
                    <div className="flex flex-wrap gap-2">
                      {item.options.map((opt: any) => (
                        <button key={opt.name} onClick={() => setConfigValues(v => ({ ...v, [item.id]: opt.name }))} className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${configValues[item.id] === opt.name ? "bg-primary/10 border-primary text-primary" : "bg-background border-border hover:border-primary/50"}`}>{opt.name}</button>
                      ))}
                    </div>
                  ) : (
                    <div className="relative">
                      <select value={configValues[item.id] || ""} onChange={e => setConfigValues(v => ({ ...v, [item.id]: e.target.value }))} className="w-full h-12 rounded-xl border border-border bg-background px-4 text-sm appearance-none">
                        <option value="">Selecione um {item.label}</option>
                        {item.options.map((opt: any) => <option key={opt.name} value={opt.name}>{opt.name}</option>)}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    </div>
                  )}
                </div>
              ))}

              {product.configuration_schema?.filter((it: any) => it.ui_type === 'checkbox').map((item: any) => (
                 <div key={item.id} className="space-y-3">
                    <Label className="text-sm font-bold">{item.label}</Label>
                    <div className="bg-secondary/20 rounded-2xl p-4 space-y-3 border border-border/50">
                       {item.options.map((opt: any) => {
                          const current = (configValues[item.id] as string[] || []);
                          const isSel = current.includes(opt.name);
                          return (
                            <button key={opt.name} onClick={() => {
                              const next = isSel ? current.filter(x => x !== opt.name) : [...current, opt.name];
                              setConfigValues(v => ({...v, [item.id]: next}));
                            }} className="flex items-center justify-between w-full group">
                               <div className="flex items-center gap-3">
                                  <div className={`w-5 h-5 rounded border-2 transition-all flex items-center justify-center ${isSel ? "bg-primary border-primary" : "border-muted-foreground/30"}`}>
                                     {isSel && <Check className="w-3.5 h-3.5 text-white" strokeWidth={4} />}
                                  </div>
                                  <span className="text-sm font-medium">{opt.name}</span>
                               </div>
                               {opt.price_adj > 0 && <span className="text-xs font-bold text-primary">+ R$ {opt.price_adj.toFixed(2)}</span>}
                            </button>
                          );
                       })}
                    </div>
                 </div>
              ))}
            </div>

            {availableFinishings.length > 0 && (
              <div className="space-y-4 mb-8">
                <Separator />
                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Acabamentos Extras</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {availableFinishings.map(f => (
                    <button key={f.id} onClick={() => setSelectedFinishings(p => p.includes(f.id) ? p.filter(id => id !== f.id) : [...p, f.id])} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${selectedFinishings.includes(f.id) ? "bg-primary/5 border-primary" : "bg-secondary/30 border-border/50"}`}>
                       <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedFinishings.includes(f.id) ? "bg-primary border-primary" : "border-muted-foreground/30"}`}>
                             {selectedFinishings.includes(f.id) && <Plus className="w-3 h-3 text-white" strokeWidth={4} />}
                          </div>
                          <span className="text-sm font-bold">{f.name}</span>
                       </div>
                       <span className="text-xs font-black text-primary">+R$ {Number(f.price).toFixed(2)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!isSqm && (
              <div className="space-y-4 mb-8">
                <Label className="text-sm font-bold">Tabela de Quantidade</Label>
                <div className="grid grid-cols-4 gap-2">
                  {[25, 50, 100, 250, 500, 1000, 2500, 5000].map(qty => (
                    <button key={qty} onClick={() => setSelectedQuantity(qty)} className={`p-3 rounded-xl border text-center transition-all ${selectedQuantity === qty ? "bg-primary/10 border-primary text-primary font-bold shadow-sm" : "bg-background border-border hover:border-primary/30"}`}>
                       <div className="text-xs">{qty}</div>
                       <div className="text-[10px] opacity-60">un</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 mb-8">
               <Button onClick={handleAddToCart} disabled={!canAddToCart} variant="highlight" className="flex-1 h-14 font-black shadow-glow-sm"><ShoppingCart className="w-5 h-5 mr-2" /> ADICIONAR AO CARRINHO</Button>
               <Button onClick={() => { handleAddToCart(); if(canAddToCart) window.location.href="/checkout"; }} disabled={!canAddToCart} variant="hero" className="flex-1 h-14 bg-success hover:bg-success/90 text-white font-black">COMPRAR AGORA</Button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-8">
               {trustItems.map((it, i) => (
                 <div key={i} className="flex items-center gap-2.5 p-3 rounded-xl bg-secondary/50 border border-border/50">
                   <it.icon className="w-4 h-4 text-highlight" />
                   <span className="text-xs font-bold">{it.text}</span>
                 </div>
               ))}
            </div>

            {product.full_description && (
              <div className="mb-8">
                <h3 className="font-display font-bold text-lg mb-2">Descrição do Produto</h3>
                <div className="text-muted-foreground text-sm prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: sanitizeHTML(product.full_description) }} />
              </div>
            )}

            <div className="bg-card border border-border rounded-3xl p-6 mb-8">
               <h3 className="font-display font-bold flex items-center gap-2 mb-4"><Truck className="w-5 h-5 text-primary" /> Frete e Prazos</h3>
               <ShippingCalculator cartTotal={calculatedPrice} items={[{ id: product.id, productId: product.id, name: product.name, price: calculatedPrice, quantity: 1, shippingWeight: Number(product.shipping_weight) || 0.3, shippingHeight: Number(product.shipping_height) || 2, shippingWidth: Number(product.shipping_width) || 11, shippingLength: Number(product.shipping_length) || 16 }]} selected={selectedShipping} onSelect={setSelectedShipping} />
            </div>

            {faqs.length > 0 && (
               <div className="space-y-4">
                  <h3 className="font-display font-bold text-lg">Perguntas Frequentes</h3>
                  <Accordion type="single" collapsible className="w-full">
                    {faqs.map((faq, i) => (
                      <AccordionItem key={i} value={`faq-${i}`} className="border-b border-border">
                        <AccordionTrigger className="text-sm font-semibold py-4">{faq.question}</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground text-sm">{faq.answer}</AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
               </div>
            )}
          </motion.div>
        </div>

        <div className="mt-20 space-y-20">
           {(product.name?.toLowerCase().includes("cartão") || product.name?.toLowerCase().includes("logo")) && <ArtEditor productName={product.name} />}
           <SmartRecommendations productId={product.id} />
           <RelatedProducts productId={product.id} catalogNodeId={product.catalog_node_id} />
        </div>
      </article>

      {showSticky && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-xl border-t border-border z-50 animate-in slide-in-from-bottom duration-300">
           <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
              <div className="hidden md:block">
                 <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{product.name}</p>
                 <p className="text-xl font-black text-foreground">R$ {calculatedPrice.toFixed(2)}</p>
              </div>
              <Button onClick={handleAddToCart} disabled={!canAddToCart} variant="highlight" className="flex-1 md:flex-none h-12 px-8 font-black">CARRINHO • R$ {calculatedPrice.toFixed(2)}</Button>
           </div>
        </div>
      )}
    </PublicLayout>
  );
};

export default Produto;
