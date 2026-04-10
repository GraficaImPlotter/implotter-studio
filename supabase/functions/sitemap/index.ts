import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE_URL = "https://graficaimplotter.shop";

const corsHeaders = {
  "Content-Type": "application/xml; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "public, max-age=3600",
};

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Fetch all active products
  const { data: products } = await supabase
    .from("products")
    .select("slug, updated_at")
    .eq("is_active", true)
    .order("updated_at", { ascending: false });

  // Fetch active kits
  const { data: kits } = await supabase
    .from("kits")
    .select("slug, updated_at")
    .eq("is_active", true)
    .order("updated_at", { ascending: false });

  // Fetch published blog posts
  const { data: posts } = await supabase
    .from("blog_posts")
    .select("slug, updated_at")
    .eq("is_published", true)
    .order("updated_at", { ascending: false });

  // Static pages
  const staticPages = [
    { loc: "/", priority: "1.0", changefreq: "daily" },
    { loc: "/loja", priority: "0.9", changefreq: "daily" },
    { loc: "/blog", priority: "0.8", changefreq: "weekly" },
    { loc: "/nossa-historia", priority: "0.6", changefreq: "monthly" },
    { loc: "/fale-conosco", priority: "0.7", changefreq: "monthly" },
    { loc: "/avaliacoes", priority: "0.6", changefreq: "weekly" },
    { loc: "/faq", priority: "0.5", changefreq: "monthly" },
    { loc: "/afiliados", priority: "0.4", changefreq: "monthly" },
    { loc: "/politica-de-privacidade", priority: "0.3", changefreq: "yearly" },
    { loc: "/termos-de-uso", priority: "0.3", changefreq: "yearly" },
  ];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

  // Static pages
  for (const page of staticPages) {
    xml += `  <url>
    <loc>${SITE_URL}${page.loc}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
`;
  }

  // Products
  for (const p of products ?? []) {
    xml += `  <url>
    <loc>${SITE_URL}/loja/${p.slug}</loc>
    <lastmod>${new Date(p.updated_at).toISOString().split("T")[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;
  }

  // Kits
  for (const k of kits ?? []) {
    xml += `  <url>
    <loc>${SITE_URL}/kit/${k.slug}</loc>
    <lastmod>${new Date(k.updated_at).toISOString().split("T")[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
`;
  }

  // Blog posts
  for (const post of posts ?? []) {
    xml += `  <url>
    <loc>${SITE_URL}/blog/${post.slug}</loc>
    <lastmod>${new Date(post.updated_at).toISOString().split("T")[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
`;
  }

  xml += `</urlset>`;

  return new Response(xml, { headers: corsHeaders });
});
