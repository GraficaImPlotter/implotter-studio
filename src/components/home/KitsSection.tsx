import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, ArrowRight } from "lucide-react";

interface Kit {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  normal_price: number;
  promo_price: number;
}

const KitsSection = () => {
  const [kits, setKits] = useState<Kit[]>([]);

  useEffect(() => {
    supabase
      .from("kits")
      .select("id, name, slug, image_url, normal_price, promo_price")
      .eq("is_active", true)
      .eq("is_featured", true)
      .order("sort_order")
      .limit(4)
      .then(({ data }) => {
        if (data && data.length > 0) setKits(data);
      });
  }, []);

  if (kits.length === 0) return null;

  return (
    <section className="py-16 bg-secondary/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-semibold mb-3">
            <Package className="w-4 h-4" />
            Kits Promocionais
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">
            Economize com nossos Kits
          </h2>
          <p className="text-muted-foreground mt-2 max-w-md mx-auto">
            Combos especiais com desconto exclusivo para você
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {kits.map((kit, i) => {
            const discount = kit.normal_price > 0
              ? Math.round(((kit.normal_price - kit.promo_price) / kit.normal_price) * 100)
              : 0;

            return (
              <motion.div
                key={kit.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                viewport={{ once: true }}
              >
                <Link to={`/kit/${kit.slug}`} className="block h-full">
                  <div className="glass-card-premium rounded-3xl overflow-hidden border-gradient-premium hover:shadow-glow-sm hover:-translate-y-2 transition-all duration-300 flex flex-col h-full group product-card-glow">
                    <div className="relative aspect-[4/3] bg-muted overflow-hidden">
                      {kit.image_url ? (
                        <img
                          src={kit.image_url}
                          alt={kit.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center carbon-fiber-bg">
                          <Package className="w-12 h-12 text-white/20" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      
                      <div className="absolute top-3 left-3 flex flex-col gap-2">
                        <span className="bg-primary text-primary-foreground text-[10px] font-black px-2.5 py-1 rounded-full shadow-lg uppercase tracking-tight">KIT PREMIUM</span>
                        {discount > 0 && (
                          <span className="bg-destructive text-destructive-foreground text-[10px] font-black px-2.5 py-1 rounded-full shadow-lg uppercase tracking-tight">
                            -{discount}% OFF
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="p-5 flex flex-col flex-1">
                      <h3 className="font-display font-bold text-sm text-foreground line-clamp-2 mb-4 group-hover:text-primary transition-colors leading-tight min-h-[2.5rem]">
                        {kit.name}
                      </h3>
                      
                      <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
                        <div className="flex flex-col">
                          {kit.normal_price > kit.promo_price && (
                            <span className="text-[10px] text-muted-foreground line-through mb-0.5">
                              R$ {Number(kit.normal_price).toFixed(2)}
                            </span>
                          )}
                          <span className="text-xl font-black text-foreground tracking-tight">
                            R$ {Number(kit.promo_price).toFixed(2)}
                          </span>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                          <ArrowRight className="w-5 h-5" />
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        <div className="text-center mt-8">
          <Button asChild variant="outline" size="lg">
            <Link to="/loja#kits" className="gap-2">
              Ver todos os kits <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default KitsSection;
