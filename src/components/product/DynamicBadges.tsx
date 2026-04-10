import { Star, Flame, Sparkles, Tag } from "lucide-react";

interface DynamicBadgesProps {
  product: {
    is_featured?: boolean;
    sale_price?: number | null;
    price?: number;
    pricing_type?: string;
    created_at?: string;
  };
}

const DynamicBadges = ({ product }: DynamicBadgesProps) => {
  const badges: { icon: React.ElementType; label: string; className: string }[] = [];

  // Best seller badge
  if (product.is_featured) {
    badges.push({
      icon: Flame,
      label: "Mais Vendido",
      className: "bg-warning text-warning-foreground",
    });
  }

  // Promo badge
  const hasPromo = product.sale_price && Number(product.sale_price) < Number(product.price) && product.pricing_type !== "per_sqm";
  if (hasPromo) {
    const pct = Math.round((1 - Number(product.sale_price) / Number(product.price!)) * 100);
    badges.push({
      icon: Tag,
      label: `${pct}% OFF`,
      className: "bg-destructive text-destructive-foreground",
    });
  }

  // New badge (created within last 14 days)
  if (product.created_at) {
    const daysSinceCreation = (Date.now() - new Date(product.created_at).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceCreation <= 14 && !product.is_featured) {
      badges.push({
        icon: Sparkles,
        label: "Novo",
        className: "bg-primary text-primary-foreground",
      });
    }
  }

  if (badges.length === 0) return null;

  return (
    <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-10">
      {badges.map((badge, i) => {
        const Icon = badge.icon;
        return (
          <span key={i} className={`${badge.className} text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-sm`}>
            <Icon className="w-3 h-3" /> {badge.label}
          </span>
        );
      })}
    </div>
  );
};

export default DynamicBadges;
