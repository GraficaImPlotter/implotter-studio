import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MELHOR_ENVIO_TOKEN_URL = "https://melhorenvio.com.br/oauth/token";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientId = Deno.env.get("MELHOR_ENVIO_CLIENT_ID");
    const clientSecret = Deno.env.get("MELHOR_ENVIO_CLIENT_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!clientId || !clientSecret) {
      return new Response(JSON.stringify({ error: "Credenciais OAuth não configuradas" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { code, redirect_uri, action } = await req.json();

    // Action: refresh - refresh existing token
    if (action === "refresh") {
      const supabase = createClient(supabaseUrl!, serviceRoleKey!);
      const { data: tokenRow } = await supabase
        .from("melhor_envio_tokens")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!tokenRow?.refresh_token) {
        return new Response(JSON.stringify({ error: "Nenhum token encontrado para refresh" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const resp = await fetch(MELHOR_ENVIO_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          grant_type: "refresh_token",
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: tokenRow.refresh_token,
        }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        return new Response(JSON.stringify({ error: "Erro no refresh", details: data }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

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

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: exchange code for tokens
    if (!code || !redirect_uri) {
      return new Response(JSON.stringify({ error: "code e redirect_uri obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resp = await fetch(MELHOR_ENVIO_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirect_uri,
        code: code,
      }),
    });

    const data = await resp.json();
    if (!resp.ok) {
      console.error("OAuth exchange error:", data);
      return new Response(JSON.stringify({ error: "Erro na troca do código", details: data }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
    const supabase = createClient(supabaseUrl!, serviceRoleKey!);

    // Delete old tokens and insert new one
    await supabase.from("melhor_envio_tokens").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("melhor_envio_tokens").insert({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: expiresAt,
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("OAuth error:", err);
    return new Response(JSON.stringify({ error: "Erro interno OAuth" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
