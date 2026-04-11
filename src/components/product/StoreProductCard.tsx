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
}

const StoreProductCard = ({ p, index, getImage, onAdd }: ProductCardProps) => {
  const hasPromo = p.sale_price && Number(p.sale_price) < Number(p.price) && p.pricing_type !== "per_sqm";
  const displayPrice = hasPromo ? Number(p.sale_price) : Number(p.price);
  const isSqm = p.pricing_type === "per_sqm";
  const colorMode = p.color_mode || "";
  const quantity = p.default_quantity || "";
  const productCode = p.product_code || "";

  const infoParts = [colorMode, quantity ? `${quantity} un` : "", productCode].filter(Boolean);
  const infoLine = infoParts.join(" • ");

  const formatName = (name: string) => {
    return name.toLowerCase().replace(/(?:^|\s|["'([{])+\S/g, l => l.toUpperCase());
  };

  const [imgError, setImgError] = useState(false);
  const displayImage = imgError || !getImage(p) ? "/placeholder.svg" : getImage(p);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ 
        delay: index * 0.05, 
        duration: 0.5,
        ease: [0.22, 1, 0.36, 1] 
      }}
      whileHover={{ y: -8 }}
      className="glass-card-premium rounded-2xl overflow-hidden group hover:shadow-glow hover:border-primary/40 transition-all duration-300 flex flex-col border-gradient-premium product-card-glow"
    >
      {/* Image Container */}
      <Link to={`/loja/${p.slug}`} className="block relative aspect-[4/3] overflow-hidden bg-muted">
        <img 
          src={displayImage} 
          alt={p.name} 
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" 
          loading="lazy" 
          width={400}
          height={300}
          onError={() => setImgError(true)}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Badges */}
        <DynamicBadges product={p} />
        {isSqm && (
          <span className="absolute top-3 right-3 bg-primary/90 backdrop-blur-md text-primary-foreground text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-lg">
            <Ruler className="w-3 h-3" /> Por m²
          </span>
        )}
      </Link>

      {/* Content */}
      <div className="p-4 sm:p-5 flex flex-col flex-1">
        {/* Meta Info */}
        <div className="flex items-center gap-2 mb-2">
          {infoLine && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded">
              {infoLine}
            </span>
          )}
          {p.estimated_days && (
            <span className="text-[10px] font-medium text-muted-foreground ml-auto flex items-center gap-1">
              <Clock className="w-3 h-3" /> {p.estimated_days}d
            </span>
          )}
        </div>

        {/* Product Name */}
        <Link to={`/loja/${p.slug}`} className="mb-4">
          <h3 className="text-sm font-bold text-foreground leading-tight line-clamp-2 group-hover:text-primary transition-colors min-h-[2.5rem]">
            {formatName(p.name)}
          </h3>
        </Link>

        {/* Price & Action */}
        <div className="mt-auto pt-4 border-t border-white/5">
          <div className="flex items-end justify-between gap-2 mb-4">
            <div className="flex flex-col">
              {hasPromo && (
                <span className="text-[10px] line-through text-muted-foreground mb-0.5">
                  R$ {Number(p.price).toFixed(2)}
                </span>
              )}
              <div className="flex items-baseline gap-1">
                <span className="text-xs font-medium text-muted-foreground">R$</span>
                <span className={`text-xl font-black tracking-tight ${hasPromo ? "text-destructive" : "text-foreground"}`}>
                  {isSqm ? Number(p.price_per_sqm).toFixed(2) : displayPrice.toFixed(2)}
                </span>
                {isSqm && <span className="text-[10px] text-muted-foreground">/m²</span>}
              </div>
            </div>
            
            {/* Quick Buy Button (Desktop only) */}
            <Button
              size="icon"
              className="hidden md:flex rounded-full w-10 h-10 bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground transition-all duration-300 shadow-sm hover:shadow-glow-sm flex-shrink-0"
              onClick={(e) => { e.preventDefault(); onAdd(p); }}
            >
              <ShoppingCart className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex gap-1.5 sm:gap-2">
            <Link to={`/loja/${p.slug}`} className="flex-1 min-w-0">
              <Button variant="outline" size="sm" className="w-full rounded-xl text-[10px] xl:text-[11px] px-1 font-bold h-9 md:h-10 border-white/10 hover:bg-white/5 transition-all line-clamp-1">
                Detalhes
              </Button>
            </Link>
            <Button
              size="sm"
              className="flex-1 min-w-0 rounded-xl text-[10px] xl:text-[11px] px-1 font-black h-9 md:h-10 bg-success text-success-foreground hover:bg-success/90 shadow-lg active:scale-95 transition-all line-clamp-1"
              onClick={(e) => { e.preventDefault(); onAdd(p); }}
            >
              Comprar
            </Button>
          </div>
        </div>
      </div>
    </motion.div>

  );
};

export default StoreProductCard;
