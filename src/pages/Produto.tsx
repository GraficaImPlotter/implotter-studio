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
import { ShoppingCart, ArrowLeft, Shield, Clock, Award, Truck, Ruler, AlertTriangle, ChevronRight, Home, HelpCircle, Layers, FileDown, Palette, Plus, CheckCircle2 } from "lucide-react";
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

// Dimension state for per_sqm products
// ... earlier imports


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
  // Dimension state for per_sqm products
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  // Quantity multiplier for fixed-price products
  const [quantityMultiplier, setQuantityMultiplier] = useState(1);
  // Quote PDF dialog state
  const [quoteDialogOpen, setQuoteDialogOpen] = useState(false);
  const [quoteCustomer, setQuoteCustomer] = useState({ name: "", email: "", phone: "", cpfCnpj: "", company: "" });
  const [companySettings, setCompanySettings] = useState({ name: "", cnpj: "", address: "", phone: "", email: "", website: "" });
  const [showSticky, setShowSticky] = useState(false);
  const [activeTab, setActiveTab] = useState("preço");
  const [configValues, setConfigValues] = useState<Record<string, any>>({});
  const [selectedShipping, setSelectedShipping] = useState<ShippingOption | null>(null);

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
      setImages(data?.product_images?.sort((a: any, b: any) => a.sort_order - b.sort_order) || []);
      setCatalogNodes((nodes ?? []) as CatalogNode[]);
      // Load product-specific FAQs and finishings
      if (data?.id) {
        const [{ data: faqData }, { data: pfData }] = await Promise.all([
          supabase.from("faq_items").select("question, answer").eq("product_id", data.id).eq("is_active", true).order("sort_order"),
          supabase.from("product_finishings").select("finishing_id, finishings(id, name, price, pricing_mode)").eq("product_id", data.id),
        ]);
        setFaqs(faqData ?? []);
        setAvailableFinishings((pfData ?? []).map((pf: any) => pf.finishings).filter(Boolean));
        setSelectedFinishings([]);
        setFinishingQuantities({});
        setFinishingQuantities({});
      }
      setLoading(false);
    };
    load();
  }, [slug]);

  // Load company settings for PDF
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


  // SEO and Meta Tags are now handled via SEOHead component below

  const isSqm = product?.pricing_type === "per_sqm";
  const pricePerSqm = Number(product?.price_per_sqm) || 0;
  const wNum = parseFloat(width) || 0;
  const hNum = parseFloat(height) || 0;
  const area = wNum * hNum;
  const basePrice = isSqm ? area * pricePerSqm : Number(product?.price) || 0;
  const finishingsTotal = useMemo(() => {
    return availableFinishings.filter(f => selectedFinishings.includes(f.id)).reduce((sum, f) => {
      if (f.pricing_mode === "per_unit") {
        return sum + Number(f.price) * (finishingQuantities[f.id] || 0);
      }
      return sum + Number(f.price);
    }, 0);
  }, [selectedFinishings, availableFinishings, finishingQuantities]);
  const defaultQty = Number(product?.default_quantity) || 1;
  const selectedQuantity = defaultQty * quantityMultiplier;
  const baseUnitPrice = Number(product?.sale_price || product?.price) || 0;

  // New Dynamic Price Calculation
  const dynamicTotal = useMemo(() => {
    let total = isSqm ? area * pricePerSqm : baseUnitPrice * quantityMultiplier;
    
    // Add selections from configSchema
    if (product?.configuration_schema) {
      product.configuration_schema.forEach((item: any) => {
        const val = configValues[item.id];
        if (item.type === "select" && val) {
          const opt = item.options.find((o: any) => o.name === val);
          if (opt) total += (opt.price_adj || 0);
        } else if (item.type === "counter" && val) {
          total += (item.unit_price || 0) * val;
        }
      });
    }

    return total + finishingsTotal;
  }, [isSqm, area, pricePerSqm, baseUnitPrice, quantityMultiplier, product?.configuration_schema, configValues, finishingsTotal]);

  const calculatedPrice = dynamicTotal;

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
    if (area > maxA) return `As medidas informadas ultrapassam o limite máximo permitido para este produto (${maxA}m²).`;
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
      return `${item.label}: ${val}${item.type === "counter" ? " un" : ""}`;
    }).filter(Boolean);

    addItem({
      productId: product.id,
      name: product.name + (defaultQty > 1 && quantityMultiplier > 1 ? ` (${selectedQuantity} un)` : ""),
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

  // Build breadcrumb from catalog_node_id
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

  // JSON-LD Product schema
  const productSchema = useMemo(() => {
    if (!product) return null;
    const price = product.sale_price || product.price;
    return {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      description: product.meta_description || product.short_description || "",
      image: images.map(img => img.image_url),
      url: `${SITE_URL}/loja/${product.slug}`,
      sku: product.id,
      brand: { "@type": "Brand", name: "Gráfica ImPlotter" },
      offers: {
        "@type": "Offer",
        url: `${SITE_URL}/loja/${product.slug}`,
        priceCurrency: "BRL",
        price: Number(price).toFixed(2),
        availability: "https://schema.org/InStock",
        seller: { "@type": "Organization", name: "Gráfica ImPlotter" },
      },
      ...(product.keywords && { keywords: product.keywords }),
    };
  }, [product, images]);

  // JSON-LD BreadcrumbList
  const breadcrumbSchema = useMemo(() => {
    if (!product) return null;
    const items: any[] = [
      { "@type": "ListItem", position: 1, name: "Loja", item: `${SITE_URL}/loja` },
    ];
    nodePath.forEach((node, i) => {
      items.push({ "@type": "ListItem", position: i + 2, name: node.name, item: `${SITE_URL}/loja?node=${node.id}` });
    });
    items.push({ "@type": "ListItem", position: items.length + 1, name: product.name, item: `${SITE_URL}/loja/${product.slug}` });
    return { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items };
  }, [product, nodePath]);

  // JSON-LD FAQPage schema
  const faqSchema = useMemo(() => {
    if (!faqs.length) return null;
    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map(f => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer },
      })),
    };
  }, [faqs]);

  if (loading) {
    return (
      <PublicLayout>
        <div className="py-8">
          <div className="container mx-auto px-4 max-w-6xl">
            {/* Breadcrumb skeleton */}
            <div className="flex items-center gap-2 mb-8">
              <div className="h-4 w-12 bg-muted rounded animate-pulse" />
              <div className="h-4 w-4 bg-muted rounded animate-pulse" />
              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
              <div className="h-4 w-4 bg-muted rounded animate-pulse" />
              <div className="h-4 w-32 bg-muted rounded animate-pulse" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Image skeleton */}
              <div>
                <div className="aspect-square rounded-2xl bg-muted animate-pulse" />
                <div className="flex gap-3 mt-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="w-20 h-20 rounded-xl bg-muted animate-pulse" />
                  ))}
                </div>
              </div>
              {/* Details skeleton */}
              <div className="space-y-4">
                <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                <div className="h-8 w-3/4 bg-muted rounded animate-pulse" />
                <div className="h-4 w-full bg-muted rounded animate-pulse" />
                <div className="h-4 w-2/3 bg-muted rounded animate-pulse" />
                <div className="rounded-2xl bg-muted/50 border border-border p-6 space-y-4 mt-6">
                  <div className="h-8 w-1/3 bg-muted rounded animate-pulse" />
                  <div className="h-12 w-full bg-muted rounded-xl animate-pulse" />
                </div>
                <div className="flex gap-3 mt-4">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-16 flex-1 bg-muted rounded-xl animate-pulse" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (!product) {
    return (
      <PublicLayout>
        <div className="py-20 text-center">
          <h1 className="font-display text-3xl font-bold text-foreground mb-4">Produto não encontrado</h1>
          <Button variant="hero" asChild><Link to="/loja">Voltar à Loja</Link></Button>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <SEOHead
        title={product.meta_title || product.name}
        description={product.meta_description || product.short_description}
        canonical={`/loja/${product.slug}`}
        ogImage={images[0]?.image_url}
        ogType="product"
        jsonLd={[productSchema, breadcrumbSchema, faqSchema].filter(Boolean)}
      />

      <article itemScope itemType="https://schema.org/Product">
        <section className="py-8">
          <div className="container mx-auto px-4 max-w-6xl">
            {/* Breadcrumb with structured data */}
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm mb-8 flex-wrap" itemScope itemType="https://schema.org/BreadcrumbList">
              <span itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
                <Link to="/loja" itemProp="item" className="text-muted-foreground hover:text-highlight transition-colors flex items-center gap-1">
                  <Home className="w-3.5 h-3.5" /> <span itemProp="name">Loja</span>
                </Link>
                <meta itemProp="position" content="1" />
              </span>
              {nodePath.map((node, i) => (
                <span key={node.id} className="flex items-center gap-1.5" itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
                  <ChevronRight className="w-3 h-3 text-muted-foreground" />
                  <Link to={`/loja?node=${node.id}`} itemProp="item" className="text-muted-foreground hover:text-highlight transition-colors">
                    <span itemProp="name">{node.name}</span>
                  </Link>
                  <meta itemProp="position" content={String(i + 2)} />
                </span>
              ))}
              <span className="flex items-center gap-1.5" itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
                <ChevronRight className="w-3 h-3 text-muted-foreground" />
                <span className="text-foreground font-medium" itemProp="name">{product.name}</span>
                <meta itemProp="position" content={String(nodePath.length + 2)} />
              </span>
            </nav>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Images */}
              <motion.div 
                initial={{ opacity: 0, x: -30 }} 
                animate={{ opacity: 1, x: 0 }} 
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className="lg:sticky lg:top-24 h-fit"
              >
                <div className="relative aspect-square rounded-3xl overflow-hidden glass-card-premium border-gradient-premium shadow-2xl mb-4 group">
                  <motion.img
                    key={selectedImage}
                    initial={{ opacity: 0, scale: 1.1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    src={images[selectedImage]?.image_url || "/placeholder.svg"}
                    alt={images[selectedImage]?.alt_text || `${product.name} - Gráfica ImPlotter`}
                    itemProp="image"
                    decoding="async"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                </div>
                
                {images.length > 1 && (
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
                    {images.map((img: any, i: number) => (
                      <button
                        key={img.id}
                        onClick={() => setSelectedImage(i)}
                        className={`relative w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 transition-all duration-300 ${i === selectedImage ? "ring-2 ring-primary shadow-glow-sm scale-95" : "opacity-50 hover:opacity-100 border border-white/10"}`}
                      >
                        <img 
                          src={img.image_url} 
                          alt={img.alt_text || `${product.name} - imagem ${i + 1}`} 
                          className="w-full h-full object-cover" 
                          loading="lazy"
                          decoding="async"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>

              {/* Details */}
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
                {/* Catalog path badge */}
                {nodePath.length > 0 && (
                  <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                    {nodePath.map((node, i) => (
                      <span key={node.id} className="flex items-center gap-1.5">
                        {i > 0 && <span className="text-muted-foreground text-xs">›</span>}
                        <span className={`text-xs ${i === 0 ? "text-highlight font-semibold" : "text-muted-foreground"}`}>
                          {node.name}
                        </span>
                      </span>
                    ))}
                  </div>
                )}

                <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mt-1 mb-2" itemProp="name">{product.name}</h1>
                {product.short_description && (
                  <p className="text-muted-foreground text-sm mb-6 leading-relaxed" itemProp="description">{product.short_description}</p>
                )}

                {/* Hidden structured data */}
                <meta itemProp="sku" content={product.id} />
                <span itemProp="brand" itemScope itemType="https://schema.org/Brand">
                  <meta itemProp="name" content="Gráfica ImPlotter" />
                </span>

                {/* Price card */}
                <div className="glass-card rounded-2xl p-6 mb-6 space-y-4" itemProp="offers" itemScope itemType="https://schema.org/Offer">
                  <meta itemProp="priceCurrency" content="BRL" />
                  <meta itemProp="availability" content="https://schema.org/InStock" />
                  <link itemProp="url" href={`${SITE_URL}/loja/${product.slug}`} />

                  {isSqm ? (
                    <>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Valor por metro quadrado</p>
                          <p className="font-display text-2xl font-bold text-highlight">R$ {pricePerSqm.toFixed(2)}/m²</p>
                        </div>
                        <div className="flex items-center gap-1.5 bg-highlight/10 text-highlight px-3 py-1.5 rounded-full text-xs font-semibold">
                          <Ruler className="w-3.5 h-3.5" /> Venda por m²
                        </div>
                      </div>
                      <meta itemProp="price" content={String(pricePerSqm)} />
                      <div className="bg-secondary/50 rounded-xl p-4 space-y-3 border border-border">
                        <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                          <Ruler className="w-4 h-4 text-highlight" /> Informe as medidas (em metros)
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">
                              Largura (m)
                              {product.min_width && product.max_width && (
                                <span className="ml-1 text-highlight">({Number(product.min_width)}–{Number(product.max_width)})</span>
                              )}
                            </label>
                            <Input type="number" step="0.01" min="0" placeholder="Ex: 1.50" value={width} onChange={e => setWidth(e.target.value)} className="bg-background" />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">
                              Altura (m)
                              {product.min_height && product.max_height && (
                                <span className="ml-1 text-highlight">({Number(product.min_height)}–{Number(product.max_height)})</span>
                              )}
                            </label>
                            <Input type="number" step="0.01" min="0" placeholder="Ex: 2.00" value={height} onChange={e => setHeight(e.target.value)} className="bg-background" />
                          </div>
                        </div>
                        {wNum > 0 && hNum > 0 && (
                          <div className="flex items-center justify-between bg-background rounded-lg p-3 border border-border">
                            <div className="text-sm">
                              <span className="text-muted-foreground">Área: </span>
                              <span className="font-bold text-foreground">{area.toFixed(2)} m²</span>
                            </div>
                            <div className="text-right">
                              <span className="text-muted-foreground text-sm">Total: </span>
                              <span className="font-display text-xl font-bold text-foreground">R$ {calculatedPrice.toFixed(2)}</span>
                            </div>
                          </div>
                        )}
                        {dimensionError && (
                          <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 rounded-lg p-3 border border-destructive/20">
                            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                            {dimensionError}
                          </div>
                        )}
                      </div>
                      {wNum > 0 && hNum > 0 && !dimensionError && (
                        <p className="font-display text-3xl sm:text-4xl font-bold text-foreground">R$ {calculatedPrice.toFixed(2)}</p>
                      )}
                    </>
                  ) : (
                    <div className="mb-1">
                      {product.sale_price ? (
                        <>
                          <p className="text-lg text-muted-foreground line-through">R$ {Number(product.price).toFixed(2)}</p>
                          <p className="font-display text-3xl sm:text-4xl font-bold text-destructive" itemProp="price" content={String(product.sale_price)}>
                            R$ {calculatedPrice.toFixed(2)}
                          </p>
                        </>
                      ) : (
                        <p className="font-display text-3xl sm:text-4xl font-bold text-foreground" itemProp="price" content={String(product.price)}>
                          R$ {calculatedPrice.toFixed(2)}
                        </p>
                      )}
                      {defaultQty > 1 && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {selectedQuantity.toLocaleString("pt-BR")} unidades
                        </p>
                      )}
                    </div>
                  )}
                  <p className="text-sm text-success font-semibold">Pagamento via PIX • Sem taxas</p>
                  {product.estimated_days && (
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Clock className="w-4 h-4 text-highlight" />
                      Prazo estimado: ~{product.estimated_days} dias úteis
                    </p>
                                  <div className="space-y-6 mb-8">
                  {/* Dynamic Configurator Fields */}
                  {product.configuration_schema?.filter((it: any) => it.ui_type !== 'checkbox').map((item: any) => (
                    <div key={item.id} className="flex flex-col gap-2">
                      <Label className="text-sm font-bold text-foreground ml-1">{item.label}</Label>
                      {item.ui_type === "pills" ? (
                        <div className="flex flex-wrap gap-2">
                           {item.options.map((opt: any) => (
                             <button
                               key={opt.name}
                               onClick={() => setConfigValues(p => ({ ...p, [item.id]: opt.name }))}
                               className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
                                 configValues[item.id] === opt.name 
                                  ? "bg-primary/5 text-primary border-primary shadow-sm" 
                                  : "bg-background text-foreground border-border hover:border-primary/50"
                               }`}
                             >
                               {opt.name}
                             </button>
                           ))}
                        </div>
                      ) : (
                        <div className="relative">
                          <select 
                            value={configValues[item.id] || ""}
                            onChange={e => setConfigValues(p => ({ ...p, [item.id]: e.target.value }))}
                            className="w-full h-12 rounded-xl bg-background border border-border px-4 text-sm appearance-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                          >
                            <option value="" disabled>Selecione o {item.label}</option>
                            {item.options.map((opt: any) => (
                              <option key={opt.name} value={opt.name}>{opt.name}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Multi-select Checkboxes (Enobrecimento Extra / etc) */}
                  {product.configuration_schema?.filter((it: any) => it.ui_type === 'checkbox').map((item: any) => (
                    <div key={item.id} className="space-y-4">
                      <Label className="text-sm font-bold text-foreground ml-1">{item.label}</Label>
                      <div className="bg-secondary/20 rounded-2xl p-4 space-y-3 border border-border/50">
                        {item.options.map((opt: any) => {
                          const isSelected = (configValues[item.id] as string[] || []).includes(opt.name);
                          return (
                            <button
                              key={opt.name}
                              type="button"
                              onClick={() => {
                                const current = (configValues[item.id] as string[] || []);
                                const next = isSelected 
                                  ? current.filter(v => v !== opt.name) 
                                  : [...current, opt.name];
                                setConfigValues(p => ({ ...p, [item.id]: next }));
                              }}
                              className="flex items-center justify-between w-full group"
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-5 h-5 rounded border-2 transition-all flex items-center justify-center
                                  ${isSelected ? "bg-primary border-primary" : "border-muted-foreground/30 group-hover:border-primary/50"}`}>
                                  {isSelected && <Check className="w-3.5 h-3.5 text-white" strokeWidth={4} />}
                                </div>
                                <span className="text-sm text-foreground font-medium">{opt.name}</span>
                              </div>
                              {opt.price_adj > 0 && <span className="text-xs font-bold text-primary">+ R$ {opt.price_adj.toFixed(2)}</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
  </div>
                </div>

                {/* Acabamentos Adicionais */}
                {availableFinishings.length > 0 && (
                  <div className="space-y-4 mb-8">
                    <div className="flex items-center gap-3">
                      <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1">Opções Adicionais</Label>
                      <Separator className="flex-1" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {availableFinishings.map(f => (
                        <button
                          key={f.id}
                          onClick={() => {
                            if (selectedFinishings.includes(f.id)) {
                              setSelectedFinishings(p => p.filter(id => id !== f.id));
                            } else {
                              setSelectedFinishings(p => [...p, f.id]);
                            }
                          }}
                          className={`flex items-center justify-between p-4 rounded-2xl border transition-all text-left
                            ${selectedFinishings.includes(f.id) 
                              ? "bg-primary/5 border-primary shadow-glow-sm" 
                              : "bg-secondary/30 border-border/50 hover:border-primary/30"}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all
                              ${selectedFinishings.includes(f.id) ? "bg-primary border-primary" : "border-muted-foreground/30"}`}>
                              {selectedFinishings.includes(f.id) && <Plus className="w-3 h-3 text-white" strokeWidth={4} />}
                            </div>
                            <span className="text-sm font-bold text-foreground">{f.name}</span>
                          </div>
                          <span className="text-xs font-black text-primary">+R$ {Number(f.price).toFixed(2)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quantity Table */}
                {!isSqm && (
                  <div className="space-y-4 mb-8">
                    <Label className="text-sm font-bold text-foreground ml-1">Escolha a quantidade</Label>
                    <div className="overflow-hidden rounded-xl border border-border">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-secondary/50">
                          <tr>
                            <th className="px-4 py-3 font-bold">Quantidade</th>
                            <th className="px-4 py-3 font-bold text-right">Valor por unidade</th>
                            <th className="px-4 py-3 font-bold text-right">Valor Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {[25, 50, 100, 250, 500, 1000, 2500, 5000].map(qty => {
                            const unitPrice = baseUnitPrice * (qty >= 1000 ? 0.8 : qty >= 500 ? 0.9 : 1);
                            const total = unitPrice * qty;
                            const isSelected = selectedQuantity === qty;
                            
                            return (
                              <tr 
                                key={qty} 
                                className={`cursor-pointer transition-colors group ${isSelected ? 'bg-primary/5' : 'hover:bg-secondary/20'}`}
                                onClick={() => setSelectedQuantity(qty)}
                              >
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all
                                      ${isSelected ? "border-primary" : "border-muted-foreground/30 group-hover:border-primary/50"}`}>
                                      {isSelected && <div className="w-2 h-2 rounded-full bg-primary" />}
                                    </div>
                                    <span className={isSelected ? "font-bold" : ""}>{qty.toLocaleString()} unidades</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-right text-muted-foreground">R$ {unitPrice.toFixed(2)}/un</td>
                                <td className="px-4 py-3 text-right font-bold text-foreground">R$ {total.toFixed(2)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}


                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                  <Button variant="highlight" size="lg" className="flex-1 h-14 text-base font-black shadow-glow-sm hover:shadow-glow-strong" onClick={handleAddToCart} disabled={!canAddToCart}>
                    <ShoppingCart className="w-5 h-5 mr-2" /> COLOCAR NO CARRINHO
                  </Button>
                  <Button variant="highlight" size="lg" className="flex-1 h-14 text-base font-black bg-success text-success-foreground hover:bg-success/90" onClick={() => { handleAddToCart(); if (canAddToCart) window.location.href = "/checkout"; }} disabled={!canAddToCart}>
                    COMPRAR AGORA
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mb-8 rounded-xl border-white/10 hover:bg-white/5 h-10 font-bold"
                  onClick={() => setQuoteDialogOpen(true)}
                >
                  <FileDown className="w-4 h-4 mr-2" /> GERAR ORÇAMENTO EM PDF
                </Button>

                {/* Sticky Add to Cart (Desktop & Mobile) */}
                {showSticky && (
                  <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-xl border-t border-white/10 z-50 flex items-center justify-between gap-4 shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom duration-300">
                    <div className="container mx-auto max-w-6xl flex items-center justify-between gap-4">
                      <div className="hidden md:flex items-center gap-4">
                        <img src={images[0]?.image_url || "/placeholder.svg"} className="w-12 h-12 rounded-lg object-cover border border-white/10" />
                        <div>
                          <p className="font-display font-bold text-sm text-foreground truncate max-w-xs">{product.name}</p>
                          <p className="text-[11px] text-muted-foreground">{isSqm ? `${area.toFixed(2)}m²` : `${selectedQuantity} un`}</p>
                        </div>
                      </div>
                      <div className="flex flex-1 md:flex-none justify-between md:justify-end items-center gap-6">
                        <div className="flex flex-col text-left md:text-right">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Final</span>
                          <span className="text-xl md:text-2xl font-black text-foreground shadow-glow-text">R$ {calculatedPrice.toFixed(2)}</span>
                        </div>
                        <Button variant="highlight" size="lg" className="h-12 md:h-14 font-black shadow-glow hover:shadow-glow-strong" onClick={handleAddToCart} disabled={!canAddToCart}>
                          <ShoppingCart className="w-5 h-5 mr-0 sm:mr-2" />
                          <span className="hidden sm:inline">COLOCAR NO CARRINHO</span>
                          <span className="sm:hidden ml-2">COMPRAR</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                <Dialog open={quoteDialogOpen} onOpenChange={setQuoteDialogOpen}>
                  <DialogContent className="max-w-md">
                    <DialogHeader><DialogTitle>Dados para a Cotação</DialogTitle></DialogHeader>
                    <p className="text-sm text-muted-foreground">Preencha seus dados para incluir no PDF (opcional).</p>
                    <div className="space-y-3">
                      <div><Label className="text-xs">Nome completo</Label><Input value={quoteCustomer.name} onChange={e => setQuoteCustomer(p => ({ ...p, name: e.target.value }))} placeholder="Seu nome" /></div>
                      <div><Label className="text-xs">Empresa</Label><Input value={quoteCustomer.company} onChange={e => setQuoteCustomer(p => ({ ...p, company: e.target.value }))} placeholder="Nome da empresa" /></div>
                      <div><Label className="text-xs">CPF/CNPJ</Label><Input value={quoteCustomer.cpfCnpj} onChange={e => setQuoteCustomer(p => ({ ...p, cpfCnpj: e.target.value }))} placeholder="000.000.000-00" /></div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><Label className="text-xs">E-mail</Label><Input value={quoteCustomer.email} onChange={e => setQuoteCustomer(p => ({ ...p, email: e.target.value }))} placeholder="email@exemplo.com" /></div>
                        <div><Label className="text-xs">Telefone</Label><Input value={quoteCustomer.phone} onChange={e => setQuoteCustomer(p => ({ ...p, phone: e.target.value }))} placeholder="(00) 00000-0000" /></div>
                      </div>
                    </div>
                    <Button
                      variant="hero"
                      className="w-full mt-2"
                      onClick={() => {
                        generateClientQuotePDF({
                          items: [{
                            name: product.name + (defaultQty > 1 && quantityMultiplier > 1 ? ` (${selectedQuantity} un)` : ""),
                            quantity: isSqm ? 1 : quantityMultiplier,
                            unitPrice: isSqm ? area * pricePerSqm : baseUnitPrice,
                            total: calculatedPrice,
                            dimensions: isSqm ? `${wNum}m × ${hNum}m = ${area.toFixed(2)}m²` : undefined,
                            finishings: availableFinishings.filter(f => selectedFinishings.includes(f.id)).map(f => f.name),
                          }],
                          estimatedDays: product.estimated_days,
                          customer: quoteCustomer,
                          company: companySettings,
                        });
                        setQuoteDialogOpen(false);
                      }}
                    >
                      <FileDown className="w-4 h-4 mr-2" /> Baixar PDF
                    </Button>
                  </DialogContent>
                </Dialog>

                <div className="grid grid-cols-2 gap-3 mb-8">
                  {trustItems.map((item, i) => (
                    <div key={i} className="flex items-center gap-2.5 p-3 rounded-xl bg-secondary">
                      <item.icon className="w-4 h-4 text-highlight flex-shrink-0" />
                      <span className="text-sm text-foreground font-medium">{item.text}</span>
                    </div>
                  ))}
                </div>

                {product.full_description && (
                  <div className="mb-8">
                    <h2 className="font-display text-xl font-bold text-foreground mb-3">Descrição</h2>
                    <div className="text-muted-foreground leading-relaxed prose prose-sm max-w-none break-words overflow-wrap-anywhere [word-break:break-word]" dangerouslySetInnerHTML={{ __html: sanitizeHTML(product.full_description) }} />
                  </div>
                )}

                {/* Video */}
                {product.video_url && (
                  <div className="mb-8">
                    <h2 className="font-display text-xl font-bold text-foreground mb-3">Vídeo</h2>
                    <div className="aspect-video rounded-xl overflow-hidden bg-secondary">
                      <iframe
                        src={product.video_url.replace("watch?v=", "embed/").replace("youtu.be/", "youtube.com/embed/")}
                        className="w-full h-full"
                        allowFullScreen
                        title={`Vídeo - ${product.name}`}
                      />
                    </div>
                  </div>
                )}
                {/* Shipping Section */}
                <div className="glass-card-premium rounded-3xl p-6 mb-8 border-gradient-premium">
                   <div className="mb-4">
                      <h3 className="font-display font-bold text-foreground flex items-center gap-2">
                        <Truck className="w-5 h-5 text-primary" /> Entrega & Retirada
                      </h3>
                   </div>
                   
                   <div className="space-y-4">
                      {/* Store Pickup (Fixed) */}
                      <button 
                        className="w-full text-left p-4 rounded-2xl border border-success/30 bg-success/5 flex items-center justify-between gap-4"
                        type="button"
                      >
                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center text-success">
                               <Home className="w-5 h-5" />
                            </div>
                            <div>
                               <p className="text-sm font-black text-foreground uppercase tracking-tight">Retirada na Loja</p>
                               <p className="text-[11px] text-success font-black uppercase tracking-widest">
                                  Pronto em: {product.estimated_days || 0} dias úteis
                               </p>
                            </div>
                         </div>
                         <span className="text-sm font-black text-success">GRÁTIS</span>
                      </button>

                      <Separator className="bg-white/5" />

                      {/* Mejor Envio Calculator */}
                      <ShippingCalculator 
                        cartTotal={calculatedPrice}
                        items={[{
                          id: product.id,
                          productId: product.id,
                          name: product.name,
                          price: calculatedPrice,
                          quantity: 1,
                          shippingWeight: Number(product.shipping_weight) || 0.3,
                          shippingHeight: Number(product.shipping_height) || 2,
                          shippingWidth: Number(product.shipping_width) || 11,
                          shippingLength: Number(product.shipping_length) || 16,
                        }]}
                        selected={selectedShipping}
                        onSelect={setSelectedShipping}
                      />
                   </div>
                </div>

                {product.specifications && (
                  <div>
                    <h2 className="font-display text-xl font-bold text-foreground mb-3">Especificações</h2>
                    <div className="text-muted-foreground leading-relaxed prose prose-sm max-w-none break-words [word-break:break-word]" dangerouslySetInnerHTML={{ __html: sanitizeHTML(product.specifications) }} />
                  </div>
                )}

                {/* Product FAQs */}
                {faqs.length > 0 && (
                  <div className="mt-8">
                    <h2 className="font-display text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                      <HelpCircle className="w-5 h-5 text-highlight" /> Perguntas Frequentes
                    </h2>
                    <Accordion type="single" collapsible className="space-y-2">
                      {faqs.map((faq, i) => (
                        <AccordionItem key={i} value={`faq-${i}`} className="border border-border rounded-xl px-4 bg-card">
                          <AccordionTrigger className="text-sm font-semibold text-foreground hover:text-highlight py-3">
                            {faq.question}
                          </AccordionTrigger>
                          <AccordionContent className="text-sm text-muted-foreground pb-3">
                            {faq.answer}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                )}
              </motion.div>
            </div>

            {/* Art Editor for card/print products */}
            {product.name && (product.name.toLowerCase().includes("cartão") || product.name.toLowerCase().includes("cartao")) && (
              <ArtEditor productName={product.name} />
            )}

            {/* Smart Recommendations */}
            <SmartRecommendations productId={product.id} />

            {/* Related Products */}
            <RelatedProducts productId={product.id} catalogNodeId={product.catalog_node_id} />
          </div>
        </section>
      </article>

    </PublicLayout>
  );
};

export default Produto;
