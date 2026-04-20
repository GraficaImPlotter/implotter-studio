import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Instagram, MessageSquare, ExternalLink, 
  ChevronRight, Sparkles, MapPin, Phone 
} from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

export default function CatalogoDigital() {
  const { data: categories = [] } = useQuery({
    queryKey: ["catalog-digital-categories"],
    queryFn: async () => {
      const { data } = await supabase
        .from("catalog_nodes")
        .select("*")
        .eq("is_active", true)
        .is("parent_id", null)
        .order("sort_order");
      return data || [];
    }
  });

  const { data: featuredProducts = [] } = useQuery({
    queryKey: ["catalog-digital-featured"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, price, sale_price, product_images(image_url)")
        .eq("is_featured", true)
        .eq("is_active", true)
        .limit(4);
      return data || [];
    }
  });

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-highlight selection:text-white pb-10">
      <div className="max-w-md mx-auto px-6 pt-12">
        {/* Profile Section */}
        <div className="flex flex-col items-center text-center mb-10">
           <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-24 h-24 rounded-[32px] bg-gradient-to-br from-highlight to-highlight-glow p-1 mb-6 shadow-glow-strong"
           >
              <div className="w-full h-full rounded-[30px] bg-[#050505] flex items-center justify-center overflow-hidden border-4 border-[#050505]">
                 <img src="/logo.svg" className="w-12 h-12 invert" alt="Logo" />
              </div>
           </motion.div>
           <h1 className="text-2xl font-black tracking-tighter uppercase mb-2">ImPlotter <span className="text-highlight">Studio</span></h1>
           <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.3em] mb-6 opacity-60">Soluções Gráficas Premium</p>
           
           <div className="flex gap-4">
              <a href="https://instagram.com/implotterstudio" className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"><Instagram className="w-5 h-5" /></a>
              <a href="https://wa.me/55000000000" className="p-3 rounded-2xl bg-success/10 border border-success/20 text-success hover:bg-success hover:text-white transition-all"><Phone className="w-5 h-5" /></a>
              <a href="https://maps.google.com" className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"><MapPin className="w-5 h-5" /></a>
           </div>
        </div>

        {/* Action Links */}
        <div className="space-y-4 mb-12">
           <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground opacity-40 ml-2">Navegação Rápida</h3>
           <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
             <Link to="/loja" className="flex items-center justify-between p-5 rounded-[24px] bg-white/5 border border-white/10 hover:border-highlight/50 transition-all group">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 rounded-xl bg-highlight/20 flex items-center justify-center text-highlight"><Sparkles className="w-5 h-5" /></div>
                   <span className="font-bold text-sm tracking-tight italic">Loja Completa</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-highlight transition-all" />
             </Link>
           </motion.div>
        </div>

        {/* Categories Grid */}
        <div className="space-y-6 mb-12">
          <div className="flex items-center justify-between ml-2">
             <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-40">Categorias</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
             {categories.map((cat, idx) => (
               <Link 
                key={cat.id} 
                to={`/loja?node=${cat.id}`}
                className="relative h-32 rounded-[24px] overflow-hidden group bg-white/5 border border-white/10"
               >
                 {cat.image_url && <img src={cat.image_url} className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:scale-110 transition-all duration-700" alt="" />}
                 <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent p-4 flex flex-col justify-end">
                    <span className="text-xs font-black uppercase tracking-widest">{cat.name}</span>
                 </div>
               </Link>
             ))}
          </div>
        </div>

        {/* Featured Products */}
        <div className="space-y-6">
           <div className="flex items-center justify-between ml-2">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-40">Destaques</h3>
           </div>
           {featuredProducts.map((p: any) => (
             <Link 
              key={p.id} 
              to={`/loja/${p.slug || p.id}`}
              className="flex items-center gap-4 p-4 rounded-[28px] bg-white/5 border border-white/5 hover:bg-white/[0.08] transition-all group"
             >
                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white/10 shrink-0">
                   <img src={p.product_images?.[0]?.image_url || "/placeholder.svg"} className="w-full h-full object-cover" alt="" />
                </div>
                <div className="flex-1 min-w-0">
                   <h4 className="font-bold text-sm truncate">{p.name}</h4>
                   <p className="text-highlight font-black text-xs">R$ {(p.sale_price || p.price).toFixed(2)}</p>
                </div>
                <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                   <ChevronRight className="w-4 h-4" />
                </div>
             </Link>
           ))}
        </div>

        {/* Footer */}
        <div className="text-center mt-16 mt-20">
           <p className="text-[9px] font-black uppercase tracking-[0.5em] text-muted-foreground opacity-30">ImPlotter Studio © 2026</p>
           <p className="text-[8px] font-bold text-highlight mt-2 uppercase tracking-widest">Tecnologia Impression Engine</p>
        </div>
      </div>
    </div>
  );
}
