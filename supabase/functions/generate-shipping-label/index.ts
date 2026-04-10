import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ME_API = "https://melhorenvio.com.br/api/v2/me";
const USER_AGENT = "ImPlotter graficaimplotter.shop contato@implotter.com.br";

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
    return Deno.env.get("MELHOR_ENVIO_TOKEN") || null;
  }

  if (new Date(tokenRow.expires_at) < new Date()) {
    const clientId = Deno.env.get("MELHOR_ENVIO_CLIENT_ID");
    const clientSecret = Deno.env.get("MELHOR_ENVIO_CLIENT_SECRET");
    if (!clientId || !clientSecret) return tokenRow.access_token;

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

    if (!resp.ok) return tokenRow.access_token;
    const data = await resp.json();
    const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

    await supabase
      .from("melhor_envio_tokens")
      .update({ access_token: data.access_token, refresh_token: data.refresh_token, expires_at: expiresAt, updated_at: new Date().toISOString() })
      .eq("id", tokenRow.id);

    return data.access_token;
  }

  return tokenRow.access_token;
}

async function meRequest(token: string, path: string, method = "POST", body?: any) {
  const opts: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": USER_AGENT,
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const resp = await fetch(`${ME_API}${path}`, opts);
  const data = await resp.json();
  if (!resp.ok) {
    console.error(`ME API error [${path}]:`, resp.status, JSON.stringify(data));
    throw new Error(JSON.stringify(data));
  }
  return data;
}

function normalizeDocumentFields(person?: { document?: string; company_document?: string }) {
  const rawDocument = (person?.document || "").replace(/\D/g, "");
  const rawCompanyDocument = (person?.company_document || "").replace(/\D/g, "");

  const document = rawDocument.length === 11
    ? rawDocument
    : rawCompanyDocument.length === 11
      ? rawCompanyDocument
      : "";

  const company_document = rawCompanyDocument.length === 14
    ? rawCompanyDocument
    : rawDocument.length === 14
      ? rawDocument
      : "";

  return {
    document,
    company_document,
  };
}

function dedupeDocuments(fromDocs: { document: string; company_document: string }, toDocs: { document: string; company_document: string }) {
  return {
    from: fromDocs,
    to: {
      document: toDocs.document === fromDocs.document ? "" : toDocs.document,
      company_document: toDocs.company_document === fromDocs.company_document ? "" : toDocs.company_document,
    },
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const token = await getToken();
    if (!token) {
      return new Response(JSON.stringify({ error: "Token Melhor Envio não configurado" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { order_id, service_id, from, to, products, invoice } = await req.json();

    if (!order_id || !service_id || !from || !to || !products) {
      return new Response(JSON.stringify({ error: "Dados incompletos. Necessário: order_id, service_id, from, to, products" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedFrom = normalizeDocumentFields(from);
    const normalizedTo = normalizeDocumentFields(to);
    const dedupedDocuments = dedupeDocuments(normalizedFrom, normalizedTo);

    // Step 1: Add to cart
    const cartPayload = {
      service: service_id,
      agency: null,
      from: {
        name: from.name,
        phone: from.phone,
        email: from.email,
        document: dedupedDocuments.from.document,
        company_document: dedupedDocuments.from.company_document,
        state_register: from.state_register || "",
        address: from.address,
        complement: from.complement || "",
        number: from.number,
        district: from.district,
        city: from.city,
        country_id: "BR",
        postal_code: from.postal_code,
        note: "",
      },
      to: {
        name: to.name,
        phone: to.phone || "",
        email: to.email || "",
        document: dedupedDocuments.to.document,
        company_document: dedupedDocuments.to.company_document,
        state_register: to.state_register || "",
        address: to.address,
        complement: to.complement || "",
        number: to.number || "S/N",
        district: to.district || "",
        city: to.city,
        state_abbr: to.state_abbr || "",
        country_id: "BR",
        postal_code: to.postal_code,
        note: "",
      },
      products: products.map((p: any, i: number) => ({
        name: p.name || `Produto ${i + 1}`,
        quantity: p.quantity || 1,
        unitary_value: p.unitary_value || 1,
      })),
      volumes: [
        {
          height: products[0]?.height || 2,
          width: products[0]?.width || 11,
          length: products[0]?.length || 16,
          weight: products[0]?.weight || 0.3,
        },
      ],
      options: {
        insurance_value: products.reduce((sum: number, p: any) => sum + (p.unitary_value || 1) * (p.quantity || 1), 0),
        receipt: false,
        own_hand: false,
        reverse: false,
        non_commercial: false,
        ...(invoice ? { invoice: { key: invoice.key } } : {}),
      },
    };

    console.log("Adding to cart...");
    const cartResult = await meRequest(token, "/cart", "POST", cartPayload);
    const shipmentId = cartResult.id;
    if (!shipmentId) {
      return new Response(JSON.stringify({ error: "Falha ao adicionar ao carrinho ME", details: cartResult }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Shipment added to Melhor Envio cart:", shipmentId);

    // Save shipment_id to order for reference
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    await supabase
      .from("orders")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", order_id);

    return new Response(
      JSON.stringify({
        success: true,
        shipment_id: shipmentId,
        message: "Pedido adicionado ao carrinho do Melhor Envio. Acesse o painel do Melhor Envio para realizar o pagamento e gerar a etiqueta.",
        melhor_envio_url: "https://melhorenvio.com.br/painel/carrinho",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Shipping label error:", err);
    const msg = err instanceof Error ? err.message : "Erro interno";
    return new Response(JSON.stringify({ error: "Erro ao gerar etiqueta", details: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
