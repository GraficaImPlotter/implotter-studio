
export interface MigrationVariation {
  code: string;
  qty: string;
  w: string;
  h: string;
  price: number;
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

    // Standard pattern: CODE CATEGORY DESCRIPTION CORES WEIGHT QTY W x H DURATION PRICE
    let m = line.match(/^(\S+)\s+(.*?)\s+(.*?)\s+(\d+X\d+)\s+(\d+)\s+(\d+)\s+([\d,.]+)\s+x\s+([\d,.]+)\s+(\d+)\s+R\$\s*([\d,.]+)/);
    
    // Hardcoded fallback for specific categories that might fail regex due to spacing
    if (!m && (line.includes('AGENDAS, CADERNOS E APOSTILAS') || line.includes('BANNERS E LONAS'))) {
      const code = line.split(' ')[0];
      let cat = '';
      if (line.includes('AGENDAS, CADERNOS E APOSTILAS')) cat = 'AGENDAS, CADERNOS E APOSTILAS';
      else if (line.includes('BANNERS E LONAS')) cat = 'BANNERS E LONAS';
      
      const catIdx = line.indexOf(cat);
      if (catIdx === -1) return;

      const afterCat = line.substring(catIdx + cat.length).trim();
      let m2 = afterCat.match(/^(.*?)\s+(\d+X\d+)\s+(\d+)\s+(\d+)\s+([\d,.]+)\s+x\s+([\d,.]+)\s+(\d+)\s+R\$\s*([\d,.]+)/);
      
      if (m2) {
        const [_, desc, cores, weight, qty, w, h, duration, priceStr] = m2;
        const fullCat = toCaps(cat);
        const subCat = toCaps(desc);
        if (!categories[fullCat]) categories[fullCat] = { name: fullCat, products: {} };
        if (!categories[fullCat].products[subCat]) categories[fullCat].products[subCat] = { name: subCat, variations: [] };
        categories[fullCat].products[subCat].variations.push({
          code: toCaps(code),
          qty, w, h,
          price: parseFloat(priceStr.replace('.', '').replace(',', '.'))
        });
      }
    } else if (m) {
      const [_, code, cat, desc, cores, weight, qty, w, h, duration, priceStr] = m;
      const fullCat = toCaps(cat);
      const subCat = toCaps(desc);
      if (!categories[fullCat]) categories[fullCat] = { name: fullCat, products: {} };
      if (!categories[fullCat].products[subCat]) categories[fullCat].products[subCat] = { name: subCat, variations: [] };
      categories[fullCat].products[subCat].variations.push({
        code: toCaps(code),
        qty, w, h,
        price: parseFloat(priceStr.replace('.', '').replace(',', '.'))
      });
    }
  });

  return categories;
}

export function generateSql(
  categories: Record<string, MigrationCategory>, 
  options: { 
    includeDescriptions?: boolean;
    descriptions?: Record<string, { short: string; full: string }>;
  } = {}
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
      const descData = options.descriptions?.[prodName] || { short: '', full: '' };

      sql += `  -- PRODUTO: ${prodName}\n`;
      
      const variations = product.variations.map(v => {
        const costAdj = v.price + SHIPPING_COST;
        const priceAdj = Math.round(costAdj * DEFAULT_MARKUP * 100) / 100;
        const optName = `${v.w}X${v.h}MM (${v.qty} UN)`.toUpperCase();
        return {
          name: optName,
          price_adj: priceAdj,
          cost_adj: Math.round(costAdj * 100) / 100,
          code: v.code
        };
      });

      const schema = JSON.stringify([{
        id: "format",
        label: "VARIAÇÃO",
        type: "select",
        ui_type: "pills",
        options: variations
      }]).replace(/'/g, "''");

      const shortDesc = descData.short.replace(/'/g, "''");
      const fullDesc = descData.full.replace(/'/g, "''");

      sql += `  INSERT INTO public.products (id, name, slug, main_category_id, configuration_schema, is_active, price, pricing_type, short_description, description) \n`;
      sql += `  VALUES (gen_random_uuid(), '${prodName}', '${prodSlug}-prod', (SELECT id FROM catalog_nodes WHERE slug='${catSlug}'), '${schema}', false, 0, 'fixed', '${shortDesc}', '${fullDesc}') \n`;
      sql += `  ON CONFLICT (slug) DO UPDATE SET configuration_schema = EXCLUDED.configuration_schema, description = EXCLUDED.description, short_description = EXCLUDED.short_description;\n\n`;
    });
  });

  sql += "COMMIT;";
  return sql;
}
