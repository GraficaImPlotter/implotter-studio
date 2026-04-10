import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const SITE_URL = "https://graficaimplotter.shop";

  const { data: products } = await supabase
    .from("products")
    .select("id, name, slug, short_description, price, sale_price, pricing_type, price_per_sqm, is_active, product_images(image_url, sort_order)")
    .eq("is_active", true)
    .order("name");

  const items = (products || []).map((p: any) => {
    const images = (p.product_images || []).sort((a: any, b: any) => a.sort_order - b.sort_order);
    const imageUrl = images[0]?.image_url || "";
    const price = p.sale_price && parseFloat(p.sale_price) < parseFloat(p.price)
      ? parseFloat(p.sale_price)
      : parseFloat(p.price);
    const salePrice = p.sale_price && parseFloat(p.sale_price) < parseFloat(p.price)
      ? parseFloat(p.sale_price)
      : null;

    return `
    <item>
      <g:id>${p.id}</g:id>
      <g:title><![CDATA[${p.name}]]></g:title>
      <g:description><![CDATA[${p.short_description || p.name}]]></g:description>
      <g:link>${SITE_URL}/loja/${p.slug}</g:link>
      <g:image_link>${imageUrl}</g:image_link>
      <g:price>${price.toFixed(2)} BRL</g:price>
      ${salePrice ? `<g:sale_price>${salePrice.toFixed(2)} BRL</g:sale_price>` : ""}
      <g:availability>in_stock</g:availability>
      <g:condition>new</g:condition>
      <g:brand>Gráfica ImPlotter</g:brand>
      <g:google_product_category>5181</g:google_product_category>
    </item>`;
  }).join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Gráfica ImPlotter - Product Feed</title>
    <link>${SITE_URL}</link>
    <description>Produtos da Gráfica ImPlotter para Google Shopping</description>
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
    },
  });
});
