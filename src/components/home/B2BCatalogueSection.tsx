import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import {
  UserRound,
  Megaphone,
  Presentation,
  Layers,
  Tag,
  BookOpen,
  Box,
  Stamp,
  Shirt,
  FolderArchive,
  Gift,
  Calendar,
  LayoutGrid,
  Printer
} from "lucide-react";

// Dicionário de ícones automático baseado no nome da categoria
const getIconForCategory = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes("cartão") || n.includes("cartoes")) return UserRound;
  if (n.includes("panfleto") || n.includes("folder") || n.includes("flyer")) return Megaphone;
  if (n.includes("lona") || n.includes("banner") || n.includes("faixa")) return Presentation;
  if (n.includes("adesivo") || n.includes("vinil") || n.includes("recorte")) return Layers;
  if (n.includes("tag") || n.includes("rótulo") || n.includes("rotulo")) return Tag;
  if (n.includes("livreto") || n.includes("revista") || n.includes("miolo")) return BookOpen;
  if (n.includes("embalagem") || n.includes("caixa") || n.includes("sacola")) return Box;
  if (n.includes("carimbo")) return Stamp;
  if (n.includes("camise") || n.includes("uniforme") || n.includes("tecido")) return Shirt;
  if (n.includes("pasta")) return FolderArchive;
  if (n.includes("caneca") || n.includes("brinde")) return Gift;
  if (n.includes("calendário") || n.includes("folhinha")) return Calendar;
  return Printer; // fallback mais condizente com gráfica
};

const B2BCatalogueSection = () => {
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase
        .from("catalog_nodes")
        .select("id, name, slug, image_url")
        .eq("is_active", true)
        .is("parent_id", null) // Pega apenas categorias macro (pai)
        .order("name")
        .limit(12);

      if (!error && data) {
        setCategories(data);
      }
    };
    fetchCategories();
  }, []);

  return (
    <section className="py-12 bg-secondary/30 relative border-b border-border/40">
      <div className="container mx-auto px-4">
        {/* Title Area */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
              Catálogo Direto
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              Encontre e orce seu material em poucos cliques.
            </p>
          </div>
          <Link
            to="/loja"
            className="hidden sm:inline-flex items-center text-sm font-semibold text-highlight hover:text-highlight/80 transition-colors"
          >
            Ver todos os produtos &rarr;
          </Link>
        </div>

        {categories.length === 0 ? (
          <div className="flex justify-center py-8">
            <span className="w-6 h-6 border-2 border-highlight border-t-transparent rounded-full animate-spin"></span>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4 md:gap-5">
            {categories.map((cat, i) => {
              const Icon = getIconForCategory(cat.name);
              return (
                <motion.div
                  key={cat.id}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  viewport={{ once: true, margin: "-50px" }}
                >
                  <Link
                    to={`/loja?node=${cat.id}`}
                    className="group flex flex-col justify-center items-center gap-4 p-6 rounded-xl glass-card-premium border-gradient-premium hover:shadow-glow-sm hover:-translate-y-1.5 transition-all duration-300 text-center h-full min-h-[140px] relative overflow-hidden active:scale-95"
                  >
                    <div className="absolute top-0 right-0 w-20 h-20 bg-primary/10 rounded-bl-full -mr-10 -mt-10 group-hover:bg-primary/20 transition-all duration-500" />
                    
                    {cat.image_url ? (
                      <div className="w-full h-full absolute inset-0">
                        <img 
                          src={cat.image_url} 
                          alt={cat.name} 
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                        />
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors duration-500" />
                      </div>
                    ) : (
                      <div className="w-14 h-14 rounded-lg carbon-fiber-bg border border-white/5 group-hover:border-primary/30 flex items-center justify-center transition-all duration-500 group-hover:scale-110 shadow-lg group-hover:shadow-glow-sm">
                        <Icon className="w-7 h-7 text-white/50 group-hover:text-primary transition-colors" />
                      </div>
                    )}
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Mobile View All Button */}
        <div className="mt-6 text-center sm:hidden">
          <Link
            to="/loja"
            className="inline-flex items-center text-sm font-semibold text-highlight"
          >
            Navegar no catálogo completo &rarr;
          </Link>
        </div>
      </div>
    </section>
  );
};

export default B2BCatalogueSection;
