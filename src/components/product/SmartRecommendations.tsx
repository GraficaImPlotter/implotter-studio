import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/hooks/use-cart";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

interface SmartRecommendation {
  id: string;
  name: string;
  slug: string;
  price: number;
  sale_price: number | null;
  image_url?: string;
  score: number;
}

interface Props {
  productId: string;
  title?: string;
}

const SmartRecommendations = ({ productId, title = "Quem comprou também comprou" }: Props) => {
  const { addItem } = useCart();
  const { toast } = useToast();
  const [products, setProducts] = useState<SmartRecommendation[]>([]);

  useEffect(() => {
    const load = async () => {
      // Find orders that contain this product
      const { data: orderItemsWithProduct } = await supabase
        .from("order_items")
        .select("order_id")
        .eq("product_id", productId);

      if (!orderItemsWithProduct || orderItemsWithProduct.length === 0) return;

      const orderIds = [...new Set(orderItemsWithProduct.map((oi) => oi.order_id))];

      // Find other products in those orders
      const { data: coProducts } = await supabase
        .from("order_items")
        .select("product_id, product_name")
        .in("order_id", orderIds)
        .neq("product_id", productId);

      if (!coProducts || coProducts.length === 0) return;

      // Count frequency
      const freq: Record<string, { count: number; name: string }> = {};
      coProducts.forEach((item) => {
        if (!item.product_id) return;
        if (!freq[item.product_id]) freq[item.product_id] = { count: 0, name: item.product_name };
        freq[item.product_id].count++;
      });

      // Get top 6 most co-purchased
      const topIds = Object.entries(freq)
        .sort(([, a], [, b]) => b.count - a.count)
        .slice(0, 6)
        .map(([id]) => id);

      if (topIds.length === 0) return;

      const { data: fullProducts } = await supabase
        .from("products")
        .select("id, name, slug, price, sale_price, product_images(image_url, sort_order)")
        .in("id", topIds)
        .eq("is_active", true);

      if (!fullProducts) return;

      const result: SmartRecommendation[] = fullProducts.map((p: any) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: p.price,
        sale_price: p.sale_price,
        image_url: p.product_images?.sort((a: any, b: any) => a.sort_order - b.sort_order)[0]?.image_url,
        score: freq[p.id]?.count || 0,
      }));

      result.sort((a, b) => b.score - a.score);
      setProducts(result);
    };

    load();
  }, [productId]);

  if (products.length === 0) return null;

  return (
    <section className="mt-10 pt-8 border-t border-border">
      <h2 className="font-display text-xl font-bold text-foreground mb-5 flex items-center gap-2">
        🧠 {title}
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {products.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-card glass-card-hover rounded-xl overflow-hidden group"
          >
            <Link to={`/loja/${p.slug}`} className="block">
              <div className="aspect-square overflow-hidden">
                <img
                  src={p.image_url || "/placeholder.svg"}
                  alt={p.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
              </div>
            </Link>
            <div className="p-2.5">
              <Link to={`/loja/${p.slug}`}>
                <h3 className="font-semibold text-foreground text-xs mb-1 group-hover:text-highlight transition-colors line-clamp-2">
                  {p.name}
                </h3>
              </Link>
              <div className="flex items-center justify-between mt-1">
                <span className="font-bold text-xs text-foreground">
                  R$ {Number(p.sale_price || p.price).toFixed(2)}
                </span>
                <Button
                  variant="highlight"
                  size="icon"
                  className="h-7 w-7 rounded-lg"
                  onClick={() => {
                    addItem({
                      productId: p.id,
                      name: p.name,
                      price: Number(p.sale_price || p.price),
                      quantity: 1,
                      image: p.image_url,
                    });
                    toast({ title: `${p.name} adicionado!` });
                  }}
                >
                  <ShoppingCart className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default SmartRecommendations;
