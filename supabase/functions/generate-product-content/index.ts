import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é um especialista em criação de conteúdo para produtos de gráfica e impressão digital. 
Dado o nome de um produto, gere conteúdo profissional e otimizado para SEO em português brasileiro.

Se for fornecida uma lista de categorias, sugira a mais adequada (retornando o ID se fornecido, ou o nome).

Responda APENAS com um JSON válido (sem markdown, sem backticks) no seguinte formato:
{
  "short_description": "Frase curta, técnica e direta (máx 160 caracteres) para listagem",
  "full_description": "APENAS especificações e detalhes técnicos em HTML. Formate como uma <ul> técnica. NÃO inclua textos de marketing, slogans ou descrições comerciais longas. Foco apenas no material, gramatura, acabamento, tamanho, etc.",
  "specifications": "Idem a full_description, lista estrita de parâmetros técnicos.",
  "keywords": "palavras-chave separadas por vírgula, relevantes para SEO",
  "meta_title": "Título otimizado para SEO (máx 60 caracteres)",
  "category_suggestion": "ID ou Nome da categoria sugerida da lista fornecida"
}

Contexto: Somos a Gráfica ImPlotter, especializada em impressão digital de alta qualidade. 
Produtos comuns: adesivos, banners, cartões de visita, panfletos, faixas, placas, etiquetas, rótulos, etc.
Adapte o conteúdo ao tipo de produto identificado pelo nome.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productName, categories } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
    if (!productName?.trim()) throw new Error("Nome do produto é obrigatório");

    let promptSuffix = `Gere conteúdo para o produto: "${productName}"`;
    if (categories && Array.isArray(categories) && categories.length > 0) {
      promptSuffix += `\n\nCategorias disponíveis (escolha uma): ${JSON.stringify(categories)}`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: promptSuffix },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Muitas requisições. Tente novamente em instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("Erro no serviço de IA");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) throw new Error("Sem resposta da IA");

    // Parse JSON from response (handle potential markdown wrapping)
    let cleaned = content.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const parsed = JSON.parse(cleaned);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-product-content error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
