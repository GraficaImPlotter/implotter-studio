import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";

// Obtém a URL base (Se não tiver configurada nas secrets, usa a Sandbox padrão)
const ASAAS_API_URL = Deno.env.get("ASAAS_API_URL") || "https://sandbox.asaas.com/api/v3";

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    const { orderId } = await req.json();

    if (!orderId) {
      return new Response(JSON.stringify({ error: "Dados inválidos: orderId é obrigatório" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ASAAS_API_KEY = Deno.env.get("ASAAS_API_KEY")!;

    if (!ASAAS_API_KEY) {
      return new Response(JSON.stringify({ error: "Chave API do Asaas não configurada" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: "Pedido não encontrado" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prepare Asaas Headers
    const asaasHeaders = {
      "Content-Type": "application/json",
      "access_token": ASAAS_API_KEY,
    };

    // 1. Check if Customer exists or Create a new Customer in Asaas
    let customerId = "";
    if (order.customer_cpf_cnpj) {
      const searchRes = await fetch(`${ASAAS_API_URL}/customers?cpfCnpj=${order.customer_cpf_cnpj}`, { headers: asaasHeaders });
      const searchData = await searchRes.json();
      if (searchData.data && searchData.data.length > 0) {
        customerId = searchData.data[0].id;
      }
    }

    if (!customerId) {
      // Create Customer
      const customerPayload = {
        name: order.customer_name,
        email: order.customer_email,
        cpfCnpj: order.customer_cpf_cnpj || "00000000000",
        phone: order.customer_phone || "",
        mobilePhone: order.customer_phone || "",
        address: order.address_street || "",
        addressNumber: order.address_number || "",
        complement: order.address_complement || "",
        province: order.address_neighborhood || "",
        postalCode: order.address_zip ? order.address_zip.replace(/\D/g, "") : "",
        externalReference: order.customer_id || undefined
      };

      const createCustomerRes = await fetch(`${ASAAS_API_URL}/customers`, {
        method: "POST",
        headers: asaasHeaders,
        body: JSON.stringify(customerPayload)
      });
      const customerData = await createCustomerRes.json();
      
      if (customerData.errors) {
        return new Response(JSON.stringify({ error: "Erro ao criar cliente no Asaas para o PIX", details: customerData.errors }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      customerId = customerData.id;
    }

    // 2. Create PIX Payment
    const today = new Date();
    // Default due date: tomorrow for unpaid PIX expiration buffer
    today.setDate(today.getDate() + 1);
    const dueDate = today.toISOString().split("T")[0];

    const paymentPayload = {
      customer: customerId,
      billingType: "PIX",
      value: Number(order.total),
      dueDate: dueDate,
      description: `Pedido #${order.order_number}`,
      externalReference: order.id,
    };

    const createPaymentRes = await fetch(`${ASAAS_API_URL}/payments`, {
      method: "POST",
      headers: asaasHeaders,
      body: JSON.stringify(paymentPayload)
    });
    const paymentData = await createPaymentRes.json();

    if (paymentData.errors) {
      return new Response(JSON.stringify({ error: "Erro ao processar cobrança via PIX", details: paymentData.errors }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Fetch PIX QR Code payload and image
    const pixRes = await fetch(`${ASAAS_API_URL}/payments/${paymentData.id}/pixQrCode`, {
        headers: asaasHeaders
    });
    const pixData = await pixRes.json();

    if (pixData.errors) {
      return new Response(JSON.stringify({ error: "Erro ao gerar chave PIX", details: pixData.errors }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        pixCode: pixData.payload,
        encodedImage: pixData.encodedImage,
        expirationDate: pixData.expirationDate,
        amount: Number(order.total),
        orderNumber: order.order_number,
        status: order.status,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
