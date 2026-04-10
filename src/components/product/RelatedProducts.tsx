import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart, ArrowRight, Ruler } from "lucide-react";
import { motion } from "framer-motion";

interface RelatedProductsProps {
  productId: string;
  catalogNodeId: string | null;
}

const RelatedProducts = ({ productId, catalogNodeId }: RelatedProductsProps) => {
  const { addItem } = useCart();
  const { toast } = useToast();
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      // 1. Try manual relations first
      const { data: manual } = await supabase
        .from("related_products")
        .select("related_product_id")
        .eq("product_id", productId)
        .order("sort_order");

      const manualIds = (manual ?? []).map(r => (r as any).related_product_id);

      if (manualIds.length > 0) {
        const { data } = await supabase
          .from("products")
          .select("id, name, slug, price, sale_price, pricing_type, price_per_sqm, color_mode, product_images(image_url, sort_order)")
          .in("id", manualIds)
          .eq("is_active", true);
        setProducts(data ?? []);
        return;
      }

      // 2. Fallback: same catalog node
      if (catalogNodeId) {
        const { data } = await supabase
          .from("products")
          .select("id, name, slug, price, sale_price, pricing_type, price_per_sqm, color_mode, product_images(image_url, sort_order)")
          .eq("catalog_node_id", catalogNodeId)
          .eq("is_active", true)
          .neq("id", productId)
          .order("sort_order")
          .limit(6);
        setProducts(data ?? []);
      }
    };
    load();
  }, [productId, catalogNodeId]);

  if (products.length === 0) return null;

  const getImage = (p: any) => {
    const imgs = p.product_images?.sort((a: any, b: any) => a.sort_order - b.sort_order);
    return imgs?.[0]?.image_url || "/placeholder.svg";
  };

  const handleAdd = (p: any) => {
    if (p.pricing_type === "per_sqm") {
      window.location.href = `/loja/${p.slug}`;
      return;
    }
    const img = getImage(p);
    addItem({ productId: p.id, name: p.name, price: Number(p.sale_price || p.price), quantity: 1, image: img });
    toast({ title: `${p.name} adicionado ao carrinho!` });
  };

  return (
    <section className="mt-12 pt-10 border-t border-border">
      <div className="container mx-auto px-4 max-w-6xl">
        <h2 className="font-display text-2xl font-bold text-foreground mb-6">Produtos Relacionados</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.slice(0, 8).map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              className="glass-card glass-card-hover rounded-xl overflow-hidden group"
            >
              <Link to={`/loja/${p.slug}`} className="block">
                <div className="aspect-square overflow-hidden relative">
                  <img src={getImage(p)} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  {p.pricing_type === "per_sqm" && (
                    <span className="absolute top-2 right-2 bg-highlight/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                      <Ruler className="w-2.5 h-2.5" /> m²
                    </span>
                  )}
                  {p.sale_price && p.pricing_type !== "per_sqm" && (
                    <span className="absolute top-2 right-2 bg-destructive text-destructive-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">Promo</span>
                  )}
                </div>
              </Link>
              <div className="p-3">
                <Link to={`/loja/${p.slug}`}>
                  <h3 className="font-semibold text-foreground text-sm mb-1 group-hover:text-highlight transition-colors line-clamp-2">{p.name}</h3>
                </Link>
                <div className="flex items-center justify-between mt-2">
                  <div>
                    {p.pricing_type === "per_sqm" ? (
                      <span className="font-bold text-sm text-foreground">R$ {Number(p.price_per_sqm).toFixed(2)}<span className="text-[10px] text-muted-foreground">/m²</span></span>
                    ) : p.sale_price ? (
                      <div>
                        <span className="text-[10px] line-through text-muted-foreground mr-1">R$ {Number(p.price).toFixed(2)}</span>
                        <span className="font-bold text-sm text-destructive">R$ {Number(p.sale_price).toFixed(2)}</span>
                      </div>
                    ) : (
                      <span className="font-bold text-sm text-foreground">R$ {Number(p.price).toFixed(2)}</span>
                    )}
                  </div>
                  <Button variant="highlight" size="icon" className="h-8 w-8 rounded-lg" onClick={() => handleAdd(p)}>
                    {p.pricing_type === "per_sqm" ? <ArrowRight className="w-3.5 h-3.5" /> : <ShoppingCart className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default RelatedProducts;
