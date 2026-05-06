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
import { ShoppingCart, ArrowLeft, Shield, Clock, Award, Truck, Ruler, AlertTriangle, ChevronRight, Home, HelpCircle, Layers, FileDown, Palette, Plus, CheckCircle2, Check, ChevronDown, Package, Sparkles, ZoomIn } from "lucide-react";
import { motion } from "framer-motion";
import RelatedProducts from "@/components/product/RelatedProducts";
import SmartRecommendations from "@/components/product/SmartRecommendations";
import { ShareButtons } from "@/components/product/ShareButtons";
import BundleOffer from "@/components/product/BundleOffer";
import ArtEditor from "@/components/product/ArtEditor";
import { generateClientQuotePDF } from "@/lib/quote-client-pdf";
import SEOHead from "@/components/SEOHead";
import QuantityPriceTable from "@/components/product/QuantityPriceTable";
import ShippingCalculator, { type ShippingOption } from "@/components/shipping/ShippingCalculator";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  const [selectedImageOverride, setSelectedImageOverride] = useState<string | null>(null);
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
  const [selectedPresetId, setSelectedPresetId] = useState<string>("custom");
  const [quoteCustomer, setQuoteCustomer] = useState({ name: "", email: "", phone: "", cpfCnpj: "", company: "" });
  const [companySettings, setCompanySettings] = useState({ name: "", cnpj: "", address: "", phone: "", email: "", website: "" });
  const [showSticky, setShowSticky] = useState(false);
  const [zoomImage, setZoomImage] = useState<string | null>(null);
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
          .select("id, name, slug, short_description, full_description, specifications, price, sale_price, pricing_type, sale_unit, price_per_sqm, min_width, max_width, min_height, max_height, min_area, max_area, catalog_node_id, category_id, subcategory_id, is_active, is_featured, estimated_days, video_url, keywords, meta_title, meta_description, product_code, color_mode, default_quantity, sort_order, configuration_schema, shipping_weight, shipping_height, shipping_width, shipping_length, created_at, updated_at, categories(name, slug), subcategories(name), product_images(id, image_url, alt_text, sort_order)")
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
        const [{ data: faqData, error: faqErr }, { data: pfLinks, error: pfErr }] = await Promise.all([
          supabase.from("faq_items").select("question, answer").eq("product_id", data.id).eq("is_active", true).order("sort_order"),
          supabase.from("product_finishings").select("finishing_id").eq("product_id", data.id),
        ]);

        if (faqErr) console.error("FAQ Error:", faqErr);
        if (pfErr) console.error("Product Finishings Link Error:", pfErr);

        setFaqs(faqData ?? []);
        
        if (pfLinks && pfLinks.length > 0) {
          const finishingIds = pfLinks.map(l => l.finishing_id);
          const { data: finData, error: finErr } = await supabase
            .from("finishings")
            .select("*")
            .in("id", finishingIds);
          
          if (finErr) console.error("Finishings Data Error:", finErr);
          
          console.log("Acabamentos encontrados para este produto:", finData);
          setAvailableFinishings(finData ?? []);
        } else {
          console.log("Nenhum link de acabamento encontrado para este ID de produto:", data.id);
          setAvailableFinishings([]);
        }
        
        setSelectedFinishings([]);
        setFinishingQuantities({});

        const initConfig: Record<string, any> = {};
        if (Array.isArray(data.configuration_schema)) {
          data.configuration_schema.forEach((item: any) => {
             if (item.ui_type === 'checkbox') {
                 initConfig[item.id] = [];
             } else if (item.ui_type === 'hierarchy' && Array.isArray(item.groups)) {
                // Selecionar o grupo e a opção que resultam no menor preço
                let minP = Infinity;
                let bestG = "";
                let bestO = "";
                item.groups.forEach((g: any) => {
                  if (Array.isArray(g.options)) {
                    g.options.forEach((o: any) => {
                      const p = Number(o.price);
                      if (p < minP) { minP = p; bestG = g.id || g.name; bestO = o.name; }
                    });
                  }
                });
                if (bestG) {
                  initConfig[item.id + '_group'] = bestG;
                  initConfig[item.id] = bestO;
                }
             } else if (item.options && item.options.length > 0) {
                 // Para outros tipos, buscar o menor ajuste de preço
                 let bestO = item.options[0].name;
                 let minAdj = Number(item.options[0].price_adj) || 0;
                 item.options.forEach((o: any) => {
                   const adj = Number(o.price_adj) || 0;
                   if (adj < minAdj) { minAdj = adj; bestO = o.name; }
                 });
                 initConfig[item.id] = bestO;
             }
          });
        }
        setConfigValues(initConfig);
      }
      setLoading(false);
    };
    load();
  }, [slug]);

  useEffect(() => {
    // Look for 'qty' or other quantity-related fields in configValues
    // This ensures that 'selectedQuantity' updates when the user picks a different quantity from dropdowns
    const qtyVal = configValues['qty'];
    if (qtyVal) {
      const match = qtyVal.toString().match(/(\d+)/);
      if (match) {
        setSelectedQuantity(parseInt(match[1]));
      }
    } else {
      // Check for hierarchy selections or other fields that might contain quantity (e.g. "2000 UN")
      Object.entries(configValues).forEach(([key, val]) => {
        if (typeof val === 'string' && (val.includes(' UN') || val.includes('unidade'))) {
          const match = val.match(/(\d+)/);
          if (match) setSelectedQuantity(parseInt(match[1]));
        }
      });
    }
  }, [configValues]);

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
  
  const sqmPresets = useMemo(() => {
    if (!isSqm || !Array.isArray(product?.configuration_schema)) return [];
    const item = product.configuration_schema.find((it: any) => it.ui_type === 'sqm_presets');
    return item?.options || [];
  }, [isSqm, product?.configuration_schema]);

  const handlePresetChange = (presetName: string) => {
    setSelectedPresetId(presetName);
    if (presetName === "custom") {
      setWidth("");
      setHeight("");
    } else {
      const preset = sqmPresets.find((p: any) => p.name === presetName);
      if (preset) {
        setWidth(preset.width.toString());
        setHeight(preset.height.toString());
      }
    }
  };
  
  const finishingsTotal = useMemo(() => {
    return availableFinishings.filter(f => selectedFinishings.includes(f.id)).reduce((sum, f) => {
      const qty = finishingQuantities[f.id] || 1;
      const isUnit = f.pricing_mode === "per_unit";
      return sum + (Number(f.price) * (isUnit ? qty : 1));
    }, 0);
  }, [selectedFinishings, availableFinishings, finishingQuantities]);

  const baseUnitPrice = Number(product?.sale_price || product?.price) || 0;

  const calculatedPrice = useMemo(() => {
    let hasHierarchySelected = false;
    let hierarchyPriceTotal = 0;
    let otherAdjs = 0;

    // Separamos o que é hierarquia do que são outros ajustes
    if (product?.configuration_schema && Array.isArray(product.configuration_schema)) {
      product.configuration_schema.forEach((item: any) => {
        if (!item || !item.id) return;
        const val = configValues[item.id];
        if (!val) return;

        if (item.ui_type === 'hierarchy' && Array.isArray(item.groups)) {
          const groupId = configValues[item.id + '_group'];
          const group = item.groups.find((g: any) => g.id === groupId || g.name === groupId);
          if (group) {
            const opt = Array.isArray(group.options) ? group.options.find((o: any) => o.name === val) : null;
            if (opt) {
              hierarchyPriceTotal += (Number(opt.price) || 0);
              hasHierarchySelected = true;
            }
          }
        } else if (item.ui_type === 'checkbox' && Array.isArray(val)) {
            val.forEach((v: string) => {
              const opt = Array.isArray(item.options) ? item.options.find((o: any) => o.name === v) : null;
              if (opt) otherAdjs += (Number(opt.price_adj) || 0);
            });
        } else {
          const opt = Array.isArray(item.options) ? item.options.find((o: any) => o.name === val) : null;
          if (opt) otherAdjs += (Number(opt.price_adj) || 0);
        }
      });
    }

    let baseTotal = 0;
    if (hasHierarchySelected) {
      // Se houver hierarquia selecionada, ela define o preço base (substituindo o demonstrativo)
      baseTotal = hierarchyPriceTotal;
    } else if (isSqm) {
      baseTotal = (area * pricePerSqm) * selectedQuantity;
    } else {
      // Preço demonstrativo/base com descontos de quantidade (se não for hierarquia)
      baseTotal = baseUnitPrice * (selectedQuantity >= 1000 ? 0.8 : selectedQuantity >= 500 ? 0.9 : 1);
    }

    let finalTotal = baseTotal + otherAdjs + finishingsTotal;

    // Fallback para produtos simples sem configurações
    if (finalTotal <= 0 && !isSqm && !hasHierarchySelected) {
      finalTotal = baseUnitPrice * selectedQuantity;
    }

    return Number(finalTotal.toFixed(2));
  }, [isSqm, area, pricePerSqm, baseUnitPrice, selectedQuantity, product?.configuration_schema, configValues, finishingsTotal]);

  useEffect(() => {
    if (!product?.configuration_schema || !Array.isArray(product.configuration_schema)) return;
    
    let foundImage: string | null = null;
    
    product.configuration_schema.forEach((item: any) => {
        if (!item || !item.id) return;
        const val = configValues[item.id];
        if (!val) return;

        if (item.ui_type === 'hierarchy' && Array.isArray(item.groups)) {
          const groupId = configValues[item.id + '_group'];
          const group = item.groups.find((g: any) => g.id === groupId || g.name === groupId);
          if (group) {
            const opt = Array.isArray(group.options) ? group.options.find((o: any) => o.name === val) : null;
            if (opt?.image_url) foundImage = opt.image_url;
            else if (group.image_url) foundImage = group.image_url;
          }
        } else {
          const opt = Array.isArray(item.options) ? item.options.find((o: any) => o.name === val) : null;
          if (opt?.image_url) foundImage = opt.image_url;
        }
    });

    if (foundImage) {
        setSelectedImageOverride(foundImage);
    } else {
        setSelectedImageOverride(null);
    }
  }, [configValues, product?.configuration_schema]);

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
      .map(f => {
        const qty = finishingQuantities[f.id] || 1;
        return f.pricing_mode === "per_unit" ? `${f.name} (${qty}x)` : f.name;
      });

    const configDetails = product.configuration_schema?.map((item: any) => {
      const val = configValues[item.id];
      if (!val) return null;
      return `${item.label}: ${Array.isArray(val) ? val.join(", ") : val}`;
    }).filter(Boolean);

    addItem({
      productId: product.id,
      name: product.name + (!isSqm ? ` (${selectedQuantity} un)` : ""),
      price: calculatedPrice,
      quantity: selectedQuantity,
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
      <SEOHead title={product.meta_title || product.name} description={product.meta_description || product.short_description} />
      
      <article className="py-12 container mx-auto px-4 max-w-6xl mt-6 lg:mt-10">
        <nav className="flex items-center gap-1.5 text-sm mb-10 flex-wrap">
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
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 lg:sticky lg:top-24 h-fit">
            <div className="aspect-square rounded-3xl overflow-hidden glass-card-premium border-gradient-premium shadow-2xl group relative">
              <motion.img
                key={selectedImageOverride || selectedImage}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                src={selectedImageOverride || images[selectedImage]?.image_url || "/placeholder.svg"}
                className="w-full h-full object-cover cursor-pointer"
                onClick={() => setZoomImage(selectedImageOverride || images[selectedImage]?.image_url || "/placeholder.svg")}
              />
              <button
                onClick={() => setZoomImage(selectedImageOverride || images[selectedImage]?.image_url || "/placeholder.svg")}
                className="absolute top-4 right-4 w-10 h-10 bg-black/50 hover:bg-black/70 text-white rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ZoomIn className="w-5 h-5" />
              </button>
            </div>
            {images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
                {images.map((img: any, i: number) => (
                  <button key={img.id} onClick={() => { setSelectedImage(i); setSelectedImageOverride(null); }} className={`w-20 h-20 rounded-2xl overflow-hidden border-2 transition-all ${i === selectedImage && !selectedImageOverride ? "border-primary" : "border-transparent opacity-50"}`}>
                    <img src={img.image_url} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <h1 className="font-display text-2xl sm:text-4xl font-bold text-foreground mb-4">{product.name}</h1>
            <p className="text-muted-foreground text-sm mb-6">{product.short_description}</p>

            <ShareButtons
              url={`${SITE_URL}/loja/${product.slug}`}
              title={product.name}
              description={product.short_description}
            />


            <div className="glass-card rounded-2xl p-6 mb-6">
              {isSqm ? (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">Valor por m²: <span className="text-highlight font-bold">R$ {pricePerSqm.toFixed(2)}</span></p>
                    <Badge variant="outline" className="bg-highlight/10 text-highlight"><Ruler className="w-3 h-3 mr-1" /> M²</Badge>
                  </div>

                  {sqmPresets.length > 0 && (
                    <div className="space-y-2">
                       <Label className="text-xs uppercase font-black tracking-widest text-muted-foreground">Tamanho</Label>
                       <select 
                        value={selectedPresetId} 
                        onChange={(e) => handlePresetChange(e.target.value)}
                        className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                       >
                         <option value="custom">Medida Personalizada (Sob Medida)</option>
                         {sqmPresets.map((p: any) => (
                           <option key={p.name} value={p.name}>{p.name} ({p.width}x{p.height}m)</option>
                         ))}
                       </select>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Largura (m)</Label>
                      <Input 
                        type="number" 
                        value={width} 
                        onChange={e => setWidth(e.target.value)} 
                        placeholder="0.00" 
                        disabled={selectedPresetId !== "custom"}
                        className={selectedPresetId !== "custom" ? "bg-muted font-bold" : ""}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Altura (m)</Label>
                      <Input 
                        type="number" 
                        value={height} 
                        onChange={e => setHeight(e.target.value)} 
                        placeholder="0.00" 
                        disabled={selectedPresetId !== "custom"}
                        className={selectedPresetId !== "custom" ? "bg-muted font-bold" : ""}
                      />
                    </div>
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
              </div>

            {/* Interactive Configurator */}
            <div className="space-y-8 mb-10">
              {Array.isArray(product.configuration_schema) && product.configuration_schema.map((item: any, itemIdx: number) => {
                if (!item || !item.label) return null;
                
                // --- CUSTOM HIERARCHICAL RENDERING ---
                if (item.ui_type === 'hierarchy' && Array.isArray(item.groups)) {
                  const selectedGroupId = configValues[item.id + '_group'];
                  const selectedGroup = item.groups.find((g: any) => g.id === selectedGroupId || g.name === selectedGroupId);
                  const selectedOptionName = configValues[item.id];

                  return (
                    <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                      {/* Step 1: Group Selection (e.g. Cores) */}
                      <div className="space-y-4">
                        <Label className="text-sm font-black uppercase tracking-widest text-foreground/70 flex items-center gap-2">
                          <Palette className="w-4 h-4 text-primary" /> {item.label} (Escolha a Cor)
                        </Label>
                        <div className="space-y-3">
                          <Select 
                            value={selectedGroupId || ""} 
                            onValueChange={(val) => {
                              setConfigValues(prev => ({ 
                                ...prev, 
                                [item.id + '_group']: val,
                                [item.id]: "" 
                              }));
                            }}
                          >
                            <SelectTrigger className="w-full h-12 rounded-xl border-2 border-border bg-card font-bold hover:border-primary/40 transition-all text-foreground">
                              <SelectValue placeholder={`Selecione ${item.label}...`} />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-border bg-popover shadow-xl">
                              {item.groups.map((group: any) => (
                                <SelectItem key={group.id} value={group.id || group.name} className="font-medium focus:bg-primary/5 focus:text-primary py-3">
                                  {group.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Step 2: Options Selection (e.g. Quantidades) as a LIST */}
                      {selectedGroup && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4 pt-4 border-t border-border/50">
                          <Label className="text-sm font-black uppercase tracking-widest text-foreground/70 flex items-center gap-2">
                            <Package className="w-4 h-4 text-primary" /> Opções Disponíveis para {selectedGroup.name}
                          </Label>
                          <div className="space-y-3">
                            <Select 
                              value={selectedOptionName || ""} 
                              onValueChange={(val) => setConfigValues(prev => ({ ...prev, [item.id]: val }))}
                            >
                              <SelectTrigger className="w-full h-12 rounded-xl border-2 border-highlight/30 bg-card font-bold hover:border-highlight/60 transition-all text-foreground">
                                <SelectValue placeholder="Selecione a Tiragem/Quantidade..." />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl border-highlight/20 bg-popover shadow-xl">
                                {selectedGroup.options.map((opt: any, optIdx: number) => (
                                  <SelectItem key={optIdx} value={opt.name} className="py-3 focus:bg-highlight/5 focus:text-highlight">
                                    <div className="flex items-center justify-between w-full gap-8 min-w-[200px]">
                                      <span className="font-bold">{opt.name}</span>
                                      <span className="font-black text-highlight">R$ {Number(opt.price).toFixed(2)}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  );
                }

                // --- ORIGINAL RENDERING FOR STANDARD OPTIONS ---
                const options = Array.isArray(item.options) ? item.options : [];
                const combinations = (product.configuration_schema as any[]).find(it => it.combinations)?.combinations;

                // filtering logic for separated attributes (qty/cores)
                let filteredOptions = options;
                if (combinations) {
                  const currentQty = configValues['qty'] || (product.configuration_schema.find((it: any) => it.id === 'qty')?.options[0]?._val);
                  const currentCore = configValues['cores'] || (product.configuration_schema.find((it: any) => it.id === 'cores')?.options[0]?._val);

                  if (item.id === 'qty' && currentCore) {
                    filteredOptions = options.filter(opt => combinations.some((combo: any) => combo.q === opt._val && combo.c === currentCore));
                  } else if (item.id === 'cores' && currentQty) {
                    filteredOptions = options.filter(opt => combinations.some((combo: any) => combo.q === currentQty && combo.c === opt._val));
                  }
                }
                
                return (
                  <motion.div 
                    key={item.id || itemIdx} 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: itemIdx * 0.1 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-black uppercase tracking-widest text-foreground/70 flex items-center gap-2">
                        {item.id === 'qty' ? <Package className="w-4 h-4 text-primary" /> : <Layers className="w-4 h-4 text-primary" />}
                        {item.label}
                      </Label>
                      {configValues[item.id] && (
                        <Badge variant="outline" className="text-[10px] font-bold border-primary/20 text-primary bg-primary/5">
                          Selecionado
                        </Badge>
                      )}
                    </div>

                    {item.ui_type === 'checkbox' ? (
                      <div className="bg-secondary/20 rounded-2xl p-4 space-y-3 border border-border/50">
                        {filteredOptions.map((opt: any) => {
                          if (!opt || !opt.name) return null;
                          const current = (configValues[item.id] as string[] || []);
                          const isSel = current.includes(opt.name);
                          return (
                            <button 
                              key={opt.name} 
                              onClick={() => {
                                const next = isSel ? current.filter(x => x !== opt.name) : [...current, opt.name];
                                setConfigValues(v => ({...v, [item.id]: next}));
                              }} 
                              className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all group ${isSel ? "bg-primary/5 border-primary shadow-glow-sm" : "bg-card border-border hover:border-primary/30"}`}
                            >
                               <div className="flex items-center gap-2">
                                  <div className={`w-4 h-4 rounded border-2 transition-all flex items-center justify-center ${isSel ? "bg-primary border-primary" : "border-muted-foreground/30 group-hover:border-primary/50"}`}>
                                     {isSel && <Check className="w-3 h-3 text-white" strokeWidth={4} />}
                                  </div>
                                  <span className={`text-[12px] transition-colors ${isSel ? "font-bold text-foreground" : "text-muted-foreground group-hover:text-foreground"}`}>{opt.name}</span>
                               </div>
                               {opt.price_adj > 0 && <span className="text-[10px] font-black text-primary">+ R$ {Number(opt.price_adj).toFixed(2)}</span>}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <Select 
                          value={configValues[item.id] || ""} 
                          onValueChange={(val) => setConfigValues(v => ({ ...v, [item.id]: val }))}
                        >
                          <SelectTrigger className="w-full h-12 rounded-xl border-2 border-border bg-card font-bold hover:border-primary/40 transition-all text-foreground">
                            <SelectValue placeholder={`Selecione ${item.label}...`} />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-border bg-popover shadow-xl">
                            {filteredOptions.map((opt: any) => {
                              if (!opt || !opt.name) return null;
                              const costText = opt.price_adj > 0 ? ` (+ R$ ${Number(opt.price_adj).toFixed(2)})` : "";
                              return (
                                <SelectItem key={opt.name} value={opt.name} className="py-3 focus:bg-primary/5 focus:text-primary">
                                  {opt.name}{costText}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {availableFinishings.length > 0 && (
              <div className="space-y-6 mb-12 bg-primary/5 p-6 rounded-3xl border border-primary/10">
                <Separator className="opacity-50 mb-2" />
                <Label className="text-lg font-black uppercase tracking-widest text-foreground flex items-center gap-3">
                  <Palette className="w-5 h-5 text-primary" /> Personalize seu Acabamento
                </Label>
                <p className="text-xs text-muted-foreground -mt-2">Escolha as opções extras para valorizar seu produto.</p>
                <div className="flex flex-col gap-8 mt-4">
                  {Object.entries(
                    availableFinishings.reduce((acc: any, f: any) => {
                      const group = f.group_name || "Avulsos";
                      if (!acc[group]) acc[group] = [];
                      acc[group].push(f);
                      return acc;
                    }, {})
                  ).map(([group, items]: [string, any]) => (
                    <div key={group} className="space-y-4">
                      {group !== "Avulsos" && (
                        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest bg-secondary/50 px-3 py-1 rounded-full w-fit">
                          {group} (Selecione uma opção)
                        </p>
                      )}
                      <div className="flex flex-col gap-3">
                        {items.map((f: any) => {
                          const isSelected = selectedFinishings.includes(f.id);
                          const isUnit = f.pricing_mode === "per_unit";
                          const currentQty = finishingQuantities[f.id] || 1;
                          const hasGroup = group !== "Avulsos";

                          return (
                            <div key={f.id} className="space-y-3">
                              <button 
                                onClick={() => {
                                  if (isSelected) {
                                    setSelectedFinishings(p => p.filter(id => id !== f.id));
                                  } else {
                                    if (hasGroup) {
                                      // Deselect all others in the same group
                                      const groupIds = items.map((i: any) => i.id);
                                      setSelectedFinishings(p => [...p.filter(id => !groupIds.includes(id)), f.id]);
                                    } else {
                                      // Smart check for common conflicting keywords (Bastão, Ilhós, etc)
                                      const keywords = ["bastão", "ilhós", "verniz", "furo"];
                                      const foundKeyword = keywords.find(k => f.name.toLowerCase().includes(k));
                                      
                                      if (foundKeyword) {
                                        // Deselect any other item that shares this keyword
                                        setSelectedFinishings(p => [
                                          ...p.filter(id => {
                                            const other = availableFinishings.find(af => af.id === id);
                                            return !other?.name.toLowerCase().includes(foundKeyword);
                                          }), 
                                          f.id
                                        ]);
                                      } else {
                                        setSelectedFinishings(p => [...p, f.id]);
                                      }
                                    }
                                    
                                    if (isUnit && !finishingQuantities[f.id]) {
                                      setFinishingQuantities(prev => ({ ...prev, [f.id]: 1 }));
                                    }
                                  }
                                }} 
                                className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all group ${isSelected ? "bg-primary/5 border-primary shadow-glow-sm" : "bg-secondary/30 border-border/50 hover:border-primary/30"}`}
                              >
                                <div className="flex items-center gap-3">
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? "bg-primary border-primary" : "border-muted-foreground/30 group-hover:border-primary/50"}`}>
                                      {isSelected && (isUnit ? <Check className="w-3 h-3 text-white" strokeWidth={4} /> : <Plus className="w-3 h-3 text-white" strokeWidth={4} />)}
                                    </div>
                                    <span className={`text-[13px] transition-colors ${isSelected ? "font-bold text-foreground" : "text-muted-foreground group-hover:text-foreground"}`}>{f.name}</span>
                                </div>
                                <span className="text-[11px] font-black text-primary">
                                  + R$ {Number(f.price).toFixed(2)}{isUnit && "/un"}
                                </span>
                              </button>

                              {isSelected && isUnit && (
                                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between px-4 py-3 bg-white rounded-xl border border-primary/20 ml-8">
                                  <span className="text-xs font-bold text-muted-foreground">Informe a quantidade:</span>
                                  <div className="flex items-center gap-4">
                                    <button 
                                      onClick={() => setFinishingQuantities(prev => ({ ...prev, [f.id]: Math.max(1, (prev[f.id] || 1) - 1) }))}
                                      className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-primary hover:text-white transition-colors"
                                    >
                                      -
                                    </button>
                                    <span className="text-sm font-black w-6 text-center">{currentQty}</span>
                                    <button 
                                      onClick={() => setFinishingQuantities(prev => ({ ...prev, [f.id]: (prev[f.id] || 1) + 1 }))}
                                      className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-primary hover:text-white transition-colors"
                                    >
                                      +
                                    </button>
                                  </div>
                                </motion.div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity Selector for SQM or standard products */}
            {(isSqm || (!product.name?.toLowerCase().includes("cartão") &&
              !product.configuration_schema?.some((it: any) => it.label?.toLowerCase().includes("quant") || it.ui_type === 'hierarchy'))) && (
              <div className="space-y-4 mb-10">
                <Label className="text-sm font-black uppercase tracking-widest text-foreground/70 flex items-center gap-2">
                  <Package className="w-4 h-4 text-primary" /> Quantidade de Itens
                </Label>
                
                {isSqm ? (
                  <div className="flex items-center gap-4 bg-secondary/30 p-4 rounded-2xl border border-border/50 max-w-[200px]">
                    <button 
                      onClick={() => setSelectedQuantity(prev => Math.max(1, prev - 1))}
                      className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center hover:bg-primary hover:text-white transition-all font-bold"
                    >
                      -
                    </button>
                    <span className="text-lg font-black w-8 text-center">{selectedQuantity}</span>
                    <button 
                      onClick={() => setSelectedQuantity(prev => prev + 1)}
                      className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center hover:bg-primary hover:text-white transition-all font-bold"
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2.5">
                    {[25, 50, 100, 250, 500, 1000, 2500, 5000].map(qty => (
                      <button 
                        key={qty} 
                        onClick={() => setSelectedQuantity(qty)} 
                        className={`p-3.5 rounded-xl border text-center transition-all ${selectedQuantity === qty ? "bg-primary border-primary text-white font-bold shadow-glow-sm scale-105" : "bg-secondary/30 border-border hover:border-primary/30 text-muted-foreground hover:text-foreground"}`}
                      >
                         <div className="text-[13px]">{qty}</div>
                         <div className={`text-[9px] uppercase font-bold tracking-tighter ${selectedQuantity === qty ? "text-white/70" : "opacity-40"}`}>un</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 mb-8">
               <Button onClick={handleAddToCart} disabled={!canAddToCart} variant="highlight" className="flex-1 h-14 font-black shadow-glow-sm"><ShoppingCart className="w-5 h-5 mr-2" /> ADICIONAR AO CARRINHO</Button>
               <Button onClick={() => { handleAddToCart(); if(canAddToCart) window.location.href="/checkout"; }} disabled={!canAddToCart} variant="hero" className="flex-1 h-14 bg-success hover:bg-success/90 text-white font-black">COMPRAR AGORA</Button>
            </div>

            <BundleOffer currentProduct={{ 
              id: product.id, 
              name: product.name, 
              price: product.price, 
              calculatedPrice: calculatedPrice, 
              mainImage: images.sort((a: any, b: any) => a.sort_order - b.sort_order)[0]?.image_url 
            }} />

            <div className="grid grid-cols-2 gap-3 mb-6 mt-8">
               {trustItems.map((it, i) => (
                 <div key={i} className="flex items-center gap-2 p-2 rounded-xl bg-secondary/30 border border-border/30">
                   <it.icon className="w-3.5 h-3.5 text-highlight" />
                   <span className="text-[10px] font-bold">{it.text}</span>
                 </div>
               ))}
            </div>
            
            <div className="flex flex-col gap-2 mb-8 bg-success/5 p-4 rounded-2xl border border-success/10">
                <p className="text-xs text-success font-black uppercase tracking-widest flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Pagamento via PIX • Sem taxas
                </p>
                {product.estimated_days && (
                    <p className="text-xs text-muted-foreground flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-highlight" /> Produção estimada: ~{product.estimated_days} dias úteis
                    </p>
                )}
            </div>

            {product.specifications && (
              <div className="mb-8">
                <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
                  <FileDown className="w-5 h-5 text-primary" /> Ficha Técnica
                </h3>
                <div className="text-foreground/80 text-sm prose prose-sm max-w-none bg-secondary/30 rounded-3xl p-8 border border-border/50 break-words whitespace-pre-line overflow-hidden" dangerouslySetInnerHTML={{ __html: sanitizeHTML(product.specifications) }} />
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

        <div className="mt-12 space-y-16">
           {product.full_description && (
             <section className="bg-card rounded-[32px] p-8 md:p-12 border border-border/50 shadow-sm overflow-hidden">
               <h2 className="font-display font-bold text-2xl mb-8 flex items-center gap-3">
                 <Sparkles className="w-6 h-6 text-primary" /> Informações Complementares
               </h2>
               <div 
                 className="prose prose-invert prose-sm md:prose-base max-w-none prose-headings:font-display prose-headings:font-bold prose-p:leading-relaxed prose-img:rounded-2xl break-words overflow-hidden whitespace-pre-line" 
                 dangerouslySetInnerHTML={{ __html: sanitizeHTML(product.full_description) }} 
               />
               </section>
           )}
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
    {/* Image Zoom Modal */}
	      <Dialog open={!!zoomImage} onOpenChange={() => setZoomImage(null)}>
	        <DialogContent className="max-w-[90vw] max-h-[90vh] w-auto h-auto p-0 overflow-hidden bg-background/95 backdrop-blur-xl border-border">
	          <DialogHeader className="sr-only">
	            <DialogTitle>Zoom da Imagem - {product.name}</DialogTitle>
	          </DialogHeader>
	          <div className="relative w-full h-full flex items-center justify-center p-4">
	            <img
	              src={zoomImage || ""}
	              alt={`Zoom: ${product.name}`}
	              className="max-w-full max-h-[80vh] object-contain rounded-xl"
	            />
	            <button
	              onClick={() => setZoomImage(null)}
	              className="absolute top-4 right-4 w-10 h-10 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center text-xl transition-colors"
	            >
	              ✕
	            </button>
	          </div>
	        </DialogContent>
	      </Dialog>
    </PublicLayout>
  );
};

export default Produto;
