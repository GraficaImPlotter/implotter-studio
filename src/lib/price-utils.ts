/**
 * Calcula o preço de exibição ("a partir de") de um produto de forma segura.
 * 
 * Garante que o retorno seja sempre um número válido para evitar crashes
 * ao formatar na UI com .toLocaleString().
 */
export function calculateStartingPrice(product: any): number {
  try {
    if (!product) return 0;

    const isSqm = product.pricing_type === "per_sqm";

    if (isSqm) {
      // Para produtos por m², exibir o preço por m² como referência
      const priceSqm = parseFloat(String(product.price_per_sqm || 0));
      return isNaN(priceSqm) ? 0 : priceSqm;
    }

    // Para produtos de preço fixo, usar sale_price se disponível, senão price
    const basePrice = parseFloat(String(product.sale_price || product.price || 0));
    return isNaN(basePrice) ? 0 : basePrice;
  } catch (error) {
    console.error("Erro ao calcular preço inicial:", error);
    return 0;
  }
}
