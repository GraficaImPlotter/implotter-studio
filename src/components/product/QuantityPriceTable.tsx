import { useMemo } from "react";
import { motion } from "framer-motion";
import { Tag } from "lucide-react";

interface QuantityPriceTableProps {
  basePrice: number;
  defaultQuantity: number;
  pricingType: string;
}

const QUANTITY_TIERS = [50, 100, 250, 500, 1000, 2000, 5000];

const QuantityPriceTable = ({ basePrice, defaultQuantity, pricingType }: QuantityPriceTableProps) => {
  const unitPrice = defaultQuantity > 1 ? basePrice / defaultQuantity : 0;

  const tiers = useMemo(() => {
    if (pricingType === "per_sqm" || !defaultQuantity || defaultQuantity <= 1) return [];
    // Generate tiers around the default quantity showing volume pricing incentive
    const relevantTiers = QUANTITY_TIERS.filter(q => q >= defaultQuantity * 0.5);
    // Ensure default quantity is included
    const allQtys = new Set([defaultQuantity, ...relevantTiers.slice(0, 5)]);
    return Array.from(allQtys)
      .sort((a, b) => a - b)
      .slice(0, 6)
      .map(qty => {
        // Simulated volume discount: more quantity = slightly lower unit price
        const ratio = qty / defaultQuantity;
        let discount = 0;
        if (ratio >= 10) discount = 0.15;
        else if (ratio >= 5) discount = 0.10;
        else if (ratio >= 2) discount = 0.05;
        const discountedUnitPrice = unitPrice * (1 - discount);
        return {
          qty,
          unitPrice: discountedUnitPrice,
          totalPrice: discountedUnitPrice * qty,
          discount: Math.round(discount * 100),
          isDefault: qty === defaultQuantity,
        };
      });
  }, [basePrice, defaultQuantity, unitPrice, pricingType]);

  if (tiers.length < 2) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-2xl p-5 mb-6"
    >
      <h3 className="font-display font-semibold text-foreground flex items-center gap-2 mb-3">
        <Tag className="w-4 h-4 text-primary" /> Tabela de Preços por Quantidade
      </h3>
      <p className="text-xs text-muted-foreground mb-3">Quanto mais você compra, mais economiza!</p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 text-muted-foreground font-medium">Quantidade</th>
              <th className="text-right py-2 text-muted-foreground font-medium">Valor Unit.</th>
              <th className="text-right py-2 text-muted-foreground font-medium">Total</th>
              <th className="text-right py-2 text-muted-foreground font-medium">Economia</th>
            </tr>
          </thead>
          <tbody>
            {tiers.map((tier) => (
              <tr
                key={tier.qty}
                className={`border-b border-border/50 last:border-0 ${tier.isDefault ? "bg-primary/5" : ""}`}
              >
                <td className="py-2.5">
                  <span className={`font-semibold ${tier.isDefault ? "text-primary" : "text-foreground"}`}>
                    {tier.qty.toLocaleString("pt-BR")} un
                  </span>
                  {tier.isDefault && (
                    <span className="ml-2 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-semibold">
                      Atual
                    </span>
                  )}
                </td>
                <td className="text-right py-2.5 text-foreground">
                  R$ {tier.unitPrice.toFixed(3)}
                </td>
                <td className="text-right py-2.5 font-semibold text-foreground">
                  R$ {tier.totalPrice.toFixed(2)}
                </td>
                <td className="text-right py-2.5">
                  {tier.discount > 0 ? (
                    <span className="text-success font-semibold text-xs">-{tier.discount}%</span>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-muted-foreground mt-2 italic">
        * Valores estimados. Solicite um orçamento para quantidades personalizadas.
      </p>
    </motion.div>
  );
};

export default QuantityPriceTable;
