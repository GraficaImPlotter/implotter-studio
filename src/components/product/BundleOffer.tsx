import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/hooks/use-cart";
import { useToast } from "@/hooks/use-toast";
import { Plus, ShoppingCart, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  sale_price: number | null;
  image_url?: string;
}

export default function BundleOffer({ currentProduct }: { currentProduct: any }) {
  const { addItem } = useCart();
  const { toast } = useToast();
  const [suggestion, setSuggestion] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSuggestion = async () => {
      setLoading(true);
      // Logic: Prioritize products from the same category
      let query = supabase
        .from("products")
        .select("id, name, slug, price, sale_price, category_id, product_images(image_url, sort_order)")
        .neq("id", currentProduct.id)
        .eq("is_active", true);

      if (currentProduct.category_id) {
        query = query.eq("category_id", currentProduct.category_id);
      }

      const { data } = await query.limit(10);

      if (data && data.length > 0) {
        // Filter out kits and pick a random one
        const filtered = data.filter(p => !p.name.toLowerCase().includes("kit"));
        const random = filtered.length > 0 ? filtered[Math.floor(Math.random() * filtered.length)] : data[0];
        
        if (random) {
          setSuggestion({
            id: random.id,
            name: random.name,
            slug: random.slug,
            price: random.price,
            sale_price: random.sale_price,
            image_url: (random as any).product_images?.sort((a: any, b: any) => a.sort_order - b.sort_order)[0]?.image_url
          });
        }
      }
      setLoading(false);
    };

    if (currentProduct?.id) fetchSuggestion();
  }, [currentProduct.id, currentProduct.category_id]);

  const BUNDLE_DISCOUNT = 0.05; // 5% Discount for bundle

  const handleAddBundle = () => {
    if (!suggestion) return;
    
    const discountedPrice = Number(suggestion.sale_price || suggestion.price) * (1 - BUNDLE_DISCOUNT);

    addItem({
      productId: suggestion.id,
      name: `[Combo] ${suggestion.name}`,
      price: Math.round(discountedPrice * 100) / 100,
      quantity: 1,
      image: suggestion.image_url
    });

    toast({ 
      title: "Desconto Aplicado! 🎉", 
      description: `${suggestion.name} adicionado com 5% de desconto.` 
    });
  };

  if (loading || !suggestion) return null;

  const currentPrice = currentProduct.calculatedPrice || currentProduct.price;
  const suggestionOriginalPrice = Number(suggestion.sale_price || suggestion.price);
  const suggestionDiscountedPrice = suggestionOriginalPrice * (1 - BUNDLE_DISCOUNT);
  const totalBundleOriginal = currentPrice + suggestionOriginalPrice;
  const totalBundleDiscounted = currentPrice + suggestionDiscountedPrice;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }}
      className="mt-8 bg-slate-50 border border-slate-200 rounded-[2.5rem] p-8 shadow-sm overflow-hidden relative"
    >
      <div className="absolute top-0 right-0 bg-success text-white text-[10px] font-black px-4 py-2 rounded-bl-2xl shadow-sm">
        COMBO ESPECIAL: -5% OFF
      </div>

      <div className="flex items-center gap-3 mb-8">
        <Plus className="w-5 h-5 text-primary" strokeWidth={3} />
        <h3 className="font-display font-black text-sm uppercase tracking-tight text-slate-900">Complete seu pedido</h3>
      </div>

      <div className="flex flex-col gap-8">
        {/* Images and Plus Icon */}
        <div className="flex items-center justify-center lg:justify-start gap-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-white p-1.5 border border-slate-200 shadow-sm flex-shrink-0">
               <img src={currentProduct.mainImage || "/placeholder.svg"} className="w-full h-full object-cover rounded-xl" alt="Atual" />
            </div>
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-slate-900 rounded-full flex items-center justify-center text-[10px] text-white font-bold">1</div>
          </div>
          
          <Plus className="w-5 h-5 text-slate-300" strokeWidth={2} />
          
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-white p-1.5 border border-slate-200 shadow-sm flex-shrink-0">
               <img src={suggestion.image_url || "/placeholder.svg"} className="w-full h-full object-cover rounded-xl" alt="Sugestão" />
            </div>
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-[10px] text-white font-bold">2</div>
          </div>
        </div>

        {/* Product Name */}
        <div className="text-center lg:text-left">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Você também vai precisar de:</p>
          <p className="text-lg font-black text-slate-900 leading-tight">{suggestion.name}</p>
        </div>

        {/* Price and Action Row */}
        <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="text-center sm:text-left">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Total do Combo com Desconto:</p>
            <div className="flex items-center gap-3 justify-center sm:justify-start">
              <span className="text-sm text-slate-400 line-through">R$ {totalBundleOriginal.toFixed(2)}</span>
              <span className="text-3xl font-display font-black text-primary tracking-tighter">R$ {totalBundleDiscounted.toFixed(2)}</span>
            </div>
          </div>

          <Button 
            onClick={handleAddBundle}
            variant="hero" 
            className="w-full sm:w-auto rounded-2xl h-14 px-10 bg-slate-900 hover:bg-primary text-white font-black text-[11px] uppercase tracking-widest transition-all shadow-xl group"
          >
            Adicionar Combo ao Carrinho <ShoppingCart className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>
      
      <div className="mt-6 flex items-center gap-2 text-[10px] text-success font-black uppercase tracking-widest justify-center lg:justify-start">
        <Check className="w-3.5 h-3.5" /> Os dois itens serão adicionados separadamente
      </div>
    </motion.div>
  );
}
