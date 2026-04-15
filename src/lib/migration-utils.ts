
export interface MigrationVariation {
  code: string;
  qty: string;
  w: string;
  h: string;
  price: number;
  cores: string;
  weight: string;
}

export interface MigrationProduct {
  name: string;
  variations: MigrationVariation[];
}

export interface MigrationCategory {
  name: string;
  products: Record<string, MigrationProduct>;
}

export const SHIPPING_COST = 8.90;
export const DEFAULT_MARKUP = 1.8; // 80% profit margin

export function toSlug(text: string): string {
  return text.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function toCaps(text: string): string {
  return (text || '').toUpperCase().trim();
}

export function parsePdfText(text: string): Record<string, MigrationCategory> {
  const lines = text.split('\n');
  const categories: Record<string, MigrationCategory> = {};

  lines.forEach(line => {
    line = line.trim();
    if (!line || line.includes('TABELA DE SERVIÇOS') || line.includes('Código Categoria')) return;

    // Improved regex: CODE (optional, 2-10 chars or numeric), CATEGORY, DESCRIPTION...
    // Pattern: (CODE)? CATEGORY DESCRIPTION CORES WEIGHT QTY WxH DURATION PRICE
    let m = line.match(/^(\S{2,15})?\s*(.*?)\s+(.*?)\s+(\d+X\d+)\s+(\d+)\s+(\d+)\s+([\d,.]+)\s+x\s+([\d,.]+)\s+(\d+)\s+R\$\s*([\d,.]+)/);
    
    if (m) {
      const [_, potentialCode, cat, desc, cores, weight, qty, w, h, duration, priceStr] = m;
      let code = potentialCode || "";
      let finalCat = cat;
      let finalDesc = desc;

      // Logic: If potentialCode is just a word (no digits) and it's long, or if it matches the category context, it's probably NOT a code
      if (potentialCode && !/\d/.test(potentialCode) && (potentialCode.length > 4 || potentialCode === "C")) {
         code = "";
         finalCat = potentialCode + " " + cat;
      }

      const fullCat = toCaps(finalCat);
      const subCat = toCaps(finalDesc);
      
      if (!categories[fullCat]) categories[fullCat] = { name: fullCat, products: {} };
      if (!categories[fullCat].products[subCat]) categories[fullCat].products[subCat] = { name: subCat, variations: [] };
      
      categories[fullCat].products[subCat].variations.push({
        code: toCaps(code),
        cores: toCaps(cores),
        weight: toCaps(weight),
        qty, w, h,
        price: parseFloat(priceStr.replace('.', '').replace(',', '.'))
      });
    }
  });

  return categories;
}

export interface MigrationOptions {
  includeDescriptions?: boolean;
  descriptions?: Record<string, { short: string; full: string; metaTitle?: string; metaDesc?: string; keywords?: string }>;
  separateAttributes?: boolean;
  showSize?: boolean;
  showWeight?: boolean;
  showCores?: boolean;
  showQty?: boolean;
}

export function generateSql(
  categories: Record<string, MigrationCategory>, 
  options: MigrationOptions = { showSize: true, showCores: true, showWeight: true, showQty: true }
): string {
  let sql = "-- SCRIPT DE IMPORTAÇÃO GERADO PELO SISTEMA\nBEGIN;\n\n";

  Object.values(categories).forEach(category => {
    const catName = category.name;
    const catSlug = toSlug(catName);
    
    sql += `-- CATEGORIA: ${catName}\n`;
    sql += `INSERT INTO public.catalog_nodes (id, name, slug, parent_id, is_active) \n`;
    sql += `VALUES (gen_random_uuid(), '${catName}', '${catSlug}', NULL, true) \n`;
    sql += `ON CONFLICT (slug) DO NOTHING;\n\n`;

    Object.values(category.products).forEach(product => {
      const prodName = product.name;
      const prodSlug = toSlug(prodName);
      const descData = options.descriptions?.[prodName] || { short: '', full: '', metaTitle: '', metaDesc: '', keywords: '' };

      sql += `  -- PRODUTO: ${prodName}\n`;
      
      // Sort variations by quantity, then price
      const sortedVariations = [...product.variations].sort((a, b) => {
        const qtyA = parseInt(a.qty) || 0;
        const qtyB = parseInt(b.qty) || 0;
        if (qtyA !== qtyB) return qtyA - qtyB;
        return a.price - b.price;
      });

      const variations = sortedVariations.map(v => {
        const costAdj = v.price + SHIPPING_COST;
        const priceAdj = Math.round(costAdj * DEFAULT_MARKUP * 100) / 100;
        
        let labelParts = [];
        if (options.showQty) labelParts.push(`${v.qty} UN`);
        if (options.showCores) labelParts.push(v.cores);
        if (options.showWeight) labelParts.push(`PAPEL ${v.weight}`);
        if (options.showSize) labelParts.push(`(${v.w}X${v.h}MM)`);
        
        const optName = labelParts.length > 0 ? labelParts.join(" - ").toUpperCase() : `OPÇÃO ${v.code}`;
        
        return {
          name: optName,
          price_adj: priceAdj,
          cost_adj: Math.round(costAdj * 100) / 100,
          code: v.code,
          _qty: v.qty,
          _cores: v.cores
        };
      });

      let finalSchema = [];
      
      if (options.separateAttributes) {
        // Find unique quantities and unique colors
        const uniqueQtys = Array.from(new Set(variations.map(v => v._qty)));
        const uniqueCores = Array.from(new Set(variations.map(v => v._cores)));
        
        // Base combination for 0-delta reference
        const baseQty = uniqueQtys[0];
        const baseColor = uniqueCores[0];
        
        // Quantidades as Base Prices (using the first color as reference)
        const qtyOptions = uniqueQtys.map(q => {
          const matching = variations.find(v => v._qty === q && v._cores === baseColor);
          const p = matching?.price_adj || 0;
          return { 
            name: `${q} UNIDADES${p > 0 ? ` (+ R$ ${p.toFixed(2)})` : ""}`, 
            price_adj: p,
            _val: q 
          };
        });
        
        // Cores as Adjustments (using the first quantity as reference)
        const colorOptions = uniqueCores.map(c => {
          const baseVar = variations.find(v => v._qty === baseQty && v._cores === baseColor);
          const variantVar = variations.find(v => v._qty === baseQty && v._cores === c);
          const delta = (variantVar?.price_adj || 0) - (baseVar?.price_adj || 0);
          
          return { 
            name: `${c}${delta !== 0 ? ` (${delta > 0 ? "+" : "-"} R$ ${Math.abs(delta).toFixed(2)})` : ""}`, 
            price_adj: Math.round(delta * 100) / 100,
            _val: c
          };
        });

        // Add compatibility map
        const combinations = variations.map(v => ({ q: v._qty, c: v._cores }));

        finalSchema = [
          { 
            id: "qty", 
            label: "QUANTIDADE", 
            type: "select", 
            ui_type: "select", 
            options: qtyOptions,
            combinations // All valid pairs
          },
          { 
            id: "cores", 
            label: "CORES", 
            type: "select", 
            ui_type: "select", 
            options: colorOptions 
          }
        ];
      } else {
        finalSchema = [{
          id: "format",
          label: "VARIAÇÃO TÉCNICA",
          type: "select",
          ui_type: "select",
          options: variations.map(({_qty, _cores, ...rest}) => rest)
        }];
      }

      const schema = JSON.stringify(finalSchema).replace(/'/g, "''");

      const shortDesc = descData.short.replace(/'/g, "''");
      const fullDesc = descData.full.replace(/'/g, "''");
      const metaTitle = (descData.metaTitle || prodName).replace(/'/g, "''");
      const metaDesc = (descData.metaDesc || descData.short).replace(/'/g, "''");
      const keywords = (descData.keywords || '').replace(/'/g, "''");

      sql += `  INSERT INTO public.products (id, name, slug, catalog_node_id, configuration_schema, is_active, price, pricing_type, short_description, full_description, meta_title, meta_description, keywords) \n`;
      sql += `  VALUES (gen_random_uuid(), '${prodName}', '${prodSlug}-prod', (SELECT id FROM catalog_nodes WHERE slug='${catSlug}'), '${schema}', false, 0, 'fixed', '${shortDesc}', '${fullDesc}', '${metaTitle}', '${metaDesc}', '${keywords}') \n`;
      sql += `  ON CONFLICT (slug) DO UPDATE SET configuration_schema = EXCLUDED.configuration_schema, full_description = EXCLUDED.full_description, short_description = EXCLUDED.short_description, meta_title = EXCLUDED.meta_title, meta_description = EXCLUDED.meta_description, keywords = EXCLUDED.keywords;\n\n`;
    });
  });

  sql += "COMMIT;";
  return sql;
}
