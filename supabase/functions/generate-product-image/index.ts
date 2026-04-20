import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productName } = await req.json();
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    // We prefer OpenAI directly for images, but can try a gateway if configured
    const apiKey = OPENAI_API_KEY || LOVABLE_API_KEY;

    if (!apiKey) {
      throw new Error("API Key (OPENAI or LOVABLE) is not configured in Supabase secrets");
    }

    if (!productName?.trim()) {
      throw new Error("O nome do produto é obrigatório para gerar a imagem");
    }

    const prompt = `A professional, high-resolution studio product photography of ${productName}. 
    Clean workspace background or neutral studio backdrop. 
    Professional lighting, 8k resolution, minimalist mockup style. 
    Subtle and elegant branding that includes the text 'IMPLOTTER' printed or embossed on the product.`;

    console.log(`Generating image for: ${productName}`);

    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: prompt,
        n: 1,
        size: "1024x1024",
        quality: "hd",
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("OpenAI Error:", errorData);
      throw new Error(errorData.error?.message || "Erro ao gerar imagem na OpenAI");
    }

    const data = await response.json();
    const imageUrl = data.data?.[0]?.url;

    if (!imageUrl) {
      throw new Error("Não foi possível obter a URL da imagem gerada");
    }

    return new Response(JSON.stringify({ imageUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-product-image error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
