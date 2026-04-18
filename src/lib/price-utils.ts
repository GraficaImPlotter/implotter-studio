/**
 * Calcula o preço de exibição ("a partir de") de um produto.
 * 
 * Usa os campos disponíveis nas queries de listagem:
 * - sale_price: preço promocional
 * - price: preço base
 * - price_per_sqm: preço por m² (para produtos do tipo per_sqm)
 * 
 * Nota: configuration_schema não está disponível na listagem pois não
 * consta no schema gerado do Supabase. O preço mínimo real das variações
 * hierárquicas só é calculado na página individual do produto.
 */
export function calculateStartingPrice(product: any): number {
  if (!product) return 0;

  const isSqm = product.pricing_type === "per_sqm";

  if (isSqm) {
    // Para produtos por m², exibir o preço por m² como referência
    return Number(product.price_per_sqm || 0);
  }

  // Para produtos de preço fixo, usar sale_price se disponível, senão price
  return Number(product.sale_price || product.price || 0);
}
