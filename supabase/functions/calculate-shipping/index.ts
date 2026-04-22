import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MELHOR_ENVIO_API = "https://melhorenvio.com.br/api/v2/me/shipment/calculate";

async function getToken() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: tokenRow } = await supabase
    .from("melhor_envio_tokens")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!tokenRow) {
    // Fallback to static token
    return Deno.env.get("MELHOR_ENVIO_TOKEN") || null;
  }

  // Check if token needs refresh
  if (new Date(tokenRow.expires_at) < new Date()) {
    const clientId = Deno.env.get("MELHOR_ENVIO_CLIENT_ID");
    const clientSecret = Deno.env.get("MELHOR_ENVIO_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      return tokenRow.access_token; // try expired token anyway
    }

    const resp = await fetch("https://melhorenvio.com.br/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        grant_type: "refresh_token",
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: tokenRow.refresh_token,
      }),
    });

    if (!resp.ok) {
      console.error("Token refresh failed");
      return tokenRow.access_token; // try expired token
    }

    const data = await resp.json();
    const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

    await supabase
      .from("melhor_envio_tokens")
      .update({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", tokenRow.id);

    return data.access_token;
  }

  return tokenRow.access_token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const token = await getToken();
    if (!token) {
      return new Response(JSON.stringify({ error: "Token Melhor Envio não configurado. Por favor, conecte sua conta nas configurações do Admin." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { cep_destino, cep_origem, peso, altura, largura, comprimento, valor } = await req.json();

    if (!cep_destino) {
      return new Response(JSON.stringify({ error: "CEP de destino obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = {
      from: { postal_code: (cep_origem || "01001000").replace(/\D/g, "") },
      to: { postal_code: cep_destino.replace(/\D/g, "") },
      products: [
        {
          id: "1",
          width: largura || 11,
          height: altura || 2,
          length: comprimento || 16,
          weight: peso || 0.3,
          insurance_value: valor || 50,
          quantity: 1,
        },
      ],
    };

    const response = await fetch(MELHOR_ENVIO_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "ImPlotter graficaimplotter.shop contato@implotter.com.br",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      let details = errText;
      try {
        const errJson = JSON.parse(errText);
        details = errJson.message || errJson.error || errText;
      } catch { /* use raw text */ }
      
      console.error("Melhor Envio API Error:", response.status, errText);
      return new Response(JSON.stringify({ 
        error: "Erro na API do Melhor Envio", 
        details: details,
        status: response.status 
      }), {
        status: 200, // Return 200 so the client can read the error JSON smoothly
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();

    const options = (Array.isArray(data) ? data : [])
      .filter((s: any) => !s.error && s.price)
      .map((s: any) => ({
        id: s.id,
        name: s.name,
        company: s.company?.name || "",
        price: parseFloat(s.price) || 0,
        discount: parseFloat(s.discount) || 0,
        delivery_time: s.delivery_time || 0,
        currency: s.currency || "BRL",
      }));

    return new Response(JSON.stringify({ options }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Shipping calc error:", err);
    return new Response(JSON.stringify({ error: "Erro interno ao calcular frete", details: err instanceof Error ? err.message : String(err) }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
