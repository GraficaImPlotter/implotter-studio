import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Ruler, Clock, ShoppingCart } from "lucide-react";
import { motion } from "framer-motion";
import DynamicBadges from "./DynamicBadges";
import { getOptimizedUrl } from "@/lib/image-utils";

interface ProductCardProps {
  p: any;
  index: number;
  getImage: (p: any) => string;
  onAdd: (p: any) => void;
  categoryName?: string;
}

const StoreProductCard = ({ p, index, getImage, onAdd, categoryName }: ProductCardProps) => {
  const isSqm = p.pricing_type === "per_sqm";
  const displayPrice = Number(p.sale_price || p.price);
  
  const [imgError, setImgError] = useState(false);
  const displayImage = imgError || !getImage(p) ? "/placeholder.svg" : getImage(p);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05 }}
      className="group bg-white rounded-2xl overflow-hidden border border-border/50 hover:shadow-xl transition-all duration-300 flex flex-col h-full"
    >
      {/* Image */}
      <Link to={`/loja/${p.slug}`} className="block relative aspect-square overflow-hidden bg-slate-50">
        <img 
          src={displayImage} 
          alt={p.name} 
          className="w-full h-full object-contain p-4 transition-transform duration-700 group-hover:scale-105" 
          onError={() => setImgError(true)}
        />
        {p.is_featured && (
          <div className="absolute top-3 left-3 bg-primary text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-lg">
            MAIS VENDIDO
          </div>
        )}
      </Link>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <div className="mb-1">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            {categoryName || "Produto"}
          </p>
          <Link to={`/loja/${p.slug}`}>
            <h3 className="text-sm md:text-base font-bold text-foreground leading-tight line-clamp-2 hover:text-primary transition-colors">
              {p.name}
            </h3>
          </Link>
        </div>

        <div className="mt-auto pt-4">
          <div className="flex flex-col">
            <span className="text-[11px] text-muted-foreground">a partir de</span>
            <div className="flex items-baseline gap-1">
              <span className="text-base font-black text-foreground">
                R$ {displayPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              {p.default_quantity > 1 && (
                <span className="text-[11px] text-muted-foreground">/ {p.default_quantity} unidades</span>
              )}
              {isSqm && <span className="text-[11px] text-muted-foreground">/ m²</span>}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default StoreProductCard;
