export function calculateStartingPrice(product: any): number {
  if (!product) return 0;

  const isSqm = product.pricing_type === "per_sqm";
  const baseUnitPrice = Number(product.sale_price || product.price || 0);
  const defaultQty = Number(product.default_quantity) || 1;

  let minHierarchyPrice = Infinity;
  let hasHierarchy = false;

  // 1. Verificar variações hierárquicas (que definem o preço base)
  if (Array.isArray(product.configuration_schema)) {
    const hierarchy = product.configuration_schema.find((item: any) => item.ui_type === 'hierarchy');
    if (hierarchy && Array.isArray(hierarchy.groups)) {
      hierarchy.groups.forEach((group: any) => {
        if (Array.isArray(group.options)) {
          group.options.forEach((opt: any) => {
            const price = Number(opt.price);
            if (!isNaN(price) && price > 0) {
              if (price < minHierarchyPrice) minHierarchyPrice = price;
              hasHierarchy = true;
            }
          });
        }
      });
    }
  }

  let baseTotal = 0;

  if (hasHierarchy && minHierarchyPrice !== Infinity) {
    baseTotal = minHierarchyPrice;
  } else if (isSqm) {
    const pricePerSqm = Number(product.price_per_sqm) || 0;
    
    // Verificar presets de m²
    const presetsItem = Array.isArray(product.configuration_schema) 
      ? product.configuration_schema.find((item: any) => item.ui_type === 'sqm_presets')
      : null;
    
    if (presetsItem && Array.isArray(presetsItem.options) && presetsItem.options.length > 0) {
      let minPresetArea = Infinity;
      presetsItem.options.forEach((opt: any) => {
        const area = (Number(opt.width) || 0) * (Number(opt.height) || 0);
        if (area > 0 && area < minPresetArea) minPresetArea = area;
      });
      
      if (minPresetArea !== Infinity) {
        baseTotal = (minPresetArea * pricePerSqm) * defaultQty;
      } else {
        baseTotal = (Number(product.min_area || 0) * pricePerSqm) * defaultQty;
      }
    } else {
      baseTotal = (Number(product.min_area || 0) * pricePerSqm) * defaultQty;
    }
  } else {
    // Para produtos simples, aplicamos a mesma lógica de desconto por quantidade do Produto.tsx se aplicável
    // Mas no card "a partir de", geralmente queremos o preço unitário base ou o menor preço de grade
    baseTotal = baseUnitPrice;
    
    // Se não for sqm nem hierarquia, mas tiver grade de quantidade no schema (não hierárquico)
    // podemos somar o menor price_adj
    if (Array.isArray(product.configuration_schema)) {
      product.configuration_schema.forEach((item: any) => {
        if (item.ui_type !== 'hierarchy' && item.ui_type !== 'sqm_presets' && Array.isArray(item.options)) {
          // Se for algo obrigatório (como um 'select' que sempre tem uma opção selecionada no front)
          // poderíamos somar o menor price_adj. Mas para o "a partir de", 
          // se houver opção com price_adj 0 ou negativo, o baseTotal permanece ou diminui.
          let minAdj = Infinity;
          item.options.forEach((opt: any) => {
            const adj = Number(opt.price_adj || 0);
            if (adj < minAdj) minAdj = adj;
          });
          if (minAdj !== Infinity && minAdj !== 0) {
             // baseTotal += minAdj; // Opcional: dependendo se queremos ser agressivos no "a partir de"
          }
        }
      });
    }
  }

  // Fallback final se o cálculo resultar em 0 mas houver um preço base
  if (baseTotal <= 0 && baseUnitPrice > 0) {
    baseTotal = baseUnitPrice;
  }

  return Number(baseTotal.toFixed(2));
}
