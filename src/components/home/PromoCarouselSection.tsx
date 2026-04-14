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
import { ArrowRight } from "lucide-react";
import StoreProductCard from "@/components/product/StoreProductCard";
import { useCart } from "@/hooks/use-cart";
import { useToast } from "@/hooks/use-toast";

const PromoCarouselSection = () => {
  const [promoProducts, setPromoProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { addItem } = useCart();
  const { toast } = useToast();

  useEffect(() => {
    const fetchPromos = async () => {
      const { data, error } = await supabase
        .from("products_public")
        .select("id, name, slug, short_description, price, sale_price, pricing_type, price_per_sqm, is_featured, catalog_node_id, default_quantity, product_images(image_url, sort_order)")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (!error && data) {
        const promos = data.filter(
          (p: any) => p.sale_price && Number(p.sale_price) < Number(p.price) && p.pricing_type !== "per_sqm"
        );
        
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

  const getProductImage = (p: any) => {
    const imgs = p.product_images?.sort((a: any, b: any) => a.sort_order - b.sort_order);
    return imgs?.[0]?.image_url || "/placeholder.svg";
  };

  if (loading || promoProducts.length === 0) {
    if (!loading && promoProducts.length === 0) return null;
    return (
      <section className="py-16 pt-8 bg-background relative overflow-hidden flex justify-center">
        <span className="w-8 h-8 border-2 border-highlight border-t-transparent rounded-full animate-spin"></span>
      </section>
    );
  }

  return (
    <section className="py-16 pt-8 bg-background relative overflow-hidden">
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
            {promoProducts.map((product, index) => (
              <CarouselItem key={product.id} className="pl-2 md:pl-4 basis-full sm:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="h-full pt-4 pb-12 px-2"
                >
                  <StoreProductCard 
                    p={product} 
                    index={index} 
                    getImage={getProductImage}
                    onAdd={(p) => {
                      const img = getProductImage(p);
                      addItem({ productId: p.id, name: p.name, price: Number(p.sale_price || p.price), quantity: 1, image: img });
                      toast({ title: "Adicionado!", description: `${p.name} está no carrinho.` });
                    }}
                  />
                </motion.div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <div className="hidden md:block">
            <CarouselPrevious className="-left-4 bg-background/80 blur-backdrop border-border" />
            <CarouselNext className="-right-4 bg-background/80 blur-backdrop border-border" />
          </div>
        </Carousel>
      </div>
    </section>
  );
};

export default PromoCarouselSection;
