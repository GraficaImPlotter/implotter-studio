import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import PublicLayout from "@/components/layout/PublicLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart, CheckCircle, ChevronRight, Home, Package } from "lucide-react";
import { motion } from "framer-motion";

interface Kit {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  normal_price: number;
  promo_price: number;
}

interface KitItemWithProduct {
  id: string;
  product_id: string;
  quantity: number;
  product: { id: string; name: string; slug: string; price: number; product_images: { image_url: string; sort_order: number }[] } | null;
}

const KitPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();
  const { addItem } = useCart();
  const [kit, setKit] = useState<Kit | null>(null);
  const [items, setItems] = useState<KitItemWithProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: kitData } = await supabase
        .from("kits")
        .select("*")
        .eq("slug", slug)
        .eq("is_active", true)
        .single();

      if (!kitData) { setLoading(false); return; }
      setKit(kitData as Kit);

      const { data: kitItems } = await supabase
        .from("kit_items")
        .select("*, product:products(id, name, slug, price, product_images(image_url, sort_order))")
        .eq("kit_id", (kitData as any).id)
        .order("sort_order");

      setItems((kitItems as KitItemWithProduct[]) ?? []);
      setLoading(false);
    };
    load();
  }, [slug]);

  const handleAddToCart = () => {
    if (!kit) return;
    // Add each item from the kit as a separate cart item, with the proportional promo price
    const totalNormal = items.reduce((sum, item) => {
      const unitPrice = item.product?.price || 0;
      return sum + unitPrice * item.quantity;
    }, 0);

    items.forEach(item => {
      if (!item.product) return;
      const unitNormal = item.product.price * item.quantity;
      // Proportional discount
      const proportion = totalNormal > 0 ? unitNormal / totalNormal : 1 / items.length;
      const itemPromoTotal = Number(kit.promo_price) * proportion;
      const promoUnitPrice = itemPromoTotal / item.quantity;

      const img = item.product.product_images?.sort((a, b) => a.sort_order - b.sort_order)[0]?.image_url;

      addItem({
        productId: item.product.id,
        name: `[Kit ${kit.name}] ${item.product.name}`,
        price: Math.round(promoUnitPrice * 100) / 100,
        quantity: item.quantity,
        image: img,
      });
    });

    toast({ title: `Kit "${kit.name}" adicionado ao carrinho!` });
  };

  if (loading) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-20 text-center">
          <div className="w-8 h-8 border-2 border-highlight border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </PublicLayout>
    );
  }

  if (!kit) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-20 text-center">
          <Package className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">Kit não encontrado</h1>
          <Link to="/loja" className="text-highlight hover:underline">Voltar à loja</Link>
        </div>
      </PublicLayout>
    );
  }

  const discount = kit.normal_price > kit.promo_price
    ? Math.round((1 - kit.promo_price / kit.normal_price) * 100)
    : 0;

  return (
    <PublicLayout>
      {/* Breadcrumb */}
      <section className="border-b border-border">
        <div className="container mx-auto px-4 py-2.5">
          <nav className="flex items-center gap-1.5 text-sm">
            <Link to="/" className="text-muted-foreground hover:text-highlight transition-colors flex items-center gap-1"><Home className="w-3.5 h-3.5" /></Link>
            <ChevronRight className="w-3 h-3 text-muted-foreground" />
            <Link to="/loja" className="text-muted-foreground hover:text-highlight transition-colors">Loja</Link>
            <ChevronRight className="w-3 h-3 text-muted-foreground" />
            <span className="text-foreground font-medium">{kit.name}</span>
          </nav>
        </div>
      </section>

      <section className="py-10">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-10 items-start">
            {/* Image */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="rounded-2xl overflow-hidden border border-border bg-card">
              <img
                src={kit.image_url || "/placeholder.svg"}
                alt={kit.name}
                className="w-full aspect-square object-cover"
              />
            </motion.div>

            {/* Info */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              {discount > 0 && (
                <span className="inline-block bg-destructive text-destructive-foreground text-xs font-bold px-3 py-1 rounded-full">
                  -{discount}% OFF
                </span>
              )}
              <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">{kit.name}</h1>
              {kit.description && <p className="text-muted-foreground">{kit.description}</p>}

              {/* Pricing */}
              <div className="flex items-end gap-3">
                {kit.normal_price > kit.promo_price && (
                  <span className="text-muted-foreground line-through text-lg">R$ {Number(kit.normal_price).toFixed(2)}</span>
                )}
                <span className="text-highlight font-display font-bold text-3xl">R$ {Number(kit.promo_price).toFixed(2)}</span>
              </div>

              {/* Items list */}
              <div className="space-y-3">
                <h3 className="font-semibold text-foreground">Incluso neste kit:</h3>
                <div className="space-y-2">
                  {items.map(item => (
                    <div key={item.id} className="flex items-center gap-3 bg-secondary/50 rounded-lg px-4 py-3">
                      <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
                      <span className="text-sm text-foreground flex-1">{item.product?.name || "Produto"}</span>
                      <span className="text-sm text-muted-foreground font-medium">x{item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Button variant="hero" size="xl" className="w-full" onClick={handleAddToCart}>
                <ShoppingCart className="w-5 h-5 mr-2" /> Adicionar Kit ao Carrinho
              </Button>
            </motion.div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
};

export default KitPage;
