/**
 * Constantes globais de precificação
 */
export const FRETE_DILUIDO = 4.50;

/**
 * Arredondamento comercial automático:
 * Sempre termina com .90 ou .99 (preferencialmente .90).
 * Regra: Encontrar o menor valor que termine em .90 e seja >= ao preço base.
 * Exemplo: 61.25 -> 61.90.
 * Exemplo: 61.91 -> 62.90.
 */
export function applyCommercialRounding(price: number): number {
  if (!price || price <= 0) return 0;
  
  const floor = Math.floor(price);
  const candidate = floor + 0.90;
  
  // Se o candidato for menor que o preço original, pula para o próximo real + .90
  return candidate >= price ? candidate : floor + 1.90;
}

/**
 * Interface para os resultados de precificação
 */
export interface PricingResult {
  preco_final: number;
  lucro: number;
  custo_total: number;
}

/**
 * Calcula o preço unitário (ou por pacote)
 */
export function calculateUnitPrice(cost: number, markup: number): PricingResult {
  const custo_total = (Number(cost) || 0) + FRETE_DILUIDO;
  const basePrice = custo_total * (Number(markup) || 1);
  const preco_final = applyCommercialRounding(basePrice);
  const lucro = preco_final - custo_total;
  
  return { preco_final, lucro, custo_total };
}

/**
 * Calcula o preço por área (m²)
 */
export function calculateAreaPrice(costPerSqm: number, width: number, height: number, markup: number): PricingResult {
  const area = (Number(width) || 0) * (Number(height) || 0);
  const custo_total = ((Number(costPerSqm) || 0) * area) + FRETE_DILUIDO;
  const basePrice = custo_total * (Number(markup) || 1);
  const preco_final = applyCommercialRounding(basePrice);
  const lucro = preco_final - custo_total;
  
  return { preco_final, lucro, custo_total };
}

/**
 * Calcula o preço de exibição ("a partir de") de um produto de forma segura.
 * 
 * Prioriza o campo preco_minimo se disponível e maior que zero.
 */
export function calculateStartingPrice(product: any): number {
  try {
    if (!product) return 0;

    // Se o sistema já calculou e armazenou o preço mínimo, usamos ele
    if (product.preco_minimo && product.preco_minimo > 0) {
      return Number(product.preco_minimo);
    }

    const isSqm = product.pricing_type === "per_sqm" || product.tipo_calculo === "area";

    if (isSqm) {
      const priceSqm = parseFloat(String(product.price_per_sqm || 0));
      return isNaN(priceSqm) ? 0 : priceSqm;
    }

    const basePrice = parseFloat(String(product.sale_price || product.price || 0));
    return isNaN(basePrice) ? 0 : basePrice;
  } catch (error) {
    console.error("Erro ao calcular preço inicial:", error);
    return 0;
  }
}
