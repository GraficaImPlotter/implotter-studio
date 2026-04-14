import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import catCartoes from "@/assets/cat-cartoes.jpg";
import catBanners from "@/assets/cat-banners.jpg";
import catAdesivos from "@/assets/cat-adesivos.jpg";
import catPanfletos from "@/assets/cat-panfletos.jpg";

const fallbackImages: Record<string, string> = {
  "cartoes-de-visita": catCartoes,
  banners: catBanners,
  adesivos: catAdesivos,
  panfletos: catPanfletos,
};

interface CatalogNode {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  image_url: string | null;
  description: string | null;
}

const CategoriesSection = () => {
  const [categories, setCategories] = useState<CatalogNode[]>([]);

  useEffect(() => {
    supabase
      .from("catalog_nodes")
      .select("*")
      .eq("show_on_home", true)
      .eq("is_active", true)
      .not("image_url", "is", null) // Strictly require image as requested
      .order("name")
      .limit(6)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setCategories(data as CatalogNode[]);
        } else {
          // Fallback to initial 4 if none marked for home yet
          setCategories([
            { id: "1", parent_id: null, name: "Cartões de Visita", slug: "cartoes-de-visita", image_url: catCartoes, description: "Impressão premium em diversos acabamentos" },
            { id: "2", parent_id: null, name: "Banners", slug: "banners", image_url: catBanners, description: "Alta definição para eventos e fachadas" },
            { id: "3", parent_id: null, name: "Adesivos", slug: "adesivos", image_url: catAdesivos, description: "Personalizados em diversos formatos" },
            { id: "4", parent_id: null, name: "Panfletos", slug: "panfletos", image_url: catPanfletos, description: "Divulgação com qualidade profissional" },
          ] as any);
        }
      });
  }, []);

  return (
    <section className="py-24 bg-background relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-highlight/5 rounded-full blur-3xl translate-y-1/2" />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold tracking-widest uppercase mb-4">
            <ArrowRight className="w-3 h-3" /> Catálogo Premium
          </div>
          <h2 className="font-display text-4xl md:text-6xl font-black text-foreground mb-6 tracking-tight">
            Categorias em <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-highlight">Destaque</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg leading-relaxed">
            Selecione o segmento desejado e descubra soluções impressas personalizadas para elevar o patamar da sua marca.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 md:gap-8 max-w-7xl mx-auto">
          {categories.slice(0, 6).map((cat, i) => (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              viewport={{ once: true }}
              className="text-center"
            >
              <Link
                to={`/loja?node=${cat.id}`}
                className="group block space-y-4"
              >
                {/* Sharp Square Image Container */}
                <div className="relative aspect-square rounded-lg overflow-hidden bg-white shadow-xl group-hover:shadow-glow transition-all duration-500 border border-border/40 group-hover:border-primary/40 p-3">
                   <div className="w-full h-full rounded-md overflow-hidden bg-white">
                    <img
                      src={cat.image_url || "/placeholder.svg"}
                      alt={cat.name}
                      className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-110"
                    />
                   </div>
                   {/* Subtle Overlay */}
                   <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategoriesSection;
