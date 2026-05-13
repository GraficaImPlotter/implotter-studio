import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TRACKING_API = "https://melhorenvio.com.br/api/v2/me/shipment/tracking";

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

  if (!tokenRow) return null;

  // Check if token needs refresh
  if (new Date(tokenRow.expires_at) < new Date()) {
    // Try refresh
    const clientId = Deno.env.get("MELHOR_ENVIO_CLIENT_ID");
    const clientSecret = Deno.env.get("MELHOR_ENVIO_CLIENT_SECRET");

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

    if (!resp.ok) return null;
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
    const { tracking_codes } = await req.json();
    if (!tracking_codes || !Array.isArray(tracking_codes) || tracking_codes.length === 0) {
      return new Response(JSON.stringify({ error: "tracking_codes obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = await getToken();
    if (!token) {
      return new Response(JSON.stringify({ error: "Token Melhor Envio não disponível. Configure OAuth primeiro." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch(TRACKING_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "ImPlotter graficaimplotter.com.br contato@implotter.com.br",
      },
      body: JSON.stringify({ orders: tracking_codes }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Tracking API error:", response.status, errText);
      return new Response(JSON.stringify({ error: "Erro ao consultar rastreio", details: errText }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    return new Response(JSON.stringify({ tracking: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Tracking error:", err);
    return new Response(JSON.stringify({ error: "Erro interno ao rastrear" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
