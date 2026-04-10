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
      .is("parent_id", null)
      .eq("is_active", true)
      .order("name")
      .then(({ data }) => {
        if (data && data.length > 0) {
          setCategories(data as CatalogNode[]);
        } else {
          // Fallback
          setCategories([
            { id: "1", parent_id: null, name: "Cartões de Visita", slug: "cartoes-de-visita", image_url: null, description: "Impressão premium em diversos acabamentos" },
            { id: "2", parent_id: null, name: "Banners", slug: "banners", image_url: null, description: "Alta definição para eventos e fachadas" },
            { id: "3", parent_id: null, name: "Adesivos", slug: "adesivos", image_url: null, description: "Personalizados em diversos formatos" },
            { id: "4", parent_id: null, name: "Panfletos", slug: "panfletos", image_url: null, description: "Divulgação com qualidade profissional" },
          ]);
        }
      });
  }, []);

  return (
    <section className="py-24 bg-background relative">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <span className="text-highlight text-sm font-semibold tracking-wider uppercase mb-3 block">Nosso Catálogo</span>
          <h2 className="font-display text-3xl md:text-5xl font-bold text-foreground mb-4">
            Categorias em Destaque
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto text-lg">
            Encontre o material gráfico ideal para impulsionar seu negócio
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {categories.map((cat, i) => (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              viewport={{ once: true }}
            >
              <Link
                to={`/loja?path=${cat.id}`}
                className="group relative block overflow-hidden rounded-2xl aspect-[4/5] glass-card glass-card-hover transition-all duration-500"
              >
                <img
                  src={cat.image_url || fallbackImages[cat.slug] || "/placeholder.svg"}
                  alt={cat.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h3 className="font-display font-bold text-foreground text-xl mb-1">{cat.name}</h3>
                  {cat.description && (
                    <p className="text-muted-foreground text-sm mb-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">{cat.description}</p>
                  )}
                  <span className="inline-flex items-center gap-1 text-highlight text-sm font-semibold group-hover:gap-2 transition-all">
                    Ver produtos <ArrowRight className="w-4 h-4" />
                  </span>
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
