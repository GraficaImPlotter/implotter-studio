import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Star, TrendingDown, Clock } from "lucide-react";

// Helper para pegar a primeira imagem do produto
const getProductImage = (p: any) => {
  const imgs = p.product_images?.sort((a: any, b: any) => a.sort_order - b.sort_order);
  return imgs?.[0]?.image_url || "/placeholder.svg";
};

const PromoCarouselSection = () => {
  const [promoProducts, setPromoProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPromos = async () => {
      // Usando products_public igual na Loja.tsx para puxar imagens fáceis
      const { data, error } = await supabase
        .from("products_public")
        .select("id, name, slug, short_description, price, sale_price, pricing_type, price_per_sqm, is_featured, product_images(image_url, sort_order)")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (!error && data) {
        // Filtrar apenas produtos que têm preço promocional real
        const promos = data.filter(
          (p: any) => p.sale_price && Number(p.sale_price) < Number(p.price) && p.pricing_type !== "per_sqm"
        );
        
        // Se não tiver promos suficientes, puxamos os destacados
        if (promos.length < 4) {
          const featured = data.filter((p: any) => p.is_featured && p.pricing_type !== "per_sqm");
          for (const f of featured) {
            if (!promos.find(p => p.id === f.id)) promos.push(f);
            if (promos.length >= 8) break;
          }
        }
        
        setPromoProducts(promos.slice(0, 8));
      }
      setLoading(false);
    };

    fetchPromos();
  }, []);

  if (loading || promoProducts.length === 0) {
    if (!loading && promoProducts.length === 0) return null; // Se não tiver nada, some silenciosamente
    return (
      <section className="py-16 pt-8 bg-background relative overflow-hidden flex justify-center">
        <span className="w-8 h-8 border-2 border-highlight border-t-transparent rounded-full animate-spin"></span>
      </section>
    );
  }

  return (
    <section className="py-16 pt-8 bg-background relative overflow-hidden">
      {/* Decorative Glow */}
      <div className="absolute top-10 left-0 w-72 h-72 bg-highlight/5 rounded-full blur-3xl pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4"
        >
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
              </span>
              <span className="text-destructive font-bold text-sm tracking-widest uppercase">
                Ofertas da Semana
              </span>
            </div>
            <h2 className="font-display text-3xl md:text-5xl font-bold text-foreground">
              Os Favoritos da Gráfica
            </h2>
          </div>
          <Link
            to="/loja"
            className="flex items-center gap-2 text-muted-foreground hover:text-highlight transition-colors text-sm font-semibold group"
          >
            Ver catálogo completo 
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>

        <Carousel
          opts={{
            align: "start",
            loop: false,
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-2 md:-ml-4">
            {promoProducts.map((product, index) => {
              const hasPromo = product.sale_price && Number(product.sale_price) < Number(product.price);
              const displayPrice = hasPromo ? Number(product.sale_price) : Number(product.price);
              const isHighlight = product.is_featured && !hasPromo;
              
              return (
                <CarouselItem key={product.id} className="pl-2 md:pl-4 basis-full sm:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    viewport={{ once: true }}
                    className="h-full"
                  >
                    <div className="flex flex-col h-full rounded-2xl border border-border/50 bg-card overflow-hidden group hover:border-highlight/50 transition-colors hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:hover:shadow-[0_8px_30px_rgba(255,255,255,0.02)] relative">
                      {/* Badge */}
                      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
                        {hasPromo && (
                           <Badge variant="destructive" className="bg-destructive/90 backdrop-blur-sm text-[10px] font-bold">
                             PROMOÇÃO
                           </Badge>
                        )}
                        {isHighlight && (
                          <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm text-xs font-semibold">
                            <Star className="w-3 h-3 mr-1 text-yellow-500 fill-yellow-500" /> Destaque
                          </Badge>
                        )}
                      </div>

                      {/* Image */}
                      <Link to={`/loja/${product.slug}`} className="block relative aspect-video overflow-hidden bg-muted">
                        <img 
                          src={getProductImage(product)} 
                          alt={product.name}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>

                      {/* Content */}
                      <div className="p-5 flex flex-col flex-grow">
                        <Link to={`/loja/${product.slug}`} className="mb-1">
                          <h3 className="font-display font-bold text-lg text-foreground line-clamp-1 group-hover:text-highlight transition-colors">
                            {product.name}
                          </h3>
                        </Link>
                        
                        <p className="text-muted-foreground text-sm mb-4 line-clamp-2 min-h-[40px]">
                          {product.short_description || "Material Gráfico Profissional"}
                        </p>

                        <div className="mt-auto border-t border-border/40 pt-4 flex items-end justify-between">
                          <div>
                            {hasPromo && (
                              <span className="text-xs text-muted-foreground line-through block mb-0.5">
                                R$ {Number(product.price).toFixed(2)}
                              </span>
                            )}
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xl text-foreground">
                                R$ {displayPrice.toFixed(2)}
                              </span>
                              {hasPromo && <TrendingDown className="w-4 h-4 text-success" />}
                            </div>
                          </div>
                          
                          <Link 
                            to={`/loja/${product.slug}`}
                            className="w-10 h-10 rounded-full bg-highlight text-highlight-foreground flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-highlight/20"
                          >
                            <ArrowRight className="w-5 h-5" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </CarouselItem>
              );
            })}
          </CarouselContent>
          <div className="flex justify-end gap-3 mt-6">
            <CarouselPrevious className="relative inset-auto h-10 w-10 translate-y-0 bg-background border-border/50 hover:bg-muted" />
            <CarouselNext className="relative inset-auto h-10 w-10 translate-y-0 bg-background border-border/50 hover:bg-muted" />
          </div>
        </Carousel>
      </div>
    </section>
  );
};

export default PromoCarouselSection;
